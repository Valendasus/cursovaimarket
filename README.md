# КурсовойМаркет

Маркетплейс учебных услуг: студенты находят исполнителей для курсовых, дипломов и
других учебных задач, обсуждают работу в чате и оплачивают заказ через безопасную
сделку — деньги удерживаются платформой и переходят исполнителю только после сдачи работы.

## Возможности

- **Регистрация и вход** — почта и пароль с подтверждением email, вход через Google и Яндекс (OAuth 2.0 + PKCE), две роли: заказчик и исполнитель.
- **Каталог** — услуги и исполнители с поиском, фильтрами по категориям, рейтингом и пометкой «ТОП».
- **Заказы** — полный жизненный цикл: создание, подтверждение исполнителем, оплата, выполнение, сдача, отмена просроченных.
- **Платежи** — эскроу-модель с раздельными подтверждением и оплатой и комиссией платформы (по умолчанию 13%). Сейчас используется провайдер-заглушка.
- **Чат в реальном времени** — Socket.IO, вложения, разделители по датам, защита от флуда и лимиты подключений.
- **Отзывы и рейтинги** исполнителей.
- **Личный кабинет** — профиль, аватар, специальности, услуги, заказы, настройки и способы входа.
- **Письма** — Unisender Go с запасным SMTP.

## Стек

| Часть | Технологии |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Router и Query, Zustand, Tailwind CSS 4, Radix UI, React Hook Form + Zod, GSAP, Framer Motion |
| Backend | NestJS 11, TypeScript, Prisma 5, PostgreSQL 16, Socket.IO, JWT (access + refresh), Passport, Swagger |
| Инфраструктура | Docker Compose, S3-хранилище (Selectel), Unisender Go / SMTP |
| Тесты | Jest (backend), Vitest + Testing Library, Playwright (frontend) |

## Быстрый старт

Нужны **Node.js 20+** и **Docker Desktop** (запущенный).

```bash
git clone https://github.com/Valendasus/cursovaimarket.git
cd cursovaimarket
./dev.sh --seed
```

Скрипт сам создаст `.env` из примеров, установит зависимости, поднимет PostgreSQL в Docker,
применит миграции, заполнит базу демо-данными и запустит backend и frontend.
Флаг `--seed` нужен только при первом запуске, дальше достаточно `./dev.sh`.

| Что | Адрес |
|---|---|
| Сайт | http://localhost:5173 |
| API | http://localhost:3000/api |
| Swagger (документация API) | http://localhost:3000/api/docs |

`Ctrl+C` останавливает backend и frontend, база продолжает работать.
`./dev.sh --stop` выключает и её.

### Демо-аккаунты

Пароль у всех — `Password123!`

| Роль | Email |
|---|---|
| Заказчик | `student@cursovai.ru` |
| Исполнители | `ivan@cursovai.ru`, `maria@cursovai.ru`, `alex@cursovai.ru`, `elena@cursovai.ru` |

Если почтовый транспорт не настроен, в режиме разработки письма (например, ссылка
подтверждения email) не отправляются, а печатаются в логе backend с пометкой `[DEV MAIL]`.

## Ручной запуск

Если удобнее запускать части по отдельности (например, на Windows без bash):

```bash
# 1. База данных
cd backend
docker compose up -d postgres

# 2. Backend — http://localhost:3000
cp .env.example .env
npm install
npx prisma migrate deploy
npm run prisma:seed        # демо-данные, по желанию
npm run start:dev

# 3. Frontend — http://localhost:5173 (в другом терминале)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Для просмотра базы в браузере можно поднять pgAdmin на http://localhost:5050
(логин `admin@example.com`, пароль `admin`):

```bash
cd backend && docker compose --profile tools up -d
```

## Настройки

Все переменные с комментариями — в `backend/.env.example` и `frontend/.env.example`.
Для локального запуска значения по умолчанию подходят как есть. Отдельно настраиваются:

- **S3** (`S3_*`) — хранилище аватаров и вложений чата.
- **Почта** (`UNISENDER_GO_*` или `SMTP_*`) — без них письма уходят в лог.
- **OAuth** (`GOOGLE_*`, `YANDEX_*`) — без ключей кнопки входа через Google и Яндекс неактивны.

### Вход через Google и Яндекс

1. **Google:** в [Google Cloud Console](https://console.cloud.google.com/apis/credentials) создайте OAuth client типа *Web application* и добавьте redirect URI
   `http://localhost:3000/api/v1/auth/oauth/google/callback`. Используются только scope `openid email profile`.
2. **Яндекс:** зарегистрируйте приложение в [Яндекс OAuth](https://oauth.yandex.ru/) с правами `login:email` и `login:info` и redirect URI
   `http://localhost:3000/api/v1/auth/oauth/yandex/callback`.
3. Впишите `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` в `backend/.env` и перезапустите backend.

Как это устроено: server-side authorization code flow с PKCE S256, одноразовый `state`
привязан к httpOnly-cookie браузера, токены провайдеров не сохраняются и не попадают в браузер.
Аккаунт определяется парой «провайдер + id», а не почтой — существующий аккаунт с той же
почтой автоматически не захватывается, провайдер привязывается вручную в настройках.

В продакшене обязателен HTTPS, а frontend и API должны быть на одном сайте
(например, `app.example.ru` и `api.example.ru`) — авторизация использует SameSite-cookie.

## Тесты

```bash
# Backend
cd backend
npm test                 # unit-тесты (Jest)
npm run test:cov         # с покрытием

# Frontend
cd frontend
npm test                 # unit-тесты (Vitest)
npm run test:e2e         # e2e-сценарии (Playwright)
npm run lint
```

Перед первым запуском e2e установите браузер: `npx playwright install chromium`.
E2E-тесты перехватывают запросы к API и работают на фикстурах — они не трогают базу, S3 и платежи.

## Структура

```
.
├── dev.sh                   # запуск всего проекта одной командой
├── backend/                 # NestJS API
│   ├── docker-compose.yml   # PostgreSQL (+ pgAdmin по желанию)
│   ├── prisma/              # схема, миграции, демо-данные
│   └── src/
│       ├── common/          # почта, S3, guards, общие утилиты
│       └── modules/         # auth, users, services, orders, payments, chat, reviews
└── frontend/                # React SPA
    ├── e2e/                 # Playwright-тесты
    └── src/
        ├── api/             # клиенты API
        ├── components/      # UI-компоненты
        ├── features/        # фичи (кабинет, чат, исполнители…)
        ├── pages/           # страницы
        └── router/          # маршруты TanStack Router
```
