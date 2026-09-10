(() => {
  const $ = (id) => document.getElementById(id);
  const uploads = [];
  const selected = new Set();
  let pollTimer = null;
  let lastSig = "";
  let authed = false;

  function token() {
    const t = $("token").value.trim();
    if (t) localStorage.setItem("intake_console_token", t);
    return t || localStorage.getItem("intake_console_token") || "";
  }

  function setStatus(msg) {
    $("status").textContent = msg || "";
  }

  function setAuthUI(ok, detail) {
    authed = !!ok;
    $("auth-banner").classList.toggle("hidden", ok);
    const hint = $("auth-hint");
    hint.textContent = detail || (ok ? "доступ есть · лента обновляется" : "");
    hint.classList.toggle("bad", !ok);
    $("live").classList.toggle("off", !ok);
    $("live").textContent = ok ? "● live" : "● нет доступа";
  }

  function enteredLen() {
    return ($("token").value || "").trim().length;
  }

  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(path, Object.assign({}, opts, { headers }));
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(text || res.statusText);
      err.status = res.status;
      throw err;
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  }

  function updateSelCount() {
    $("sel-count").textContent = "Выбрано: " + selected.size;
  }

  function renderThread(items) {
    const ol = $("thread");
    const stickBottom = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 80;
    ol.innerHTML = "";
    (items || []).forEach((item) => {
      const li = document.createElement("li");
      const dir = item.direction || "in";
      li.className = "msg " + dir;
      if (selected.has(item.id)) li.classList.add("selected");
      const pick = document.createElement("input");
      pick.type = "checkbox";
      pick.className = "pick";
      pick.checked = selected.has(item.id);
      pick.onchange = () => {
        if (pick.checked) selected.add(item.id);
        else selected.delete(item.id);
        li.classList.toggle("selected", pick.checked);
        updateSelCount();
      };
      const body = document.createElement("div");
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = [
        item.at || "",
        item.from_user || "",
        dir,
        item.kind || "",
        item.message_id ? "#" + item.message_id : "",
      ].filter(Boolean).join(" · ");
      const pre = document.createElement("pre");
      pre.textContent = item.text || "";
      body.appendChild(meta);
      body.appendChild(pre);
      if (item.attachments && item.attachments.length) {
        const att = document.createElement("div");
        att.className = "meta";
        att.textContent = "вложения: " + item.attachments.map((a) => a.name || a.id).join(", ");
        body.appendChild(att);
      }
      li.appendChild(pick);
      li.appendChild(body);
      ol.appendChild(li);
    });
    updateSelCount();
    if (stickBottom) ol.scrollTop = ol.scrollHeight;
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
      const ask = document.createElement("button");
      ask.type = "button";
      ask.className = "quiet";
      ask.textContent = "Спросить у агента";
      ask.onclick = () => startAgent("ask_agent", [], c.proposal || c.summary || "");
      actions.appendChild(ask);
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
        api("/api/thread?limit=200"),
        api("/api/cards"),
      ]);
      const sig = JSON.stringify((thread.items || []).map((m) => m.id));
      if (sig !== lastSig) {
        lastSig = sig;
        renderThread(thread.items || []);
      }
      renderCards(cards.items || []);
      setAuthUI(true, "live · " + ((thread.items || []).length) + " сообщ.");
      setStatus("обновлено");
    } catch (e) {
      if (e.status === 401) {
        const n = enteredLen();
        const tip = n === 0
          ? "токен пустой — вставь INTAKE_CONSOLE_TOKEN"
          : "не совпал (длина " + n + "). Нужен INTAKE_CONSOLE_TOKEN из ~/.vdp-intake/env, не токен бота";
        setAuthUI(false, tip);
        setStatus("unauthorized");
        return;
      }
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

  async function savePrompt(cardId, text, mode) {
    try {
      const res = await api("/api/to-cursor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId || "", text: text || $("text").value, mode: mode || "prompt" }),
      });
      setStatus("промпт сохранён: " + (res.path || ""));
    } catch (e) {
      setStatus(String(e.message || e));
    }
  }

  async function startAgent(mode, ids, extra) {
    const resultEl = $("agent-result");
    resultEl.hidden = false;
    resultEl.textContent = "Запрос…";
    setStatus("агент: " + mode);
    try {
      const job = await api("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          message_ids: ids,
          prompt: extra || $("agent-prompt").value || "",
        }),
      });
      await waitJob(job.id);
    } catch (e) {
      resultEl.textContent = String(e.message || e);
      setStatus(String(e.message || e));
    }
  }

  async function waitJob(id) {
    const resultEl = $("agent-result");
    for (let i = 0; i < 180; i++) {
      const job = await api("/api/agent/" + encodeURIComponent(id));
      if (job.status === "done" || job.status === "error") {
        resultEl.textContent = job.result || job.error || job.status;
        setStatus(job.status === "done" ? "ответ готов" : "ошибка агента");
        await refresh();
        return;
      }
      resultEl.textContent = "Статус: " + job.status + "…";
      await new Promise((r) => setTimeout(r, 1000));
    }
    resultEl.textContent = "Таймаут ожидания ответа";
  }

  function startPoll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (token()) refresh();
    }, 2000);
  }

  $("token").value = localStorage.getItem("intake_console_token") || "";
  $("save-token").onclick = () => {
    const t = token();
    if (!t) {
      setAuthUI(false, "токен пустой — вставь INTAKE_CONSOLE_TOKEN");
      return;
    }
    setStatus("проверка…");
    refresh();
    startPoll();
  };
  $("toggle-token").onclick = () => {
    const inp = $("token");
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    $("toggle-token").textContent = show ? "Скрыть" : "Показать";
  };
  $("clear-token").onclick = () => {
    localStorage.removeItem("intake_console_token");
    $("token").value = "";
    setAuthUI(false, "сохранённый токен сброшен");
    setStatus("");
  };
  $("refresh").onclick = () => refresh();
  $("save-prompt").onclick = () => savePrompt("", $("text").value, "prompt");
  $("select-all").onclick = () => {
    $("thread").querySelectorAll(".msg").forEach((li) => {
      const cb = li.querySelector(".pick");
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event("change"));
      }
    });
  };
  $("select-none").onclick = () => {
    selected.clear();
    $("thread").querySelectorAll(".pick").forEach((cb) => {
      cb.checked = false;
    });
    $("thread").querySelectorAll(".msg").forEach((li) => li.classList.remove("selected"));
    updateSelCount();
  };
  $("analyze-sel").onclick = () => {
    if (selected.size === 0) {
      setStatus("сначала выберите сообщения");
      return;
    }
    startAgent("analyze_selected", Array.from(selected), "");
  };
  $("analyze-chat").onclick = () => startAgent("analyze_chat", [], "");
  $("ask-agent").onclick = () => {
    const ids = selected.size ? Array.from(selected) : [];
    startAgent("ask_agent", ids, $("agent-prompt").value);
  };

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

  if (!token()) {
    setAuthUI(false, "вставьте токен из env-файла");
  } else {
    refresh();
    startPoll();
  }
})();
