# Workload Calendar for YouTrack

Ветка переведена на формат YouTrack App: календарь нагрузки работает как виджет в YouTrack (`MAIN_MENU_ITEM`) и на текущем этапе использует mock-данные без backend.

## Основные директории

- `apps/youtrack-app` — YouTrack приложение (React + Vite + Tailwind)
- `apps/youtrack-app/src/widgets/calendar` — код виджета
- `apps/backend` и `apps/frontend` — legacy-части исходного проекта (не используются для сборки виджета)

## Запуск и сборка виджета

Установка зависимостей:

```bash
npm install
```

Локальная разработка виджета:

```bash
npm run dev
```

Сборка и валидация пакета:

```bash
npm run build
```

Создание ZIP-архива для загрузки в YouTrack:

```bash
npm run zip
```

Архив создается в `apps/youtrack-app` с именем `workload-app-HHmmss.zip`.

## Установка в YouTrack

1. Откройте `Administration > Apps`.
2. Нажмите `Add app`.
3. Загрузите собранный ZIP из `apps/youtrack-app`.

## Настройки виджета

Схема настроек находится в `apps/youtrack-app/src/widgets/calendar/settings.json`:

- `mockDataset` — выбор набора mock-данных (`default` или `compact`);
- `defaultSprints` — JSON-массив спринтов по умолчанию;
- `defaultHolidays` — список праздничных дней через запятую;
- `defaultReleaseDates` — список дат релизов через запятую.

## Legacy-команды

Для старого приложения (backend + frontend) оставлены скрипты:

- `npm run dev:legacy`
- `npm run build:legacy`
- `npm run start:legacy`
