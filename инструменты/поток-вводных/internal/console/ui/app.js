(() => {
  const $ = (id) => document.getElementById(id);
  const uploads = [];

  function token() {
    const t = $("token").value.trim();
    if (t) localStorage.setItem("intake_console_token", t);
    return t || localStorage.getItem("intake_console_token") || "";
  }

  function setStatus(msg) {
    $("status").textContent = msg || "";
  }

  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(path, Object.assign({}, opts, { headers }));
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  }

  function renderThread(items) {
    const ol = $("thread");
    ol.innerHTML = "";
    (items || []).slice().reverse().forEach((item) => {
      const li = document.createElement("li");
      li.className = "msg";
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = [
        item.received_at || "",
        item.source || "",
        item.kind || "",
        item.from_username || "",
        item.message_id ? "msg " + item.message_id : "",
      ].filter(Boolean).join(" · ");
      const pre = document.createElement("pre");
      pre.textContent = item.text || "";
      li.appendChild(meta);
      li.appendChild(pre);
      if (item.attachments && item.attachments.length) {
        const att = document.createElement("div");
        att.className = "meta";
        att.textContent = "вложения: " + item.attachments.map((a) => a.name || a.id).join(", ");
        li.appendChild(att);
      }
      ol.appendChild(li);
    });
  }

  function renderCards(items) {
    const ul = $("cards");
    ul.innerHTML = "";
    (items || []).forEach((c) => {
      const li = document.createElement("li");
      li.className = "card";
      li.innerHTML = `<strong>${escapeHtml(c.status)}</strong> · ${escapeHtml(c.id)}<div>${escapeHtml(c.summary || c.proposal || "")}</div>`;
      const actions = document.createElement("div");
      actions.className = "actions";
      if (c.status === "awaiting_approve") {
        const yes = document.createElement("button");
        yes.type = "button";
        yes.textContent = "Согласовать";
        yes.onclick = () => hitl(c.id, true);
        const no = document.createElement("button");
        no.type = "button";
        no.className = "danger";
        no.textContent = "Отклонить";
        no.onclick = () => hitl(c.id, false);
        actions.appendChild(yes);
        actions.appendChild(no);
      }
      const cur = document.createElement("button");
      cur.type = "button";
      cur.className = "quiet";
      cur.textContent = "В Cursor";
      cur.onclick = () => toCursor(c.id, c.proposal || c.summary || "", "prompt");
      actions.appendChild(cur);
      li.appendChild(actions);
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function refresh() {
    try {
      const [thread, cards] = await Promise.all([
        api("/api/thread?limit=80"),
        api("/api/cards"),
      ]);
      renderThread(thread.items || []);
      renderCards(cards.items || []);
      setStatus("обновлено");
    } catch (e) {
      setStatus(String(e.message || e));
    }
  }

  async function hitl(cardId, approve) {
    try {
      await api("/api/hitl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId, approve, mirror_to_tg: true }),
      });
      await refresh();
    } catch (e) {
      setStatus(String(e.message || e));
    }
  }

  async function toCursor(cardId, text, mode) {
    try {
      const res = await api("/api/to-cursor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId || "", text: text || $("text").value, mode: mode || "prompt" }),
      });
      setStatus("записано: " + (res.path || ""));
    } catch (e) {
      setStatus(String(e.message || e));
    }
  }

  $("token").value = localStorage.getItem("intake_console_token") || "";
  $("refresh").onclick = () => refresh();
  $("to-cursor").onclick = () => toCursor("", $("text").value, "prompt");

  $("file").onchange = async () => {
    const files = Array.from($("file").files || []);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const att = await api("/api/upload", { method: "POST", body: fd });
        uploads.push(att);
        const li = document.createElement("li");
        li.textContent = (att.name || att.id) + " · " + (att.mime || "");
        $("uploads").appendChild(li);
      } catch (e) {
        setStatus(String(e.message || e));
      }
    }
    $("file").value = "";
  };

  $("composer").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: $("text").value,
          as_intake: $("as_intake").checked,
          mirror_to_tg: $("mirror").checked,
          attachment_ids: uploads.map((u) => u.id),
        }),
      });
      $("text").value = "";
      uploads.length = 0;
      $("uploads").innerHTML = "";
      await refresh();
      setStatus("отправлено");
    } catch (err) {
      setStatus(String(err.message || err));
    }
  };

  $("del-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api("/api/tg/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: Number(fd.get("message_id")),
          chat_id: Number(fd.get("chat_id") || 0),
        }),
      });
      setStatus("удалено в Telegram");
    } catch (err) {
      setStatus(String(err.message || err));
    }
  };

  $("mgmt-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await api("/api/mgmt/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          body: fd.get("body"),
          next: fd.get("next"),
        }),
      });
      setStatus("mgmt msg " + (res.tg_message_id || ""));
      await refresh();
    } catch (err) {
      setStatus(String(err.message || err));
    }
  };

  if (token()) refresh();
})();
