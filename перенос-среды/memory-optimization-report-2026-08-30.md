# Отчёт об оптимизации памяти

**Дата:** 2026-08-30 22:18  
**Машина:** MacBook Pro, Intel i7-8850H, 16 GB RAM

---

## 1. Docker — лимит 3.5 GB

| Параметр | Было | Стало |
|---|---|---|
| MemoryMiB | 8192 (8 GB) | **3584 (3.5 GB)** |
| SwapMiB | 1024 | **512** |
| CPUs | 12 | **4** |
| AutoStart | false | false |
| Resource Saver | — | **включён** (пауза через 30 сек) |
| Docker AI | true | **false** |
| Kubernetes | — | **false** |

**Проверка:** `docker info` → `Total Memory: 3.328GiB`, `CPUs: 4`

**Бэкап настроек:**  
`~/Library/Group Containers/group.com.docker/settings-store.json.bak-20260830-221745`

---

## 2. Неиспользуемые 5+ дней — отключено

### Автозапуск
| Действие | Причина |
|---|---|
| **FigmaAgent** удалён из Login Items | Figma не использовалась с 2026-08-25 |

### Закрыты процессы (неактивны 5+ дней)
Figma, Arc, Atom, Loom, Rive, TheiaIDE, dyad, v2RayTun

### Список приложений без активности 5+ дней (не трогали установку)
AppCleaner, Arc, Atom, Figma, ForkLift, Kap, Keynote Creator Studio, Loom, Numbers Creator Studio, Pages Creator Studio, Rive, The Unarchiver, TheiaIDE, dyad, v2RayTun

---

## 3. Минимизация остального

### Docker Desktop
- Resource Saver: VM засыпает при простое
- Kubernetes отключён
- Docker AI отключён
- CPU снижен с 12 до 4

### Docker Compose (`backend-for-ved`)
Добавлены лимиты контейнеров (сумма ~1.3 GB):

| Сервис | Лимит |
|---|---|
| mongodb | 768 MB |
| gotenberg | 384 MB |
| redis | 128 MB |
| nats | 64 MB |

> Чтобы применить лимиты контейнеров: `docker compose down && docker compose up -d` в каталоге compose-файла.

### Оставлено без изменений (использовались за 5 дней)
Cursor, Docker, Yandex, GitHub Desktop, Telegram, Safari, Lovable, Happ

---

## 4. Состояние памяти после оптимизации

| Показатель | Значение |
|---|---|
| Свободно (memory_pressure) | **67%** |
| Docker VM лимит | **3.3 GB** |
| Сумма RSS процессов | ~14.3 GB |

| Группа | RSS |
|---|---|
| macOS System | 7.3 GB |
| Yandex Browser | 2.5 GB |
| Docker / VM | 1.8 GB |
| Cursor IDE | 1.8 GB |
| GitHub Desktop | 0.2 GB |
| Figma (остаток) | 0.01 GB |

---

## 5. Что ещё можно сделать вручную

1. **Yandex Browser** (~2.5 GB) — закрыть тяжёлые вкладки через `Shift+Esc`
2. **GitHub Desktop** — закрыть, если не нужен прямо сейчас (~200 MB)
3. **Перезапустить compose-стек** — чтобы применились лимиты контейнеров
4. **Удалить неиспользуемые приложения** из `/Applications` — по желанию (15 шт. без активности 5+ дней)

---

## 6. Откат Docker-настроек

```bash
cp ~/Library/Group\ Containers/group.com.docker/settings-store.json.bak-20260830-221745 \
   ~/Library/Group\ Containers/group.com.docker/settings-store.json
docker desktop restart
```
