# Workload Calendar YouTrack App

YouTrack App для визуализации нагрузки задач по сотрудникам в виде календаря. Приложение работает напрямую через YouTrack REST API и встраивается как App Page (пункт главного меню).

## Структура

- `apps/youtrack-app` — YouTrack App (React + Vite + Tailwind)
- `apps/youtrack-app/src/widgets/calendar` — основной виджет календаря

## Dev-цикл

Установка зависимостей выполняется в корне репозитория (workspaces).

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

После сборки артефакты появляются в `apps/youtrack-app/dist`. Для загрузки в YouTrack архивируйте содержимое этой папки.

## Установка в YouTrack (администратор)

### Вариант 1 — через ZIP

1. `npm install`
2. `npm run build`
3. Заархивировать содержимое `apps/youtrack-app/dist` в ZIP (не папку целиком)
4. Открыть `%YOUTRACK_URL%/admin/apps`
5. **Add app → Upload ZIP**

### Вариант 2 — через CLI

```bash
npm run upload -- --host %YOUTRACK_URL% --token <perm_token>
```

## Привязка к проектам

1. Открыть `%YOUTRACK_URL%/admin/editProject/%PROJECT_ID%?tab=apps`
2. Добавить **Workload Calendar** к нужным проектам

## Настройки приложения

Настройки доступны в админке приложения (schema в `apps/youtrack-app/src/widgets/calendar/settings.json`).

Ключевые параметры:
- `projects` — список проектов (ID или ключ)
- `issueQuery` — дополнительный YouTrack query (например `State: {In Progress}`)
- `startDateField`, `endDateField` — поля дат начала/окончания
- `estimateField`, `qaField`, `spField` — поля оценки нагрузки
- `releaseField`, `typeField`, `statusField`, `assigneeField` — дополнительные поля
- `defaultHorizonDays` — горизонт календаря
- `defaultSprints` — список спринтов по умолчанию

## Обновление задач (Drag & Drop)

Перетаскивание задач по горизонтали обновляет дату начала (и дату окончания, если задано поле) через REST API. В случае ошибки изменение откатывается.

## Примечания

- Если встроенный `host.fetchYouTrack` недоступен, используйте fallback настройки `youtrackBaseUrl` и `youtrackToken`.
- Все стили и визуализация адаптированы под темную/светлую тему YouTrack.

## Локальная валидация манифеста

Схема `youtrack-app.json` хранится локально и используется в сборке:

```bash
npm run build
```

Отдельная проверка:

```bash
npm --workspace apps/youtrack-app run validate:local
```
