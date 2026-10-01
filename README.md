# TrackBox24 Web

Бек-офіс [TrackBox24](https://trackbox24.com) для ролей **ADMIN** (компанії, користувачі) та **MANAGER** (посилки, клієнти, рейси в межах своєї компанії). Сканування — у мобільному застосунку, тут його немає.

**Стек:** React 19, Vite, TypeScript, Tailwind v4 + shadcn/ui (Base UI), react-router, TanStack Query, react-hook-form + zod, react-i18next (поки лише `uk`), openapi-fetch з типами, згенерованими з OpenAPI бекенду.

## Запуск

Потрібен запущений бекенд (`trackbox24_back`, `docker compose up -d --build`) на `http://localhost:8080` — у dev-режимі Vite проксує `/api` туди, бо CORS на бекенді не налаштований. На проді веб і API мають бути на одному origin за reverse-proxy.

```bash
npm install
npm run dev            # http://localhost:5173
```

Тестові облікові записи після сіду: `admin@trackbox24.com` / `admin12345` (ADMIN), `manager@test.ua` / `manager123` (MANAGER).

## Скрипти

| Команда | Що робить |
|---|---|
| `npm run dev` | dev-сервер з HMR |
| `npm run build` | `tsc -b` + продакшн-збірка в `dist/` |
| `npm run typecheck` | лише перевірка типів |
| `npm run lint` | oxlint |
| `npm run api:types` | перегенерувати `src/lib/api/schema.d.ts` з `http://localhost:8080/v3/api-docs` — запускати після змін API на бекенді |

## Структура

```
src/
  components/ui/        shadcn (генерується CLI, не правити руками)
  components/common/    DataTable, Pagination, LinkButton, FieldErrorText, DetailsList
  components/layout/    AppShell (сайдбар за роллю), PageHeader
  features/auth/        токен, AuthProvider, логін
  features/parcels/     список, створення, картка, редагування, статус, історія, етикетки
  features/clients/     список, створення, картка, форма, ClientPicker
  features/users/       користувачі компанії (створення/редагування, ключ НП представника), UserSelect
  features/companies/   адмін: список/картка компаній, активація; менеджер: «Моя компанія», резервний ключ НП, синхронізація
  features/cars/        машини (список, створення/редагування)
  lib/api/              openapi-fetch клієнт, парсер problem+json, пагінація, типи
  lib/i18n/uk/          словники
  routes/               роутер, гарди за роллю
```

## Нюанси бекенду, на які спирається фронт

- JWT без refresh-токена (TTL 12 год): на 401 клієнт чистить токен і веде на `/login?reason=expired`.
- `PUT /api/parcels/{id}` замінює всі поля (не patch): діалог редагування завжди шле `clientId`, `representativeId`, `needsEnrichment`.
- Штрих-код і місця (`PT…-N`) з'являються лише після отримання представником; етикетки малює фронт (Code 128, `jsbarcode`).
- ADMIN не має `companyId` і отримує 403 на посилках/клієнтах — його домашня сторінка `/companies`.
- Усі поля відповідей опціональні (`null` пропускається), помилки — RFC 7807 з мапою `errors` для валідації.
