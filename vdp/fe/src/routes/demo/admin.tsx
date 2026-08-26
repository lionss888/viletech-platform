import { createFileRoute } from "@tanstack/react-router";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { dateOnly } from "@/lib/ved/format";
import { roleTitle, ROLES } from "@/lib/ved/roles";
import { useVed } from "@/lib/ved/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo/admin")({
  head: () => ({
    meta: [
      { title: "Пользователи и роли — Viletech ВЭД" },
      { name: "description", content: "Кабинет суперадмина: пользователи платформы ВЭД, их роли, организации и блокировка доступа." },
      { property: "og:title", content: "Пользователи и роли — Viletech ВЭД" },
      { property: "og:description", content: "Роли, организации и блокировка доступа пользователей платформы." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { users, toggleBlocked, session } = useVed();

  if (session?.role !== "root") {
    return (
      <DemoAppShell title="Доступ ограничен">
        <div className="panel p-6 text-sm text-muted-foreground">
          Раздел доступен только роли «Суперадмин». Переключите роль в сайдбаре.
        </div>
      </DemoAppShell>
    );
  }

  return (
    <DemoAppShell title="Пользователи и роли" subtitle={`Всего аккаунтов: ${users.length}`}>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {ROLES.map((role) => (
          <div key={role.id} className="panel p-3">
            <p className="label-caps">{role.title}</p>
            <p className="mt-1 font-mono text-xl font-semibold">{users.filter((u) => u.role === role.id).length}</p>
          </div>
        ))}
      </div>

      <div className="panel mt-4 overflow-x-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="label-caps py-2 pr-4">Пользователь</th>
              <th className="label-caps py-2 pr-4">Email</th>
              <th className="label-caps py-2 pr-4">Роль</th>
              <th className="label-caps py-2 pr-4">Организация</th>
              <th className="label-caps py-2 pr-4">Создан</th>
              <th className="label-caps py-2 pr-4 text-right">Доступ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="py-2 pr-4 font-medium">{u.name}</td>
                <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                <td className="py-2 pr-4 text-xs">{roleTitle(u.role)}</td>
                <td className="py-2 pr-4 text-xs text-muted-foreground">{u.organization ?? "—"}</td>
                <td className="py-2 pr-4 font-mono text-[11px] text-muted-foreground">{dateOnly(u.createdAt)}</td>
                <td className="py-2 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleBlocked(u.id)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-semibold",
                      u.blocked ? "bg-return-soft text-return" : "bg-done-soft text-done",
                    )}
                  >
                    {u.blocked ? "Заблокирован" : "Активен"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DemoAppShell>
  );
}
