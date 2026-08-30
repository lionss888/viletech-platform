import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ВЭД — операционный контур платежей" },
      {
        name: "description",
        content:
          "Управление внешнеэкономическими сделками, документами и платежами в одном контуре: заявки, проверки, договоры, поручения и отгрузка.",
      },
      { property: "og:title", content: "ВЭД — операционный контур платежей" },
      { property: "og:description", content: "Управление сделками, документами и платежами." },
    ],
  }),
  component: HomePage,
});

const HIGHLIGHTS = [
  { title: "Сделки", text: "Заявки на платёж по внешнеэкономическим сделкам от создания до закрытия." },
  { title: "Документы", text: "Инвойсы, договоры, поручения и отчёты хранятся в карточке сделки." },
  { title: "Платежи", text: "Прозрачный статус платежа, исполнение и подтверждение отгрузки." },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">
              V
            </span>
            <span className="text-sm font-semibold tracking-tight">ВЭД от Вилетех</span>
          </span>
          <Link
            to="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Войти
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 lg:py-24">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight lg:text-5xl">
          ВЭД — операционный контур платежей
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          Управление сделками, документами и платежами.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/login"
            className="flex-1 rounded-md bg-primary px-5 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Войти в платформу
          </Link>
          <Link
            to="/start"
            className="flex-1 rounded-md px-5 py-2.5 text-center text-sm font-semibold shadow-[0_0_0_1px_var(--input)] transition-colors hover:bg-muted"
          >
            Быстрый вход по роли
          </Link>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <section key={item.title} className="panel p-5">
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
