# Denessa 1.1 Free

Бесплатная архитектура Denessa 1.1: Cloudflare Pages (сайт) + Cloudflare Worker (API) + Durable Object SQLite (данные и WebSocket).

Без Supabase и без Render.

## Структура
- `client/` — React/Vite для Cloudflare Pages
- `worker/` — Worker + Durable Object для API, базы и real-time

## Публикация
1. Загрузи папку проекта в GitHub.
2. В Cloudflare Workers создай Worker из `worker/`.
3. Используй `worker/wrangler.toml`; он уже содержит SQLite Durable Object.
4. Создай секрет `JWT_SECRET` в Worker.
5. Получишь адрес Worker вида `https://denessa-1-1-free.<твоя-зона>.workers.dev`.
6. Создай Cloudflare Pages проект из `client/`.
7. В Pages добавь `VITE_API_URL` = адрес Worker.
8. Build command: `npm run build`; output: `dist`.

## Бесплатные лимиты
Cloudflare указывает для Workers Free 100 000 запросов/день. SQLite Durable Objects на Free также имеют 100 000 requests/day и 5 GB общего хранения. Это подходит для MVP/небольшого проекта; большой публичный мессенджер может превысить лимиты.
