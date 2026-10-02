# TrackBox24 Web

Бек-офіс [TrackBox24](https://trackbox24.com): посилки, клієнти, рейси, склади, оплата, користувачі компанії. Сканування (отримання з НП, завантаження, видача, на склад) — у мобільному застосунку, у вебі його немає.

**Стек:** React 19, Vite, TypeScript, Tailwind v4 + shadcn/ui (Base UI), react-router, TanStack Query, react-hook-form + zod, react-i18next (поки лише `uk`), openapi-fetch з типами, згенерованими з OpenAPI бекенду.

## Запуск

Потрібен запущений бекенд (`trackbox24_back`, `docker compose up -d --build`) на `http://localhost:8080` — у dev-режимі Vite проксує `/api` туди, бо CORS на бекенді не налаштований. На проді веб і API мають бути на одному origin за reverse-proxy.

```bash
npm install
npm run dev            # http://localhost:5173
```

Тестові облікові записи після сіду e2e: `admin@trackbox24.com` / `admin12345` (ADMIN), `manager@test.ua` / `manager123` (MANAGER).

## Ролі у вебі

| Роль | Що бачить |
|---|---|
| `MANAGER` | усе в межах своєї компанії: посилки, клієнти, рейси, склади, користувачі, машини, «Компанія», «Кошик»; усі дії |
| `VIEWER` | ті самі екрани без кнопок дій (включно з грошима) |
| `ADMIN` | компанії та їхні користувачі; з картки компанії «Відкрити компанію» → ті самі екрани менеджера **лише для читання** (запити йдуть із заголовком `X-Company-Id`); банер зверху, «Вийти з режиму» |
| `REPRESENTATIVE` / `DRIVER` (без інших ролей) | сторінка «користуйтесь мобільним застосунком» |

У користувача може бути кілька ролей; права — об'єднання. Логіка в `src/features/auth/access.ts` (`useAccess`: `canEdit`, `canSeeMoney`, `companyMode`…).

## Скрипти

| Команда | Що робить |
|---|---|
| `npm run dev` | dev-сервер з HMR |
| `npm run build` | `tsc -b` + продакшн-збірка в `dist/` |
| `npm run typecheck` | лише перевірка типів |
| `npm run lint` | oxlint |
| `npm run api:types` | перегенерувати `src/lib/api/schema.d.ts` з `http://localhost:8080/v3/api-docs` — запускати після змін API на бекенді |
| `npm run e2e:install` | один раз: завантажити Chromium для Playwright |
| `npm run e2e` | наскрізні сценарії (`e2e/*.mjs`) проти запущених dev-сервера й бекенду; скріншоти в `e2e/shots/` |

## Структура

```
src/
  components/ui/        shadcn (генерується CLI, не правити руками)
  components/common/    DataTable (з вибором рядків), Pagination, LinkButton, ConfirmDialog, DetailsList
  components/layout/    AppShell (навігація за ролями, банер режиму компанії), PageHeader
  features/auth/        токен, AuthProvider (roles[]), useAccess, режим компанії для адміна, логін, зміна пароля
  features/parcels/     список (фільтри, масове переміщення на склад), створення, картка (місця, оплата, НП, історія),
                        редагування, ручний статус (зі складом), етикетки
  features/clients/     список, створення, картка, форма, ClientPicker
  features/trips/       рейси: список за статусом/відкриті з лічильниками, план (пікер посилок), виїзд, завершення (409 → склад), скасування, реєстр (Excel), видалення, історія
  features/trash/       кошик: видалені посилки/рейси/клієнти/машини/склади/користувачі з відновленням; DeleteEntityButton
  features/warehouses/  довідник складів, WarehouseSelect, переміщення на склад
  features/users/       користувачі (мультиролі, скидання пароля, ключ НП представника), UserSelect
  features/companies/   адмін: компанії, картка, «Відкрити компанію»; менеджер: «Компанія», резервний ключ НП, синхронізація
  features/cars/        машини, CarSelect
  lib/api/              openapi-fetch клієнт (Bearer, X-Company-Id), парсер problem+json (з extensions), пагінація, типи
  lib/i18n/uk/          словники
  routes/               роутер (lazy-сторінки), гарди за доступом
```

## E2E

`e2e/` — три сценарії на Playwright (посилки+клієнти+склади+оплата; адмін+користувачі+машини+VIEWER; рейси), без тест-раннера: кожен крок друкує `PASS`/`FAIL`, процес завершується з кодом 1, якщо щось впало. Потрібні запущені `npm run dev` і бекенд; фікстури створюються автоматично. Скани водія емулюються прямими викликами `POST /api/scan/load|deliver`. Адреси можна перевизначити через `E2E_BASE_URL` / `E2E_API_URL`.

## Нюанси бекенду, на які спирається фронт

- JWT без refresh-токена (TTL 12 год); токен відкликається при зміні пароля/ролей/деактивації — на 401 клієнт чистить токен і веде на `/login?reason=expired`. `POST /api/auth/password` повертає новий токен, який підміняється без перелогіну.
- Рейс: `PLANNED → PREPARING → IN_PROGRESS → COMPLETED | CANCELLED`. План — лише для менеджера; у машину посилки потрапляють сканами з `tripId`. При виїзді незавантажене знімається з плану. `complete` відповідає 409 з `undeliveredParcels`, якщо в машині ще є посилки — веб пропонує перемістити їх на склад і повторює.
- `GET /api/trips/{id}/parcels` — план і факт в одному списку: `plannedTripId` / `tripId`; прогрес — за `seats[].status`.
- Склади: `POST /api/warehouses/{id}/parcels` — all-or-nothing; ручний статус `AT_WAREHOUSE` вимагає `warehouseId`.
- Ціну доставки та оплату бачать усі, крім чистого REPRESENTATIVE; змінює лише MANAGER.
- `PUT /parcels/{id}` — часткове оновлення (пропущене не змінюється). Габарити (`lengthCm/widthCm/heightCm`) і місто доставки (`deliveryCity`, порожнє = місто клієнта) вводяться вручну, НП їх не віддає; `npVolumeWeight` — лише з НП.
- Усі списки сторінками, зокрема історії й посилки рейсу (`{content, page}`); веб бере історію/посилки рейсу з `size=200`.
- М'яке видалення: `DELETE /api/<сутність>/{id}` + `POST …/restore`, кошик `GET …/deleted`; правила «коли можна видалити» — на бекенді, веб показує `detail` помилки.
- `GET /api/trips` віддає лічильники `plannedCount/loadedCount/deliveredCount`, фільтри `status` (кілька) і `open=true`; `GET /api/trips/{id}/register.xlsx` — реєстр рейсу.
- Усі поля відповідей опціональні (`null` пропускається), помилки — RFC 7807 з мапою `errors` для валідації.
