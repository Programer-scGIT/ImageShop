export class LayerManager {
  constructor(editor) { this.editor = editor; }

  make(name, width = this.editor.width, height = this.editor.height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name,
      visible: true,
      locked: false,
      opacity: this.editor.settings?.get("layers.opacity") / 100 || 1,
      mask: null,
      maskEnabled: true,
      textObject: null,
      canvas
    };
  }

  add(name = `${this.editor.settings.get("layers.defaultName")} ${this.editor.layers.length + 1}`) {
    this.editor.history.snapshot("Add layer");
    const layer = this.make(name);
    this.editor.layers.unshift(layer);
    this.editor.activeLayerId = layer.id;
    this.editor.markDirty();
    this.editor.render();
  }

  delete() {
    if (this.editor.layers.length <= 1) return this.editor.ui.notify("Нельзя удалить последний слой");
    if ((this.editor.settings.get("general.confirmDelete") || this.editor.settings.get("layers.confirmDelete")) && !confirm("Удалить активный слой?")) return;
    this.editor.history.snapshot("Delete layer");
    this.editor.layers = this.editor.layers.filter(l => l.id !== this.editor.activeLayerId);
    this.editor.activeLayerId = this.editor.layers[0].id;
    this.editor.markDirty();
    this.editor.render();
  }

  duplicate() {
    const source = this.editor.getActiveLayer();
    if (!source) return;
    this.editor.history.snapshot("Duplicate layer");
    const copy = this.make(`${source.name} копия`);
    copy.canvas.getContext("2d").drawImage(source.canvas, 0, 0);
    copy.opacity = source.opacity;
    copy.visible = source.visible;
    copy.maskEnabled = source.maskEnabled;
    if (source.mask) {
      copy.mask = document.createElement("canvas");
      copy.mask.width = this.editor.width;
      copy.mask.height = this.editor.height;
      copy.mask.getContext("2d").drawImage(source.mask, 0, 0);
    }
    copy.textObject = source.textObject ? { ...source.textObject } : null;
    const index = this.editor.layers.indexOf(source);
    this.editor.layers.splice(index, 0, copy);
    this.editor.activeLayerId = copy.id;
    this.editor.markDirty();
    this.editor.render();
  }

  move(layer, direction) {
    const index = this.editor.layers.indexOf(layer);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.editor.layers.length) return;
    this.editor.history.snapshot("Reorder layers");
    [this.editor.layers[index], this.editor.layers[nextIndex]] = [this.editor.layers[nextIndex], this.editor.layers[index]];
    this.editor.activeLayerId = layer.id;
    this.editor.markDirty();
    this.editor.render();
  }

  moveTo(layer, targetIndex) {
    const currentIndex = this.editor.layers.indexOf(layer);
    if (currentIndex < 0) return;
    const nextIndex = Math.max(0, Math.min(this.editor.layers.length - 1, targetIndex));
    if (currentIndex === nextIndex) return;
    this.editor.history.snapshot("Reorder layers");
    this.editor.layers.splice(currentIndex, 1);
    this.editor.layers.splice(nextIndex, 0, layer);
    this.editor.activeLayerId = layer.id;
    this.editor.markDirty();
    this.editor.render();
  }

  mergeDown() {
    const index = this.editor.layers.findIndex(l => l.id === this.editor.activeLayerId);
    if (index < 0 || index >= this.editor.layers.length - 1) return this.editor.ui.notify("Нет нижнего слоя");
    this.editor.history.snapshot("Merge layers");
    const upper = this.editor.layers[index];
    const lower = this.editor.layers[index + 1];
    if (upper.locked || lower.locked) return this.editor.ui.notify("Слой заблокирован");
    const ctx = lower.canvas.getContext("2d");
    ctx.globalAlpha = upper.opacity;
    ctx.drawImage(this.editor.getLayerRenderCanvas(upper), 0, 0);
    ctx.globalAlpha = 1;
    lower.name = `${lower.name} + ${upper.name}`;
    lower.textObject = null;
    this.editor.layers.splice(index, 1);
    this.editor.activeLayerId = lower.id;
    this.editor.markDirty();
    this.editor.render();
  }

  rename(layer) {
    this.editor.requestTextEntry("Переименовать слой", layer.name, name => {
      if (!name || name.trim() === "" || name.trim() === layer.name) return;
      if (!this.editor.layers.includes(layer)) return;
      this.editor.history.snapshot("Rename layer");
      layer.name = name.trim();
      this.editor.markDirty();
      this.editor.render();
    });
  }

  toggleVisible(layer) {
    this.editor.history.snapshot("Toggle layer");
    layer.visible = !layer.visible;
    this.editor.markDirty();
    this.editor.render();
  }

  toggleLocked(layer) {
    this.editor.history.snapshot("Toggle layer lock");
    layer.locked = !layer.locked;
    this.editor.markDirty();
    this.editor.render();
  }

  addMask(layer = this.editor.getActiveLayer()) {
    if (!layer) return;
    if (layer.mask) return this.toggleMaskEditing(layer);
    this.editor.history.snapshot("Add layer mask");
    layer.mask = document.createElement("canvas");
    layer.mask.width = this.editor.width;
    layer.mask.height = this.editor.height;
    const ctx = layer.mask.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, this.editor.width, this.editor.height);
    layer.maskEnabled = true;
    this.editor.editingMaskLayerId = layer.id;
    const toolName = this.editor.toolDefs.find(([id]) => id === this.editor.tool)?.[1] || this.editor.tool;
    document.querySelector("#toolStatus").textContent = `${toolName} · маска`;
    this.editor.markDirty();
    this.editor.render();
    this.editor.ui.notify("Маска добавлена. Чёрный скрывает, белый показывает");
  }

  toggleMaskEditing(layer = this.editor.getActiveLayer()) {
    if (!layer?.mask) return this.editor.ui.notify("Сначала добавьте маску слоя");
    this.editor.editingMaskLayerId = this.editor.editingMaskLayerId === layer.id ? null : layer.id;
    this.editor.render();
    const toolName = this.editor.toolDefs.find(([id]) => id === this.editor.tool)?.[1] || this.editor.tool;
    document.querySelector("#toolStatus").textContent = this.editor.editingMaskLayerId
      ? `${toolName} · маска`
      : toolName;
    this.editor.ui.notify(this.editor.editingMaskLayerId ? "Редактируется маска слоя" : "Редактируется содержимое слоя");
  }

  toggleMaskEnabled(layer = this.editor.getActiveLayer()) {
    if (!layer?.mask) return this.editor.ui.notify("У активного слоя нет маски");
    this.editor.history.snapshot("Toggle layer mask");
    layer.maskEnabled = !layer.maskEnabled;
    this.editor.markDirty();
    this.editor.render();
  }

  removeMask(layer = this.editor.getActiveLayer()) {
    if (!layer?.mask) return this.editor.ui.notify("У активного слоя нет маски");
    this.editor.history.snapshot("Remove layer mask");
    layer.mask = null;
    layer.maskEnabled = true;
    if (this.editor.editingMaskLayerId === layer.id) this.editor.editingMaskLayerId = null;
    this.editor.markDirty();
    this.editor.render();
  }
}
