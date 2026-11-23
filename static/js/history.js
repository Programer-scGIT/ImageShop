export class History {
  constructor(editor) {
    this.editor = editor;
    this.undoStack = [];
    this.redoStack = [];
  }

  snapshot(label = "Change") {
    const state = this.capture();
    state.label = label;
    this.undoStack.push(state);
    this.redoStack = [];
    this.trim();
    this.persist();
  }

  trim() {
    const settings = this.editor.settings?.values.history;
    const maxSteps = settings?.maxSteps ?? 30;
    const maxBytes = (settings?.maxMemoryMB ?? 256) * 1024 * 1024;
    const estimateBytes = state => state.width * state.height * 4 * Math.max(1, state.layers.length);
    let bytes = this.undoStack.reduce((total, state) => total + estimateBytes(state), 0);
    while (this.undoStack.length > maxSteps || (this.undoStack.length && bytes > maxBytes)) {
      bytes -= estimateBytes(this.undoStack.shift());
    }
    if (this.redoStack.length > maxSteps) this.redoStack.splice(0, this.redoStack.length - maxSteps);
    while (this.redoStack.length && this.redoStack.reduce((total, state) => total + estimateBytes(state), 0) > maxBytes) this.redoStack.shift();
  }

  persist() {
    if (!this.editor.settings?.get("history.persistSession")) return;
    try {
      sessionStorage.setItem("imageshop.history.v1", JSON.stringify({ undo: this.undoStack, redo: this.redoStack }));
    } catch (error) {
      this.editor.ui.notify("Не удалось сохранить историю сессии: недостаточно места");
      console.error("ImageShop history persistence failed", error);
    }
  }

  loadPersisted() {
    if (!this.editor.settings.get("history.persistSession")) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem("imageshop.history.v1") || "null");
      if (!saved || !Array.isArray(saved.undo) || !Array.isArray(saved.redo)) return;
      this.undoStack = saved.undo;
      this.redoStack = saved.redo;
      this.trim();
    } catch (error) {
      this.editor.ui.notify("Сохранённая история повреждена и была проигнорирована");
      console.error("ImageShop history restore failed", error);
    }
  }

  async undo() {
    if (!this.undoStack.length) return this.editor.ui.notify("Нет действий для отмены");
    const current = this.capture();
    const state = this.undoStack.pop();
    this.redoStack.push(current);
    this.trim();
    await this.restore(state);
    this.persist();
    this.editor.dirty = true;
  }

  async redo() {
    if (!this.redoStack.length) return this.editor.ui.notify("Нет действий для повтора");
    const current = this.capture();
    const state = this.redoStack.pop();
    this.undoStack.push(current);
    this.trim();
    await this.restore(state);
    this.persist();
    this.editor.dirty = true;
  }

  capture() {
    const state = {
      width: this.editor.width,
      height: this.editor.height,
      dpi: this.editor.dpi,
      activeId: this.editor.activeLayerId,
      layers: this.editor.layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        maskEnabled: layer.maskEnabled,
        maskData: layer.mask?.toDataURL("image/png") || null,
        textObject: layer.textObject ? { ...layer.textObject } : null,
        data: layer.canvas.toDataURL()
      }))
    };
    return state;
  }

  async restore(state) {
    this.editor.width = state.width;
    this.editor.height = state.height;
    this.editor.dpi = state.dpi;
    await this.editor.setDocumentSize(state.width, state.height, false);
    this.editor.layers = [];
    for (const saved of state.layers) {
      const canvas = document.createElement("canvas");
      canvas.width = state.width;
      canvas.height = state.height;
      const layer = { id: saved.id, name: saved.name, visible: saved.visible, locked: saved.locked, opacity: saved.opacity, maskEnabled: saved.maskEnabled ?? true, mask: null, textObject: saved.textObject || null, canvas };
      await new Promise(resolve => {
        const image = new Image();
        image.onload = () => { canvas.getContext("2d").drawImage(image, 0, 0); resolve(); };
        image.src = saved.data;
      });
      if (saved.maskData) {
        layer.mask = document.createElement("canvas");
        layer.mask.width = state.width;
        layer.mask.height = state.height;
        await new Promise(resolve => {
          const image = new Image();
          image.onload = () => { layer.mask.getContext("2d").drawImage(image, 0, 0); resolve(); };
          image.onerror = resolve;
          image.src = saved.maskData;
        });
      }
      this.editor.layers.push(layer);
    }
    this.editor.activeLayerId = state.activeId;
    this.editor.selection = null;
    this.editor.selectionGesture = null;
    this.editor.render();
  }
}
