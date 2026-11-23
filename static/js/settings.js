const STORAGE_KEY = "imageshop.settings.v1";

export const DEFAULT_SETTINGS = {
  general: {
    language: "ru",
    theme: "dark",
    uiScale: 100,
    textScale: 100,
    autoSave: false,
    autoSaveMinutes: 5,
    confirmDelete: true,
    confirmClose: true,
    restoreSession: false,
    welcomeScreen: false
  },
  tools: {
    brush: { size: 16, opacity: 100, hardness: 100, smoothing: true, color: "#5b9cf5", quality: "balanced" },
    pencil: { size: 3, opacity: 100, smoothing: true },
    pixelBrush: { size: 8, opacity: 100, hardness: 100, smoothing: false },
    marker: { size: 24, opacity: 45, hardness: 100, smoothing: true },
    airbrush: { size: 48, opacity: 35, hardness: 35, smoothing: true, quality: "balanced" },
    glowBrush: { size: 36, opacity: 70, hardness: 45, glow: 180, smoothing: true },
    eraser: { size: 24, opacity: 100, hardness: 100 },
    blur: { size: 24, opacity: 70, hardness: 50 },
    dodge: { size: 32, opacity: 45, hardness: 50 },
    burn: { size: 32, opacity: 45, hardness: 50 },
    bucket: { tolerance: 24, grow: 2, gapClosing: "low", antiAliasing: true, contiguous: true, sampleAllLayers: false },
    shapes: { width: 4, stroke: "#5b9cf5", fill: "#5b9cf5", fillEnabled: false, polygonSides: 6 },
    gradient: { type: "linear", background: "#ffffff" },
    colorGradient: { enabled: false, start: "#5b9cf5", end: "#ffffff" },
    eyedropper: { sample: "pixel", radius: 2 }
  },
  canvas: {
    workspace: "#15171a",
    checkerSize: 16,
    checkerLight: "#ffffff",
    checkerDark: "#bfc2c6",
    showChecker: true,
    showGrid: false,
    gridSize: 50,
    showGuides: false,
    showBorder: true,
    snapToGrid: false,
    centerOnOpen: true,
    defaultZoom: "fit",
    wheelZoom: true
  },
  layers: {
    defaultName: "Слой",
    opacity: 100,
    confirmDelete: true,
    thumbnails: true,
    thumbnailSize: 36,
    lockedColor: "#e5a84b"
  },
  history: {
    maxSteps: 30,
    maxMemoryMB: 256,
    persistSession: false
  },
  performance: {
    smoothingQuality: "high",
    optimizeLargeCanvases: true,
    backgroundOperations: 2
  },
  workspace: {
    leftVisible: true,
    rightVisible: true,
    topVisible: true,
    leftWidth: 48,
    rightWidth: 248
  },
  shortcuts: {
    brush: "b",
    pencil: "p",
    pixelBrush: "x",
    marker: "m",
    airbrush: "a",
    glowBrush: "w",
    eraser: "e",
    blur: "u",
    dodge: "d",
    burn: "n",
    hand: "h",
    selectRect: "s",
    lasso: "j",
    line: "l",
    rectangle: "r",
    ellipse: "o",
    polygon: "y",
    star: "v",
    bezier: "q",
    fill: "g",
    gradient: "shift+g",
    eyedropper: "i",
    text: "t",
    crop: "c",
    undo: "ctrl+z",
    redo: "ctrl+shift+z",
    save: "ctrl+s",
    open: "ctrl+o",
    newDocument: "ctrl+n",
    zoomIn: "ctrl+=",
    zoomOut: "ctrl+-"
  }
};

export const SETTING_CATEGORIES = [
  ["general", "Общие"],
  ["tools", "Инструменты"],
  ["canvas", "Холст"],
  ["layers", "Слои"],
  ["history", "История"],
  ["shortcuts", "Горячие клавиши"],
  ["performance", "Производительность"],
  ["workspace", "Рабочее пространство"]
];

export const SETTING_FIELDS = {
  general: [
    { path: "general.language", label: "Язык интерфейса", type: "select", options: [["ru", "Русский"], ["en", "English"], ["es", "Español"], ["de", "Deutsch"], ["be", "Беларуская"]], keywords: "язык language idioma Sprache мова" },
    { path: "general.theme", label: "Тема", type: "select", options: [["dark", "Тёмная"], ["light", "Светлая"]], keywords: "тема theme" },
    { path: "general.uiScale", label: "Масштаб интерфейса", type: "range", min: 80, max: 130, step: 5, suffix: "%" },
    { path: "general.textScale", label: "Размер текста", type: "range", min: 80, max: 150, step: 5, suffix: "%" },
    { path: "general.autoSave", label: "Автоматическое сохранение", type: "toggle" },
    { path: "general.autoSaveMinutes", label: "Интервал автосохранения", type: "number", min: 1, max: 60, suffix: " мин", when: "general.autoSave" },
    { path: "general.confirmDelete", label: "Подтверждать удаление слоёв", type: "toggle" },
    { path: "general.confirmClose", label: "Подтверждать закрытие несохранённого документа", type: "toggle" },
    { path: "general.restoreSession", label: "Восстанавливать последнюю сессию", type: "toggle" },
    { path: "general.welcomeScreen", label: "Показывать приветственный экран", type: "toggle" }
  ],
  tools: [
    { path: "tools.brush.size", label: "Кисть: размер по умолчанию", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.brush.opacity", label: "Кисть: непрозрачность", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.brush.hardness", label: "Кисть: жёсткость", type: "range", min: 0, max: 100, suffix: "%" },
    { path: "tools.brush.smoothing", label: "Кисть: сглаживание линий", type: "toggle" },
    { path: "tools.brush.color", label: "Кисть: цвет по умолчанию", type: "color" },
    { path: "tools.brush.quality", label: "Кисть: скорость и качество", type: "select", options: [["fast", "Быстро"], ["balanced", "Сбалансировано"], ["quality", "Высокое качество"]] },
    { path: "tools.pencil.size", label: "Карандаш: размер", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.pencil.opacity", label: "Карандаш: непрозрачность", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.pencil.smoothing", label: "Карандаш: сглаживание", type: "toggle" },
    { path: "tools.pixelBrush.size", label: "Пиксельная кисть: размер", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.pixelBrush.opacity", label: "Пиксельная кисть: непрозрачность", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.marker.size", label: "Маркер: размер", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.marker.opacity", label: "Маркер: непрозрачность", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.marker.hardness", label: "Маркер: жёсткость", type: "range", min: 0, max: 100, suffix: "%" },
    { path: "tools.marker.smoothing", label: "Маркер: сглаживание", type: "toggle" },
    { path: "tools.airbrush.size", label: "Аэрограф: размер", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.airbrush.opacity", label: "Аэрограф: непрозрачность", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.airbrush.hardness", label: "Аэрограф: мягкость распыления", type: "range", min: 0, max: 100, suffix: "%" },
    { path: "tools.airbrush.smoothing", label: "Аэрограф: сглаживание", type: "toggle" },
    { path: "tools.glowBrush.size", label: "Светящаяся кисть: размер", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.glowBrush.opacity", label: "Светящаяся кисть: сила свечения", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.glowBrush.hardness", label: "Светящаяся кисть: мягкость", type: "range", min: 0, max: 100, suffix: "%" },
    { path: "tools.glowBrush.glow", label: "Светящаяся кисть: уровень свечения", type: "range", min: 1, max: 255 },
    { path: "tools.eraser.size", label: "Ластик: размер", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.eraser.opacity", label: "Ластик: непрозрачность", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.eraser.hardness", label: "Ластик: жёсткость", type: "range", min: 0, max: 100, suffix: "%" },
    { path: "tools.blur.size", label: "Размытие: размер", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.blur.opacity", label: "Размытие: сила", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.blur.hardness", label: "Размытие: жёсткость края", type: "range", min: 0, max: 100, suffix: "%" },
    { path: "tools.dodge.size", label: "Осветлитель: размер", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.dodge.opacity", label: "Осветлитель: сила", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.dodge.hardness", label: "Осветлитель: жёсткость", type: "range", min: 0, max: 100, suffix: "%" },
    { path: "tools.burn.size", label: "Затемнитель: размер", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.burn.opacity", label: "Затемнитель: сила", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "tools.burn.hardness", label: "Затемнитель: жёсткость", type: "range", min: 0, max: 100, suffix: "%" },
    { path: "tools.bucket.tolerance", label: "Заливка: допуск цвета", type: "range", min: 0, max: 255, suffix: "" },
    { path: "tools.bucket.grow", label: "Заливка: расширение", type: "range", min: 0, max: 10, suffix: " px" },
    { path: "tools.bucket.gapClosing", label: "Заливка: закрытие разрывов", type: "select", options: [["none", "Выкл."], ["low", "Низкая"], ["medium", "Средняя"], ["high", "Высокая"]] },
    { path: "tools.bucket.antiAliasing", label: "Заливка: сглаживание краёв", type: "toggle" },
    { path: "tools.bucket.contiguous", label: "Заливка: только связанная область", type: "toggle" },
    { path: "tools.bucket.sampleAllLayers", label: "Заливка: учитывать все видимые слои", type: "toggle" },
    { path: "tools.shapes.width", label: "Фигуры: толщина контура", type: "number", min: 1, max: 200, suffix: " px" },
    { path: "tools.shapes.polygonSides", label: "Многоугольник: число сторон", type: "number", min: 3, max: 12, suffix: "" },
    { path: "tools.shapes.stroke", label: "Фигуры: цвет контура", type: "color" },
    { path: "tools.shapes.fill", label: "Фигуры: цвет заливки", type: "color" },
    { path: "tools.shapes.fillEnabled", label: "Фигуры: включить заливку", type: "toggle" },
    { path: "tools.gradient.type", label: "Градиент: тип", type: "select", options: [["linear", "Линейный"], ["radial", "Радиальный"]] },
    { path: "tools.colorGradient.enabled", label: "Цвет: градиент кисти", type: "toggle" },
    { path: "tools.colorGradient.start", label: "Цвет: начало градиента", type: "color" },
    { path: "tools.colorGradient.end", label: "Цвет: конец градиента", type: "color" },
    { path: "tools.eyedropper.sample", label: "Пипетка: область выборки", type: "select", options: [["pixel", "Один пиксель"], ["area", "Усреднённая область"]] },
    { path: "tools.eyedropper.radius", label: "Пипетка: радиус области", type: "number", min: 1, max: 20, suffix: " px", when: "tools.eyedropper.sample" }
  ],
  canvas: [
    { path: "canvas.workspace", label: "Цвет рабочей области", type: "color" },
    { path: "canvas.showChecker", label: "Шахматный фон прозрачности", type: "toggle" },
    { path: "canvas.checkerSize", label: "Размер шахматной ячейки", type: "number", min: 4, max: 64, suffix: " px" },
    { path: "canvas.checkerLight", label: "Светлый цвет шахматного фона", type: "color" },
    { path: "canvas.checkerDark", label: "Тёмный цвет шахматного фона", type: "color" },
    { path: "canvas.showGrid", label: "Отображать сетку", type: "toggle" },
    { path: "canvas.gridSize", label: "Размер ячейки сетки", type: "number", min: 5, max: 500, suffix: " px" },
    { path: "canvas.showGuides", label: "Отображать направляющие", type: "toggle" },
    { path: "canvas.showBorder", label: "Отображать границы холста", type: "toggle" },
    { path: "canvas.snapToGrid", label: "Привязка инструментов к сетке", type: "toggle" },
    { path: "canvas.centerOnOpen", label: "Центрировать холст при открытии", type: "toggle" },
    { path: "canvas.defaultZoom", label: "Масштаб по умолчанию", type: "select", options: [["fit", "Вписать"], ["50", "50%"], ["100", "100%"], ["200", "200%"]] },
    { path: "canvas.wheelZoom", label: "Масштабирование колёсиком мыши", type: "toggle" }
  ],
  layers: [
    { path: "layers.defaultName", label: "Название нового слоя", type: "text" },
    { path: "layers.opacity", label: "Непрозрачность новых слоёв", type: "range", min: 1, max: 100, suffix: "%" },
    { path: "layers.confirmDelete", label: "Подтверждать удаление слоя", type: "toggle" },
    { path: "layers.thumbnails", label: "Показывать миниатюры", type: "toggle" },
    { path: "layers.thumbnailSize", label: "Размер миниатюр", type: "select", options: [["36", "Маленький"], ["48", "Средний"], ["60", "Большой"]] },
    { path: "layers.lockedColor", label: "Цвет индикатора блокировки", type: "color" }
  ],
  history: [
    { path: "history.maxSteps", label: "Максимальное число шагов Undo", type: "number", min: 1, max: 200 },
    { path: "history.maxMemoryMB", label: "Лимит памяти истории", type: "number", min: 16, max: 2048, suffix: " MB" },
    { path: "history.persistSession", label: "Сохранять историю текущей сессии", type: "toggle" }
  ],
  performance: [
    { path: "performance.smoothingQuality", label: "Качество сглаживания холста", type: "select", options: [["low", "Быстрое"], ["medium", "Сбалансированное"], ["high", "Высокое"]] },
    { path: "performance.optimizeLargeCanvases", label: "Оптимизация больших холстов", type: "toggle" },
    { path: "performance.backgroundOperations", label: "Фоновых операций за кадр", type: "number", min: 1, max: 8 }
  ],
  workspace: [
    { path: "workspace.leftVisible", label: "Показывать панель инструментов", type: "toggle" },
    { path: "workspace.rightVisible", label: "Показывать правую панель", type: "toggle" },
    { path: "workspace.topVisible", label: "Показывать верхнюю панель", type: "toggle" },
    { path: "workspace.leftWidth", label: "Ширина левой панели", type: "number", min: 40, max: 120, suffix: " px" },
    { path: "workspace.rightWidth", label: "Ширина правой панели", type: "number", min: 180, max: 420, suffix: " px" }
  ]
};

export const SHORTCUTS = [
  ["brush", "Кисть"], ["pencil", "Карандаш"], ["pixelBrush", "Пиксельная кисть"], ["marker", "Маркер"],
  ["airbrush", "Аэрограф"], ["glowBrush", "Светящаяся кисть"], ["eraser", "Ластик"],
  ["blur", "Размытие"], ["dodge", "Осветлитель"], ["burn", "Затемнитель"], ["hand", "Рука"],
  ["selectRect", "Прямоугольное выделение"], ["lasso", "Лассо"], ["line", "Линия"],
  ["rectangle", "Прямоугольник"], ["ellipse", "Эллипс"], ["polygon", "Многоугольник"],
  ["star", "Звезда"], ["bezier", "Кривая Безье"], ["gradient", "Градиент"], ["fill", "Заливка"],
  ["eyedropper", "Пипетка"], ["text", "Текст"], ["crop", "Обрезка"],
  ["undo", "Отменить"], ["redo", "Повторить"],
  ["save", "Сохранить проект"], ["open", "Открыть изображение"], ["newDocument", "Новый документ"],
  ["zoomIn", "Увеличить масштаб"], ["zoomOut", "Уменьшить масштаб"]
];

export const ENGLISH_CATEGORIES = {
  general: "General",
  tools: "Tools",
  canvas: "Canvas",
  layers: "Layers",
  history: "History",
  shortcuts: "Keyboard shortcuts",
  performance: "Performance",
  workspace: "Workspace"
};

export const ENGLISH_SETTING_LABELS = {
  "general.language": "Interface language",
  "general.theme": "Theme",
  "general.uiScale": "Interface scale",
  "general.textScale": "Interface text size",
  "general.autoSave": "Automatic saving",
  "general.autoSaveMinutes": "Autosave interval",
  "general.confirmDelete": "Confirm layer deletion",
  "general.confirmClose": "Confirm closing an unsaved document",
  "general.restoreSession": "Restore last session",
  "general.welcomeScreen": "Show welcome screen",
  "tools.brush.size": "Brush: default size",
  "tools.brush.opacity": "Brush: opacity",
  "tools.brush.hardness": "Brush: hardness",
  "tools.brush.smoothing": "Brush: line smoothing",
  "tools.brush.color": "Brush: default color",
  "tools.brush.quality": "Brush: speed and quality",
  "tools.pencil.size": "Pencil: size",
  "tools.pencil.opacity": "Pencil: opacity",
  "tools.pencil.smoothing": "Pencil: smoothing",
  "tools.pixelBrush.size": "Pixel Brush: size",
  "tools.pixelBrush.opacity": "Pixel Brush: opacity",
  "tools.marker.size": "Marker: size",
  "tools.marker.opacity": "Marker: opacity",
  "tools.marker.hardness": "Marker: hardness",
  "tools.marker.smoothing": "Marker: smoothing",
  "tools.airbrush.size": "Airbrush: size",
  "tools.airbrush.opacity": "Airbrush: opacity",
  "tools.airbrush.hardness": "Airbrush: spray softness",
  "tools.airbrush.smoothing": "Airbrush: smoothing",
  "tools.glowBrush.size": "Glow Brush: size",
  "tools.glowBrush.opacity": "Glow Brush: glow strength",
  "tools.glowBrush.hardness": "Glow Brush: softness",
  "tools.glowBrush.glow": "Glow Brush: glow level",
  "tools.eraser.size": "Eraser: size",
  "tools.eraser.opacity": "Eraser: opacity",
  "tools.eraser.hardness": "Eraser: hardness",
  "tools.blur.size": "Blur: size",
  "tools.blur.opacity": "Blur: strength",
  "tools.blur.hardness": "Blur: edge hardness",
  "tools.dodge.size": "Dodge: size",
  "tools.dodge.opacity": "Dodge: strength",
  "tools.dodge.hardness": "Dodge: hardness",
  "tools.burn.size": "Burn: size",
  "tools.burn.opacity": "Burn: strength",
  "tools.burn.hardness": "Burn: hardness",
  "tools.bucket.tolerance": "Bucket: color tolerance",
  "tools.bucket.grow": "Bucket: expand",
  "tools.bucket.gapClosing": "Bucket: gap closing",
  "tools.bucket.antiAliasing": "Bucket: anti-aliasing",
  "tools.bucket.contiguous": "Bucket: contiguous",
  "tools.bucket.sampleAllLayers": "Bucket: sample all layers",
  "tools.shapes.width": "Shapes: outline width",
  "tools.shapes.polygonSides": "Polygon: number of sides",
  "tools.shapes.stroke": "Shapes: outline color",
  "tools.shapes.fill": "Shapes: fill color",
  "tools.shapes.fillEnabled": "Shapes: enable fill",
  "tools.gradient.type": "Gradient: type",
  "tools.eyedropper.sample": "Eyedropper: sample mode",
  "tools.eyedropper.radius": "Eyedropper: sample radius",
  "canvas.workspace": "Workspace color",
  "canvas.showChecker": "Transparency checkerboard",
  "canvas.checkerSize": "Checkerboard cell size",
  "canvas.checkerLight": "Checkerboard light color",
  "canvas.checkerDark": "Checkerboard dark color",
  "canvas.showGrid": "Show grid",
  "canvas.gridSize": "Grid cell size",
  "canvas.showGuides": "Show guides",
  "canvas.showBorder": "Show canvas boundary",
  "canvas.snapToGrid": "Snap tools to grid",
  "canvas.centerOnOpen": "Center canvas when opened",
  "canvas.defaultZoom": "Default zoom",
  "canvas.wheelZoom": "Zoom with mouse wheel",
  "layers.defaultName": "New layer name",
  "layers.opacity": "New layer opacity",
  "layers.confirmDelete": "Confirm layer deletion",
  "layers.thumbnails": "Show thumbnails",
  "layers.thumbnailSize": "Thumbnail size",
  "layers.lockedColor": "Locked-layer indicator color",
  "history.maxSteps": "Maximum Undo steps",
  "history.maxMemoryMB": "History memory limit",
  "history.persistSession": "Save history for this session",
  "performance.smoothingQuality": "Canvas smoothing quality",
  "performance.optimizeLargeCanvases": "Optimize large canvases",
  "performance.backgroundOperations": "Background operations per frame",
  "workspace.leftVisible": "Show tools panel",
  "workspace.rightVisible": "Show right panel",
  "workspace.topVisible": "Show top panel",
  "workspace.leftWidth": "Left panel width",
  "workspace.rightWidth": "Right panel width"
};

export const ENGLISH_UI_TEXT = {
  "Файл": "File", "Правка": "Edit", "Вид": "View", "Слой": "Layer",
  "Новый документ": "New document", "Открыть изображение": "Open image", "Открыть проект .ishp": "Open .ishp project",
  "Сохранить проект": "Save project", "Экспорт": "Export", "Отменить": "Undo", "Повторить": "Redo",
  "Очистить слой": "Clear layer", "Вписать холст": "Fit canvas", "Центрировать": "Center canvas",
  "Увеличить": "Zoom in", "Уменьшить": "Zoom out", "Дублировать": "Duplicate",
  "Объединить вниз": "Merge down", "Удалить слой": "Delete layer", "Свойства": "Properties",
  "Слои": "Layers", "Инструмент": "Tool", "Размер": "Size", "Прозрачность": "Opacity",
  "Жёсткость": "Hardness", "Сглаживание": "Smoothing", "Цвет": "Color",
  "Пиксельная кисть": "Pixel Brush", "Маркер": "Marker", "Аэрограф": "Airbrush",
  "Светящаяся кисть": "Glow Brush", "Размытие": "Blur", "Осветлитель": "Dodge", "Затемнитель": "Burn",
  "Вписать": "Fit", "Новый слой": "New layer", "Поменять цвета": "Swap colors",
  "Передний план": "Foreground", "Фон": "Background", "Создать": "Create", "Отмена": "Cancel",
  "Качество": "Quality", "Формат": "Format", "Ширина": "Width", "Высота": "Height",
  "Тема": "Theme", "Настройки ImageShop": "ImageShop Settings",
  "Заливка": "Bucket", "Допуск цвета": "Color tolerance", "Расширение": "Expand",
  "Закрытие разрывов": "Gap closing", "Сглаживание краёв": "Anti-aliasing",
  "Только связанная область": "Contiguous", "Учитывать все видимые слои": "Sample all visible layers",
  "Параметры применяются и сохраняются автоматически": "Settings are applied and saved automatically",
  "Поиск настроек…": "Search settings…", "Сбросить все настройки": "Reset all settings",
  "Сохранение выполняется автоматически": "Changes are saved automatically",
  "Сбросить расположение панелей": "Reset panel layout", "Настройки не найдены": "No settings found",
  "Добро пожаловать в ImageShop": "Welcome to ImageShop",
  "Создайте новый документ или откройте изображение, чтобы начать работу.": "Create a new document or open an image to get started.",
  "Открыть изображение": "Open image", "Продолжить": "Continue",
  "Русский": "Russian", "English": "Английский", "Тёмная": "Dark", "Светлая": "Light",
  "Быстро": "Fast", "Сбалансировано": "Balanced", "Высокое качество": "High quality",
  "Выкл.": "Off", "Низкая": "Low", "Средняя": "Medium", "Высокая": "High",
  "Один пиксель": "Single pixel", "Усреднённая область": "Average area",
  "Маленький": "Small", "Средний": "Medium", "Большой": "Large",
  "Показывать миниатюры": "Show thumbnails",
  "Язык интерфейса": "Interface language",
  "Общие": "General", "Инструменты": "Tools", "Холст": "Canvas",
  "История": "History", "Горячие клавиши": "Keyboard shortcuts",
  "Производительность": "Performance", "Рабочее пространство": "Workspace",
  "Результаты поиска": "Search results", "Сбросить": "Reset", "Свечение": "Glow",
  "Градиент": "Gradient", "Тип": "Type", "Линейный": "Linear", "Радиальный": "Radial",
  "Нажмите на комбинацию и введите новую. Повторяющиеся сочетания будут отмечены и отклонены.": "Click a shortcut and press a new combination. Conflicts are shown and rejected."
};

export const LOCALE_UI_TEXT = {
  es: {
    "Файл": "Archivo", "Правка": "Editar", "Вид": "Ver", "Слой": "Capa",
    "Новый документ": "Nuevo documento", "Открыть изображение": "Abrir imagen", "Открыть проект .ishp": "Abrir proyecto .ishp",
    "Сохранить проект": "Guardar proyecto", "Экспорт": "Exportar", "Отменить": "Deshacer", "Повторить": "Rehacer",
    "Очистить слой": "Limpiar capa", "Вписать холст": "Ajustar lienzo", "Центрировать": "Centrar lienzo",
    "Увеличить": "Acercar", "Уменьшить": "Alejar", "Дублировать": "Duplicar",
    "Объединить вниз": "Combinar hacia abajo", "Удалить слой": "Eliminar capa", "Свойства": "Propiedades",
    "Слои": "Capas", "Инструмент": "Herramienta", "Размер": "Tamaño", "Прозрачность": "Opacidad",
    "Жёсткость": "Dureza", "Сглаживание": "Suavizado", "Цвет": "Color",
    "Пиксельная кисть": "Pincel de píxeles", "Маркер": "Marcador", "Аэрограф": "Aerógrafo",
    "Светящаяся кисть": "Pincel luminoso", "Размытие": "Desenfoque", "Осветлитель": "Sobreexponer", "Затемнитель": "Subexponer",
    "Вписать": "Ajustar", "Новый слой": "Nueva capa", "Поменять цвета": "Intercambiar colores",
    "Передний план": "Primer plano", "Фон": "Fondo", "Создать": "Crear", "Отмена": "Cancelar",
    "Качество": "Calidad", "Формат": "Formato", "Ширина": "Ancho", "Высота": "Alto",
    "Тема": "Tema", "Настройки ImageShop": "Ajustes de ImageShop",
    "Заливка": "Relleno", "Допуск цвета": "Tolerancia de color", "Расширение": "Expandir",
    "Закрытие разрывов": "Cerrar huecos", "Сглаживание краёв": "Suavizado de bordes",
    "Только связанная область": "Solo área contigua", "Учитывать все видимые слои": "Muestrear todas las capas visibles",
    "Параметры применяются и сохраняются автоматически": "Los ajustes se aplican y guardan automáticamente",
    "Поиск настроек…": "Buscar ajustes…", "Сбросить все настройки": "Restablecer todos los ajustes",
    "Сохранение выполняется автоматически": "Los cambios se guardan automáticamente",
    "Сбросить расположение панелей": "Restablecer diseño de paneles", "Настройки не найдены": "No se encontraron ajustes",
    "Добро пожаловать в ImageShop": "Te damos la bienvenida a ImageShop",
    "Создайте новый документ или откройте изображение, чтобы начать работу.": "Crea un documento nuevo o abre una imagen para empezar.",
    "Продолжить": "Continuar", "Русский": "Ruso", "English": "Inglés",
    "Español": "Español", "Deutsch": "Alemán", "Беларуская": "Bielorruso",
    "Тёмная": "Oscuro", "Светлая": "Claro", "Быстро": "Rápido", "Сбалансировано": "Equilibrado",
    "Высокое качество": "Alta calidad", "Выкл.": "Desactivado", "Низкая": "Baja",
    "Средняя": "Media", "Высокая": "Alta", "Один пиксель": "Un píxel",
    "Усреднённая область": "Área promedio", "Маленький": "Pequeño", "Средний": "Mediano",
    "Большой": "Grande", "Показывать миниатюры": "Mostrar miniaturas",
    "Язык интерфейса": "Idioma de la interfaz", "Общие": "General", "Инструменты": "Herramientas",
    "Холст": "Lienzo", "История": "Historial", "Горячие клавиши": "Atajos de teclado",
    "Производительность": "Rendimiento", "Рабочее пространство": "Espacio de trabajo",
    "Тема": "Tema", "Масштаб интерфейса": "Escala de la interfaz", "Размер текста": "Tamaño del texto",
    "Автоматическое сохранение": "Guardado automático", "Интервал автосохранения": "Intervalo de guardado automático",
    "Подтверждать удаление слоёв": "Confirmar la eliminación de capas",
    "Подтверждать закрытие несохранённого документа": "Confirmar el cierre de documentos sin guardar",
    "Восстанавливать последнюю сессию": "Restaurar la última sesión", "Показывать приветственный экран": "Mostrar pantalla de bienvenida",
    "Результаты поиска": "Resultados de búsqueda", "Сбросить": "Restablecer",
    "Нажмите на комбинацию и введите новую. Повторяющиеся сочетания будут отмечены и отклонены.": "Haz clic en un atajo y pulsa una combinación nueva. Los conflictos se mostrarán y se rechazarán.",
    "Свечение": "Resplandor", "Градиент": "Degradado", "Тип": "Tipo", "Линейный": "Lineal", "Радиальный": "Radial",
    "Градиент: тип": "Degradado: tipo"
  },
  de: {
    "Файл": "Datei", "Правка": "Bearbeiten", "Вид": "Ansicht", "Слой": "Ebene",
    "Новый документ": "Neues Dokument", "Открыть изображение": "Bild öffnen", "Открыть проект .ishp": ".ishp-Projekt öffnen",
    "Сохранить проект": "Projekt speichern", "Экспорт": "Exportieren", "Отменить": "Rückgängig", "Повторить": "Wiederholen",
    "Очистить слой": "Ebene leeren", "Вписать холст": "Leinwand einpassen", "Центрировать": "Leinwand zentrieren",
    "Увеличить": "Vergrößern", "Уменьшить": "Verkleinern", "Дублировать": "Duplizieren",
    "Объединить вниз": "Mit darunterliegender Ebene verbinden", "Удалить слой": "Ebene löschen", "Свойства": "Eigenschaften",
    "Слои": "Ebenen", "Инструмент": "Werkzeug", "Размер": "Größe", "Прозрачность": "Deckkraft",
    "Жёсткость": "Härte", "Сглаживание": "Glättung", "Цвет": "Farbe",
    "Пиксельная кисть": "Pixelpinsel", "Маркер": "Marker", "Аэрограф": "Airbrush",
    "Светящаяся кисть": "Leuchtpinsel", "Размытие": "Weichzeichnen", "Осветлитель": "Abwedler", "Затемнитель": "Nachbelichter",
    "Вписать": "Einpassen", "Новый слой": "Neue Ebene", "Поменять цвета": "Farben tauschen",
    "Передний план": "Vordergrund", "Фон": "Hintergrund", "Создать": "Erstellen", "Отмена": "Abbrechen",
    "Качество": "Qualität", "Формат": "Format", "Ширина": "Breite", "Высота": "Höhe",
    "Тема": "Design", "Настройки ImageShop": "ImageShop-Einstellungen",
    "Заливка": "Füllen", "Допуск цвета": "Farbtoleranz", "Расширение": "Erweitern",
    "Закрытие разрывов": "Lücken schließen", "Сглаживание краёв": "Kantenglättung",
    "Только связанная область": "Nur zusammenhängende Bereiche", "Учитывать все видимые слои": "Alle sichtbaren Ebenen berücksichtigen",
    "Параметры применяются и сохраняются автоматически": "Einstellungen werden automatisch angewendet und gespeichert",
    "Поиск настроек…": "Einstellungen suchen…", "Сбросить все настройки": "Alle Einstellungen zurücksetzen",
    "Сохранение выполняется автоматически": "Änderungen werden automatisch gespeichert",
    "Сбросить расположение панелей": "Panelanordnung zurücksetzen", "Настройки не найдены": "Keine Einstellungen gefunden",
    "Добро пожаловать в ImageShop": "Willkommen bei ImageShop",
    "Создайте новый документ или откройте изображение, чтобы начать работу.": "Erstelle ein neues Dokument oder öffne ein Bild, um loszulegen.",
    "Продолжить": "Weiter", "Русский": "Russisch", "English": "Englisch",
    "Español": "Spanisch", "Deutsch": "Deutsch", "Беларуская": "Belarussisch",
    "Тёмная": "Dunkel", "Светлая": "Hell", "Быстро": "Schnell", "Сбалансировано": "Ausgewogen",
    "Высокое качество": "Hohe Qualität", "Выкл.": "Aus", "Низкая": "Niedrig",
    "Средняя": "Mittel", "Высокая": "Hoch", "Один пиксель": "Einzelner Pixel",
    "Усреднённая область": "Durchschnittlicher Bereich", "Маленький": "Klein", "Средний": "Mittel",
    "Большой": "Groß", "Показывать миниатюры": "Miniaturansichten anzeigen",
    "Язык интерфейса": "Oberflächensprache", "Общие": "Allgemein", "Инструменты": "Werkzeuge",
    "Холст": "Leinwand", "История": "Verlauf", "Горячие клавиши": "Tastenkürzel",
    "Производительность": "Leistung", "Рабочее пространство": "Arbeitsbereich",
    "Тема": "Design", "Масштаб интерфейса": "Oberflächenmaßstab", "Размер текста": "Textgröße",
    "Автоматическое сохранение": "Automatisches Speichern", "Интервал автосохранения": "Autospeicherintervall",
    "Подтверждать удаление слоёв": "Löschen von Ebenen bestätigen",
    "Подтверждать закрытие несохранённого документа": "Schließen ungespeicherter Dokumente bestätigen",
    "Восстанавливать последнюю сессию": "Letzte Sitzung wiederherstellen", "Показывать приветственный экран": "Willkommensbildschirm anzeigen",
    "Результаты поиска": "Suchergebnisse", "Сбросить": "Zurücksetzen",
    "Нажмите на комбинацию и введите новую. Повторяющиеся сочетания будут отмечены и отклонены.": "Klicke auf ein Kürzel und drücke eine neue Tastenkombination. Konflikte werden angezeigt und abgelehnt.",
    "Свечение": "Leuchten", "Градиент": "Verlauf", "Тип": "Typ", "Линейный": "Linear", "Радиальный": "Radial",
    "Градиент: тип": "Verlauf: Typ"
  },
  be: {
    "Файл": "Файл", "Правка": "Праўка", "Вид": "Выгляд", "Слой": "Слой",
    "Новый документ": "Новы дакумент", "Открыть изображение": "Адкрыць выяву", "Открыть проект .ishp": "Адкрыць праект .ishp",
    "Сохранить проект": "Захаваць праект", "Экспорт": "Экспарт", "Отменить": "Адмяніць", "Повторить": "Паўтарыць",
    "Очистить слой": "Ачысціць слой", "Вписать холст": "Умясціць палатно", "Центрировать": "Цэнтраваць палатно",
    "Увеличить": "Павялічыць", "Уменьшить": "Паменшыць", "Дублировать": "Дубляваць",
    "Объединить вниз": "Аб'яднаць з ніжнім", "Удалить слой": "Выдаліць слой", "Свойства": "Уласцівасці",
    "Слои": "Слаі", "Инструмент": "Інструмент", "Размер": "Памер", "Прозрачность": "Непразрыстасць",
    "Жёсткость": "Цвёрдасць", "Сглаживание": "Згладжванне", "Цвет": "Колер",
    "Пиксельная кисть": "Піксельны пэндзаль", "Маркер": "Маркер", "Аэрограф": "Аэраграф",
    "Светящаяся кисть": "Святлівы пэндзаль", "Размытие": "Размыццё", "Осветлитель": "Асвятляльнік", "Затемнитель": "Зацямняльнік",
    "Вписать": "Умясціць", "Новый слой": "Новы слой", "Поменять цвета": "Памяняць колеры",
    "Передний план": "Пярэдні план", "Фон": "Фон", "Создать": "Стварыць", "Отмена": "Скасаваць",
    "Качество": "Якасць", "Формат": "Фармат", "Ширина": "Шырыня", "Высота": "Вышыня",
    "Тема": "Тэма", "Настройки ImageShop": "Налады ImageShop",
    "Заливка": "Заліванне", "Допуск цвета": "Дапуск колеру", "Расширение": "Пашырэнне",
    "Закрытие разрывов": "Закрыццё разрываў", "Сглаживание краёв": "Згладжванне краёў",
    "Только связанная область": "Толькі звязаная вобласць", "Учитывать все видимые слои": "Улічваць усе бачныя слаі",
    "Параметры применяются и сохраняются автоматически": "Налады прымяняюцца і захоўваюцца аўтаматычна",
    "Поиск настроек…": "Пошук налад…", "Сбросить все настройки": "Скінуць усе налады",
    "Сохранение выполняется автоматически": "Змены захоўваюцца аўтаматычна",
    "Сбросить расположение панелей": "Скінуць размяшчэнне панэляў", "Настройки не найдены": "Налады не знойдзены",
    "Добро пожаловать в ImageShop": "Вітаем у ImageShop",
    "Создайте новый документ или откройте изображение, чтобы начать работу.": "Стварыце новы дакумент або адкрыйце выяву, каб пачаць працу.",
    "Продолжить": "Працягнуць", "Русский": "Руская", "English": "Англійская",
    "Español": "Іспанская", "Deutsch": "Нямецкая", "Беларуская": "Беларуская",
    "Тёмная": "Цёмная", "Светлая": "Светлая", "Быстро": "Хутка", "Сбалансировано": "Збалансавана",
    "Высокое качество": "Высокая якасць", "Выкл.": "Выкл.", "Низкая": "Нізкая",
    "Средняя": "Сярэдняя", "Высокая": "Высокая", "Один пиксель": "Адзін піксель",
    "Усреднённая область": "Сярэдняя вобласць", "Маленький": "Малы", "Средний": "Сярэдні",
    "Большой": "Вялікі", "Показывать миниатюры": "Паказваць мініяцюры",
    "Язык интерфейса": "Мова інтэрфейсу", "Общие": "Агульныя", "Инструменты": "Інструменты",
    "Холст": "Палатно", "История": "Гісторыя", "Горячие клавиши": "Гарачыя клавішы",
    "Производительность": "Прадукцыйнасць", "Рабочее пространство": "Працоўная прастора",
    "Тема": "Тэма", "Масштаб интерфейса": "Маштаб інтэрфейсу", "Размер текста": "Памер тэксту",
    "Автоматическое сохранение": "Аўтаматычнае захаванне", "Интервал автосохранения": "Інтэрвал аўтазахавання",
    "Подтверждать удаление слоёв": "Пацвярджаць выдаленне слаёў",
    "Подтверждать закрытие несохранённого документа": "Пацвярджаць закрыццё незахаванага дакумента",
    "Восстанавливать последнюю сессию": "Аднаўляць апошні сеанс", "Показывать приветственный экран": "Паказваць экран прывітання",
    "Результаты поиска": "Вынікі пошуку", "Сбросить": "Скінуць",
    "Нажмите на комбинацию и введите новую. Повторяющиеся сочетания будут отмечены и отклонены.": "Націсніце спалучэнне клавіш і ўвядзіце новае. Канфлікты будуць паказаны і адхілены.",
    "Свечение": "Свячэнне", "Градиент": "Градыент", "Тип": "Тып", "Линейный": "Лінейны", "Радиальный": "Радыяльны",
    "Градиент: тип": "Градыент: тып"
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function writePath(object, path, value) {
  const keys = path.split(".");
  const finalKey = keys.pop();
  const target = keys.reduce((node, key) => node[key], object);
  target[finalKey] = value;
}

export class SettingsManager {
  constructor(editor) {
    this.editor = editor;
    this.values = clone(DEFAULT_SETTINGS);
    this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      this.values = this.mergeAndValidate(this.values, saved);
      const confirmDelete = Boolean(this.values.general.confirmDelete && this.values.layers.confirmDelete);
      this.values.general.confirmDelete = confirmDelete;
      this.values.layers.confirmDelete = confirmDelete;
    } catch (error) {
      console.warn("ImageShop settings could not be loaded", error);
    }
  }

  mergeAndValidate(base, saved, prefix = "") {
    for (const [key, defaultValue] of Object.entries(base)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = saved?.[key];
      if (defaultValue && typeof defaultValue === "object" && !Array.isArray(defaultValue)) {
        base[key] = this.mergeAndValidate(defaultValue, value, path);
      } else if (typeof value === typeof defaultValue && this.isValid(path, value)) {
        base[key] = value;
      }
    }
    return base;
  }

  isValid(path, value) {
    if (path.startsWith("shortcuts.")) return typeof value === "string" && /^(?:(?:ctrl|alt|shift)\+){0,3}[a-z0-9=+\-;,./ ]{1,20}$/i.test(value);
    const field = Object.values(SETTING_FIELDS).flat().find(item => item.path === path);
    if (field?.type === "color") return /^#[0-9a-f]{6}$/i.test(value);
    if (field?.type === "select") return field.options.some(([option]) => String(option) === String(value));
    if (field?.type === "number" || field?.type === "range") {
      return Number.isFinite(value) && value >= field.min && value <= field.max;
    }
    if (path === "layers.defaultName") return typeof value === "string" && value.trim().length > 0 && value.length <= 60;
    return true;
  }

  get(path) {
    return readPath(this.values, path);
  }

  set(path, rawValue) {
    const field = Object.values(SETTING_FIELDS).flat().find(item => item.path === path);
    let value = rawValue;
    if (field?.type === "number" || field?.type === "range") value = Number(rawValue);
    if (field?.type === "select" && (path === "layers.thumbnailSize")) value = Number(rawValue);
    if (!this.isValid(path, value)) return false;
    writePath(this.values, path, value);
    if (path === "general.confirmDelete") this.values.layers.confirmDelete = value;
    if (path === "layers.confirmDelete") this.values.general.confirmDelete = value;
    if (path.startsWith("shortcuts.")) {
      const conflict = Object.entries(this.values.shortcuts).some(([key, shortcut]) => key !== path.slice("shortcuts.".length) && shortcut === value);
      if (conflict) return false;
    }
    this.save();
    this.apply();
    return true;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch (error) {
      this.editor.ui?.notify("Не удалось сохранить настройки в браузере");
      console.error("ImageShop settings could not be saved", error);
    }
  }

  reset() {
    this.values = clone(DEFAULT_SETTINGS);
    this.save();
    this.apply();
    this.editor.foreground = this.values.tools.brush.color;
    this.editor.background = this.values.tools.gradient.background;
    this.editor.colorGradientEnabled = this.values.tools.colorGradient.enabled;
    this.editor.colorGradientStart = this.values.tools.colorGradient.start;
    this.editor.colorGradientEnd = this.values.tools.colorGradient.end;
    this.editor.updateColorControls();
  }

  apply() {
    const s = this.values;
    const root = document.documentElement;
    const body = document.body;
    root.style.setProperty("--ui-scale", s.general.uiScale / 100);
    root.style.setProperty("--text-scale", s.general.textScale / 100);
    body.dataset.theme = s.general.theme;
    body.dataset.language = s.general.language;
    document.documentElement.lang = s.general.language;
    this.applyLanguage(s.general.language);

    const workspace = document.querySelector("#stageWrap");
    if (workspace) {
      const defaultWorkspace = DEFAULT_SETTINGS.canvas.workspace;
      workspace.style.background = s.general.theme === "light" && s.canvas.workspace === defaultWorkspace
        ? "#e1e6ee"
        : s.canvas.workspace;
    }
    const shell = document.querySelector("#canvasShell");
    if (shell) {
      const size = s.canvas.checkerSize;
      shell.style.backgroundColor = s.canvas.showChecker ? s.canvas.checkerLight : s.canvas.workspace;
      const images = [];
      if (s.canvas.showChecker) {
        images.push(
          `linear-gradient(45deg,${s.canvas.checkerDark} 25%,transparent 25%)`,
          `linear-gradient(-45deg,${s.canvas.checkerDark} 25%,transparent 25%)`,
          `linear-gradient(45deg,transparent 75%,${s.canvas.checkerDark} 75%)`,
          `linear-gradient(-45deg,transparent 75%,${s.canvas.checkerDark} 75%)`
        );
        shell.style.backgroundPosition = `0 0,0 ${size / 2}px,${size / 2}px -${size / 2}px,-${size / 2}px 0`;
        shell.style.backgroundSize = `${size}px ${size}px`;
      }
      if (s.canvas.showGrid) {
        const gridColor = "rgba(80, 145, 230, .32)";
        images.push(`linear-gradient(to right,${gridColor} 1px,transparent 1px)`, `linear-gradient(to bottom,${gridColor} 1px,transparent 1px)`);
        shell.style.backgroundSize = s.canvas.showChecker
          ? `${size}px ${size}px,${size}px ${size}px,${size}px ${size}px,${size}px ${size}px,${s.canvas.gridSize}px ${s.canvas.gridSize}px,${s.canvas.gridSize}px ${s.canvas.gridSize}px`
          : `${s.canvas.gridSize}px ${s.canvas.gridSize}px`;
      }
      shell.style.backgroundImage = images.length ? images.join(",") : "none";
      if (s.canvas.showChecker && !s.canvas.showGrid) shell.style.backgroundSize = `${size}px ${size}px`;
      shell.classList.toggle("show-guides", s.canvas.showGuides);
      shell.classList.toggle("hide-canvas-border", !s.canvas.showBorder);
      shell.style.setProperty("--checker-size", `${size}px`);
    }

    const app = document.querySelector("#app");
    const rightPanel = document.querySelector("#rightPanel");
    if (app) {
      app.classList.toggle("hide-left-panel", !s.workspace.leftVisible);
      app.classList.toggle("hide-right-panel", !s.workspace.rightVisible);
      app.classList.toggle("hide-topbar", !s.workspace.topVisible);
      root.style.setProperty("--left-panel-width", `${s.workspace.leftWidth}px`);
      root.style.setProperty("--right-panel-width", `${s.workspace.rightWidth}px`);
    }
    if (rightPanel) rightPanel.classList.toggle("open", s.workspace.rightVisible);
    this.editor?.applyDrawingSettings();
    this.editor?.applyToolSettings();
    this.editor?.ui?.renderTools();
    this.editor?.applyViewSettings();
    this.editor?.history?.trim();
    this.editor?.ui?.renderLayers();
    document.dispatchEvent(new CustomEvent("imageshop-settings-applied"));
  }

  applyLanguage(language) {
    const sourceLanguage = this.appliedLanguage || "ru";
    const sourceTranslations = sourceLanguage === "en" ? ENGLISH_UI_TEXT : LOCALE_UI_TEXT[sourceLanguage] || {};
    const targetTranslations = language === "en" ? ENGLISH_UI_TEXT : LOCALE_UI_TEXT[language] || {};
    const sourceReverse = Object.fromEntries(Object.entries(sourceTranslations).map(([ru, translated]) => [translated, ru]));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const current = node.nodeValue;
      const trimmed = current.trim();
      const canonical = sourceLanguage === "ru" ? trimmed : sourceReverse[trimmed] || trimmed;
      const translated = language === "ru" ? canonical : targetTranslations[canonical] || canonical;
      if (translated) node.nodeValue = current.replace(trimmed, translated);
    }
    if (this.appliedLanguage !== language) {
      this.appliedLanguage = language;
      document.dispatchEvent(new CustomEvent("imageshop-language-changed", { detail: { language } }));
    }
  }

  restoreDefaults() {
    this.reset();
  }
}
