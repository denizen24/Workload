# Workload Board

Локальное Dockerized веб-приложение для визуализации workload разработчиков в формате Miro Gantt.

## Структура

- `apps/backend` — NestJS 10 API: загрузка и парсинг XLSX
- `apps/frontend` — React 18 + Vite + Tailwind UI
- `docker-compose.yml` — сборка и запуск контейнеров

## Быстрый старт (Docker)

```bash
docker-compose up --build
```

Откройте `http://localhost` и загрузите пример `Zadachi-1.xlsx`.

## Локальный запуск (без Docker)

```bash
npm install
npm run dev
```

Backend доступен на `http://localhost:3000`, frontend на `http://localhost:5173`.

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

## Тесты backend

```bash
cd apps/backend
npm test
```
