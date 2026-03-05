# UI Contract (Frontend)

Документ фиксирует единые правила UI для `apps/frontend`.
Цель: убрать визуальную фрагментацию и ускорить разработку новых экранов.

## 1) Базовые роли компонентов

- `ui-card` — контейнер секции/панели.
- `ui-btn` — стандартная кнопка (secondary по умолчанию).
- `ui-btn ui-btn-primary` — primary action в секции (рекомендуется 1 primary на блок).
- `ui-btn-sm` — компактная action-кнопка в строках/таблицах.
- `ui-btn-danger` — destructive состояние для удаления/опасных действий.
- `ui-btn-ghost` — нейтральная кнопка с минимальным акцентом.
- `ui-input` — общий стиль `input/select`.
- `ui-segmented`, `ui-segment-btn`, `ui-segment-btn-active` — segmented control.
- `ui-muted` — вторичный текст описаний.
- `ui-text-secondary` — вторичный текст в строках/таблицах.
- `ui-text-emphasis` — усиленный вторичный текст.
- `ui-text-caption` — подписи/лейблы малой важности.
- `ui-empty-state` — пустое состояние (no data).
- `ui-skeleton` — skeleton-элемент.
- `ui-spinner` — индикатор загрузки в кнопке.
- `ui-chip-warning`, `ui-chip-warning-action` — warning chip + action.
- `ui-table-head`, `ui-table-row` — строки таблиц.

## 2) Правила использования

- В каждой секции должен быть **один** primary action (`ui-btn ui-btn-primary`).
- Все destructive действия должны иметь `ui-btn-danger`.
- Не использовать “ручные” сочетания вида `text-slate-*`, `border-slate-*` в JSX, если есть semantic-класс.
- Для loading:
  - на кнопках: `ui-spinner` + disabled;
  - на списках/карточках: `ui-skeleton`;
  - при отсутствии данных: `ui-empty-state`.
- Все интерактивные элементы должны использовать классы с `focus-visible` (уже встроено в `ui-btn` и `ui-input`).

## 3) Типографика и плотность

- Section title: `text-lg font-semibold`.
- Description/helper: `ui-muted`.
- Caption: `ui-text-caption`.
- Стандартные кнопки: `ui-btn`.
- Плотные кнопки в строках: `ui-btn-sm`.

## 4) Цветовые уровни

- Семантические токены в `tailwind.config.ts` (`colors.ui.*`):
  - `ui.success`
  - `ui.warning`
  - `ui.danger`
  - `ui.info`
- Для канбан/диаграмм использовать palette-модули (например `theme/boardPalette.ts`), а не inline hex в компонентах.

## 5) Do / Don't

- Do: `className="ui-btn ui-btn-primary"`  
  Don't: `className="rounded-full border ... bg-indigo-600 ..."` в каждом месте отдельно.
- Do: `className="ui-empty-state"`  
  Don't: дублировать `border-dashed ... text-slate-*` в каждом блоке.
- Do: выносить тематические палитры в `src/theme/*`.  
  Don't: смешивать theme-цвета с логикой рендера внутри больших компонентов.
