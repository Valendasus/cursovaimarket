#!/usr/bin/env bash
# Запуск всего проекта для локальной разработки: база (Docker) + backend + frontend.
#
#   ./dev.sh           — поднять всё (Ctrl+C останавливает backend и frontend)
#   ./dev.sh --seed    — то же, но перед стартом заполнить базу демо-данными
#   ./dev.sh --stop    — остановить контейнер с базой
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "$ROOT/backend/docker-compose.yml")

BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'
BLUE=$'\033[34m'; MAGENTA=$'\033[35m'; RESET=$'\033[0m'

step() { printf '%s▸ %s%s\n' "$BOLD" "$1" "$RESET"; }
warn() { printf '%s! %s%s\n' "$YELLOW" "$1" "$RESET"; }
fail() { printf '%s✗ %s%s\n' "$RED" "$1" "$RESET" >&2; exit 1; }

SEED=false
case "${1:-}" in
	'') ;;
	--seed) SEED=true ;;
	--stop) "${COMPOSE[@]}" stop; exit 0 ;;
	-h|--help) sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
	*) fail "Неизвестный аргумент: $1 (см. ./dev.sh --help)" ;;
esac

# ── Проверка окружения ───────────────────────────────────────────────────────
command -v node >/dev/null || fail "Не найден Node.js. Нужна версия 20 или новее: https://nodejs.org"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || fail "Нужен Node.js 20+, сейчас $(node -v)"
command -v docker >/dev/null || fail "Не найден Docker: https://www.docker.com/products/docker-desktop"
docker info >/dev/null 2>&1 || fail "Docker не запущен. Откройте Docker Desktop и повторите."

for port in 3000 5173; do
	if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
		fail "Порт $port уже занят. Остановите процесс: lsof -iTCP:$port -sTCP:LISTEN"
	fi
done

# ── .env и зависимости ───────────────────────────────────────────────────────
for app in backend frontend; do
	if [ ! -f "$ROOT/$app/.env" ]; then
		cp "$ROOT/$app/.env.example" "$ROOT/$app/.env"
		warn "Создан $app/.env из .env.example — при необходимости поправьте значения."
	fi
	# Ставим пакеты, если их нет или package-lock.json изменился после установки.
	if [ ! -d "$ROOT/$app/node_modules" ] ||
		[ "$ROOT/$app/package-lock.json" -nt "$ROOT/$app/node_modules/.package-lock.json" ]; then
		step "Установка зависимостей: $app"
		(cd "$ROOT/$app" && npm install --no-audit --no-fund)
	fi
done

# ── База данных ──────────────────────────────────────────────────────────────
step "Запуск PostgreSQL в Docker"
"${COMPOSE[@]}" up -d --wait postgres

step "Миграции базы данных"
(cd "$ROOT/backend" && npx prisma migrate deploy && npx prisma generate >/dev/null)

if $SEED; then
	step "Заполнение демо-данными"
	(cd "$ROOT/backend" && npm run prisma:seed)
fi

# ── Backend + frontend ───────────────────────────────────────────────────────
# Ctrl+C или падение одного из процессов останавливает оба.
cleanup() {
	trap - INT TERM EXIT
	printf '\n%s▸ Останавливаю backend и frontend…%s\n' "$BOLD" "$RESET"
	kill 0 2>/dev/null || true
}
trap cleanup INT TERM EXIT

prefix() { awk -v p="$1" '{ print p $0; fflush() }'; }

(cd "$ROOT/backend" && npm run start:dev 2>&1) | prefix "${BLUE}[back]${RESET}  " &
BACK_PID=$!
(cd "$ROOT/frontend" && npm run dev 2>&1) | prefix "${MAGENTA}[front]${RESET} " &
FRONT_PID=$!

cat <<EOF

${GREEN}${BOLD}Проект запускается:${RESET}
  Сайт:     http://localhost:5173
  API:      http://localhost:3000/api
  Swagger:  http://localhost:3000/api/docs
  Ctrl+C — остановить (база продолжит работать, ./dev.sh --stop — выключить её)

EOF

while kill -0 "$BACK_PID" 2>/dev/null && kill -0 "$FRONT_PID" 2>/dev/null; do
	sleep 1
done
warn "Один из процессов завершился — останавливаю остальные."
exit 1
