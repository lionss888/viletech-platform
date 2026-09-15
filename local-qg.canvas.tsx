import React from 'react';

export default function LocalQualityGate() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
            VDP Local Quality Gate
          </h1>
          <p className="text-slate-300 text-lg">
            Локальная страховка CI перед push/PR · Соответствие{' '}
            <code className="text-cyan-400">.cursor/rules/vdp-ci-local-gate.mdc</code>
          </p>
        </header>

        {/* Quick Actions */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-cyan-400">🚀 Quick Gates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <GateButton
              title="PR Gate (smoke)"
              command="cd vdp && make ci-pr"
              description="Узкий Playwright (4 spec). Не равен GitHub pilot-matrix."
              color="from-green-500 to-emerald-600"
              emoji="✅"
            />
            <GateButton
              title="PR Gate (Pilot)"
              command="cd vdp && make ci-pr-pilot"
              description="ci-pr + @pilot-matrix. Когда изменены e2e / лестница / ActionPanel."
              color="from-teal-500 to-emerald-700"
              emoji="🪜"
            />
            <GateButton
              title="PR Gate (Fast)"
              command="cd vdp && make ci-pr-fast"
              description="Без browser E2E (быстрее)"
              color="from-blue-500 to-cyan-600"
              emoji="⚡"
            />
            <GateButton
              title="Release Gate"
              command="cd vdp && make release-gate"
              description="Полный контур + pilot matrix"
              color="from-purple-500 to-pink-600"
              emoji="🎯"
            />
            <GateButton
              title="Precommit"
              command="cd vdp && make precommit-gate"
              description="Docs format + Unit + TG gate"
              color="from-yellow-500 to-orange-600"
              emoji="📝"
            />
            <GateButton
              title="Check Deploy Secrets"
              command="cd vdp && make check-deploy-secrets"
              description="Проверка MGMT_NOTIFY_TOKEN/CHAT_ID"
              color="from-red-500 to-rose-600"
              emoji="🔐"
            />
            <GateButton
              title="Docs Format"
              command="cd vdp && make docs-format-check"
              description="Только форматирование документации"
              color="from-indigo-500 to-blue-600"
              emoji="📄"
            />
          </div>
        </section>

        {/* Deploy Secrets Check */}
        <section className="bg-red-900/20 backdrop-blur-sm rounded-2xl p-6 border border-red-700 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-red-400">⚠️ Deploy Secrets Required</h2>
          <div className="space-y-4 text-slate-200">
            <p className="font-semibold">
              Deploy workflows требуют <code className="text-cyan-400">MGMT_NOTIFY_TOKEN</code> +{' '}
              <code className="text-cyan-400">MGMT_NOTIFY_CHAT_ID</code>
            </p>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-mono text-green-400"># Локальная настройка (выбери один):</p>
              <p className="font-mono">echo "MGMT_NOTIFY_TOKEN=your_bot_token" &gt;&gt; ~/.vedy_bot/env</p>
              <p className="font-mono">echo "MGMT_NOTIFY_CHAT_ID=your_chat_id" &gt;&gt; ~/.vedy_bot/env</p>
              <p className="font-mono text-slate-400"># или через ~/.vdp-intake/env</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-mono text-blue-400"># GitHub Secrets (для CI):</p>
              <p>Repository Settings → Secrets → Actions → New secret:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  <code className="text-cyan-400">MGMT_NOTIFY_TOKEN</code>: ваш bot token
                </li>
                <li>
                  <code className="text-cyan-400">MGMT_NOTIFY_CHAT_ID</code>: ваш chat id
                </li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-mono text-purple-400"># GitLab CI Variables (для CI):</p>
              <p>Project Settings → CI/CD → Variables → Add variable:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  <code className="text-cyan-400">MGMT_NOTIFY_TOKEN</code>: bot token (Protected: yes)
                </li>
                <li>
                  <code className="text-cyan-400">MGMT_NOTIFY_CHAT_ID</code>: chat id (Protected: yes)
                </li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-mono text-yellow-400"># Получить токен и chat_id:</p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>
                  Создать бота: <a href="https://t.me/BotFather" className="text-cyan-400 underline">@BotFather</a> →{' '}
                  <code>/newbot</code>
                </li>
                <li>Скопировать токен из ответа</li>
                <li>Отправить сообщение боту (любое)</li>
                <li>
                  Получить chat_id:{' '}
                  <code className="text-green-400">
                    curl https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                  </code>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Test Commands */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-purple-400">🧪 Test Commands</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TestButton title="Unit Tests" command="cd vdp && make test" emoji="🔬" />
            <TestButton title="Adapters Tests" command="cd vdp && make test-adapters" emoji="🔌" />
            <TestButton title="Integration Tests" command="cd vdp && make test-integration" emoji="🔗" />
            <TestButton title="FE Tests" command="cd vdp/fe && npm test" emoji="⚛️" />
            <TestButton title="CD Scripts" command="cd vdp && make test-cd-scripts" emoji="📦" />
            <TestButton title="Robot Matrix" command="cd vdp && make robot-matrix-check" emoji="🤖" />
          </div>
        </section>

        {/* Compose Commands */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-cyan-400">🐳 Docker Compose</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ComposeButton title="Up" command="cd vdp && make compose-up" emoji="🚀" color="green" />
            <ComposeButton title="Down" command="cd vdp && make compose-down" emoji="🛑" color="red" />
            <ComposeButton
              title="Refresh FE Deps"
              command="cd vdp && make compose-fe-refresh"
              emoji="🔄"
              color="blue"
            />
            <ComposeButton title="E2E" command="cd vdp && ./scripts/compose-e2e.sh" emoji="🧪" color="purple" />
            <ComposeButton title="Status" command="cd vdp && docker compose ps" emoji="📊" color="yellow" />
            <ComposeButton title="Logs" command="cd vdp && docker compose logs -f" emoji="📜" color="indigo" />
          </div>
        </section>

        {/* Rules Reference */}
        <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">📋 Rules Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <RuleLink
              title="vdp-ci-local-gate"
              path=".cursor/rules/vdp-ci-local-gate.mdc"
              description="Локальная страховка CI"
            />
            <RuleLink
              title="mgmt-tg-notify"
              path=".cursor/rules/mgmt-tg-notify.mdc"
              description="Management TG уведомления"
            />
            <RuleLink
              title="vdp-fe-docker-пересборка"
              path=".cursor/rules/vdp-fe-docker-пересборка.mdc"
              description="FE Docker deps refresh"
            />
            <RuleLink title="честность-готовности" path=".cursor/rules/честность-готовности.mdc" description="DoD" />
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-slate-400 text-sm pt-8">
          <p>
            💡 Промпт для запуска:{' '}
            <code className="text-cyan-400 bg-slate-800 px-2 py-1 rounded">@local-qg.canvas.tsx Local QG RUN</code>
          </p>
          <p className="mt-2">Shell: без sandbox · FE Docker: спрашивай · CI must: check-deploy-secrets</p>
        </footer>
      </div>
    </div>
  );
}

// Helper Components
interface GateButtonProps {
  title: string;
  command: string;
  description: string;
  color: string;
  emoji: string;
}

function GateButton({ title, command, description, color, emoji }: GateButtonProps) {
  return (
    <div className="group relative bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-slate-500 transition-all hover:scale-105 cursor-pointer">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`}></div>
      <div className="relative space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <h3 className="font-bold text-lg">{title}</h3>
        </div>
        <p className="text-slate-400 text-sm">{description}</p>
        <code className="block text-xs text-slate-300 bg-slate-900/50 p-2 rounded mt-2 font-mono break-all">
          {command}
        </code>
      </div>
    </div>
  );
}

interface TestButtonProps {
  title: string;
  command: string;
  emoji: string;
}

function TestButton({ title, command, emoji }: TestButtonProps) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 hover:border-purple-500 transition-all cursor-pointer">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{emoji}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <code className="text-xs text-slate-300 font-mono">{command}</code>
    </div>
  );
}

interface ComposeButtonProps {
  title: string;
  command: string;
  emoji: string;
  color: string;
}

function ComposeButton({ title, command, emoji, color }: ComposeButtonProps) {
  const colorMap: Record<string, string> = {
    green: 'hover:border-green-500',
    red: 'hover:border-red-500',
    blue: 'hover:border-blue-500',
    purple: 'hover:border-purple-500',
    yellow: 'hover:border-yellow-500',
    indigo: 'hover:border-indigo-500',
  };

  return (
    <div
      className={`bg-slate-700/50 rounded-lg p-3 border border-slate-600 ${colorMap[color]} transition-all cursor-pointer`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{emoji}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <code className="text-xs text-slate-300 font-mono">{command}</code>
    </div>
  );
}

interface RuleLinkProps {
  title: string;
  path: string;
  description: string;
}

function RuleLink({ title, path, description }: RuleLinkProps) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 hover:border-yellow-500 transition-all">
      <h3 className="font-semibold text-cyan-400 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 mb-2">{description}</p>
      <code className="text-xs text-slate-300 font-mono">{path}</code>
    </div>
  );
}
