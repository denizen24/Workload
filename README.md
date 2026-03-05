# Workload Board

Сервис для планирования и балансировки нагрузки команды: загрузка задач из YouTrack (XLSX), визуальный календарь занятости, ручные корректировки и сохранение сценариев в снапшоты.

## Структура

- `apps/backend` — NestJS 10 API: загрузка/парсинг XLSX, auth, snapshots
- `apps/frontend` — React 18 + Vite + Tailwind UI
- `docker-compose.yml` — сборка и запуск контейнеров

## Быстрый старт (Docker)

```bash
cp .env.example .env
docker-compose up --build
```

Откройте `http://localhost:8080`.

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
- `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `MONGO_URI`
- `REDIS_HOST`, `REDIS_PORT`

## Текущий UX-флоу

- Сначала доступен стартовый экран: блок о текущей итерации, загрузка XLSX и preview-пример календаря.
- После загрузки XLSX отображаются календарь, спринты, маркеры праздников/релизов и кастомные задачи.
- Блок снапшотов доступен только авторизованному пользователю.

## Формат XLSX (текущая итерация)

Лист: `issues` (или первый лист, если `issues` не найден).

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

## Фронтенд-функционал

- Drag-and-drop задач в календаре с сохранением новых стартовых дат в снапшоте.
- Ручные задачи:
  - `дежурство`, `отпуск`, `болезнь`;
  - `задача` (идентификатор, тип, заголовок, оценка).
- Экспорт скриншота календаря в `PNG`/`JPG`.
- Переключение темной/светлой темы.

## Smoke e2e (auth/snapshots)

Запуск на уже поднятом API:

```bash
npm run smoke:auth-snapshots
```

Автоматический запуск через Docker Compose (поднимет mongo/redis/backend, прогонит сценарий и остановит контейнеры):

```bash
npm run smoke:compose:auth-snapshots
```

## Docker: важная заметка по preview-картинкам

Для корректной раздачи файлов из `apps/frontend/public` в контейнере frontend Dockerfile должен включать копирование:

```dockerfile
COPY public ./public
```

Если обновились статические assets, пересоберите frontend-образ:

```bash
docker compose up -d --build frontend
```

## Мини UI-контракт (frontend)

Для единообразия интерфейса переиспользуйте классы из `apps/frontend/src/index.css`:

- `ui-card` — карточка секции
- `ui-btn` — стандартная кнопка
- `ui-btn ui-btn-primary` — primary action
- `ui-btn-sm` — компактная action-кнопка
- `ui-btn-danger` — destructive action
- `ui-input` — input/select
- `ui-muted` — вторичный текст
- `ui-skeleton` — skeleton-loading
- `ui-segmented`, `ui-segment-btn`, `ui-segment-btn-active` — segmented control
- `ui-spinner` — индикатор загрузки в кнопках

Детальная спецификация и процесс-проверка:
- `apps/frontend/src/theme/uiContract.md`
- `apps/frontend/src/theme/uiChecklist.md`

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
