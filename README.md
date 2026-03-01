# Workload Board

Локальное Dockerized веб-приложение для визуализации workload разработчиков в формате Miro Gantt.

## Структура

- `apps/backend` — NestJS 10 API: загрузка и парсинг XLSX
- `apps/frontend` — React 18 + Vite + Tailwind UI
- `docker-compose.yml` — сборка и запуск контейнеров

## Быстрый старт (Docker)

```bash
cp .env.example .env
docker-compose up --build
```

Откройте `http://localhost` и загрузите пример `Zadachi-1.xlsx`.

## Локальный запуск (без Docker)

```bash
npm install
npm run dev
```

Backend доступен на `http://localhost:3000`, frontend на `http://localhost:5173`.

## Переменные окружения

Перед запуском backend создайте `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Ключевые переменные:
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `MONGO_URI`
- `REDIS_HOST`, `REDIS_PORT`

## Формат XLSX

Лист: `issues`.

Ожидаемые колонки (по заголовкам или приближенно по содержимому):
- `Issue ID` (например `UCR-846`)
- `Assignee` (например `a.pushkin`)
- `ownestimate` (в секундах)
- `Period` (например `2026Q1 January-2`)
- `Status`
- `created`, `updated`
- `Release`
- `QA`, `SP` (доп. нагрузка)

## API

- `GET /api/health`
- `POST /api/upload` (multipart `file`)
- `POST /api/workload` (multipart `file`)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/snapshots?sprintId=...`
- `POST /api/snapshots`
- `GET /api/snapshots/:id`
- `PATCH /api/snapshots/:id`
- `PATCH /api/snapshots/:id/activate`
- `DELETE /api/snapshots/:id`

`/api/upload`, `/api/workload`, `/api/health`, `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh` — публичные маршруты.  
`/api/snapshots/*`, `/api/auth/me`, `/api/auth/logout` требуют `Authorization: Bearer <accessToken>`.

## Smoke e2e (auth/snapshots)

Запуск на уже поднятом API:

```bash
npm run smoke:auth-snapshots
```

Автоматический запуск через Docker Compose (поднимет mongo/redis/backend, прогонит сценарий и остановит контейнеры):

```bash
npm run smoke:compose:auth-snapshots
```

## Сброс пароля пользователя

Пароль из bcrypt-хэша восстановить нельзя. Чтобы задать пользователю новый пароль (например, если забыт), из корня репозитория:

```bash
npm run set-password -- <email> <новый_пароль>
```

Нужны доступ к MongoDB и корректный `MONGO_URI` в `.env`. Скрипт обновляет поле `passwordHash` в коллекции `users`.

## Тесты backend

```bash
cd apps/backend
npm test
```
