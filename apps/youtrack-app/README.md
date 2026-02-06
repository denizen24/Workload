# Workload Calendar YouTrack App

YouTrack App для визуализации загрузки задач по сотрудникам в виде календаря. Приложение встраивается как App Page (пункт главного меню) и использует YouTrack REST API.

## Установка зависимостей

```bash
npm install
```

## Локальная разработка

```bash
npm run dev
```

## Сборка

```bash
npm run build
```

Артефакты сборки появляются в `dist`.

## Загрузка в YouTrack (CLI)

```bash
npm run upload -- --host %YOUTRACK_URL% --token <perm_token>
```

## Загрузка в YouTrack (ZIP)

1. `npm install`
2. `npm run build`
3. Заархивировать содержимое `dist` в ZIP
4. Открыть `%YOUTRACK_URL%/admin/apps` → **Add app → Upload ZIP**

## Привязка к проектам

Откройте `%YOUTRACK_URL%/admin/editProject/%PROJECT_ID%?tab=apps` и подключите приложение к проекту.

## Настройки приложения

Настройки доступны в админке приложения и описаны в `src/widgets/calendar/settings.json`.

Основные параметры:
- `projects` — список проектов (ID или ключ)
- `issueQuery` — дополнительный YouTrack query
- `startDateField`, `endDateField` — поля дат
- `estimateField`, `qaField`, `spField` — поля оценки
- `releaseField`, `typeField`, `statusField`, `assigneeField` — дополнительные поля
- `defaultHorizonDays` — горизонт календаря
- `defaultSprints` — спринты по умолчанию

## Обновление задач

Перетаскивание задач по горизонтали обновляет дату начала (и дату окончания, если задано поле) через REST API. При ошибке изменение откатывается и показывается сообщение.

## Примечание по авторизации

По умолчанию используется `host.fetchYouTrack`. Если он недоступен, задайте `youtrackBaseUrl` и `youtrackToken` в настройках приложения.
