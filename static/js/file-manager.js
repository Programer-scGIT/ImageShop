export class FileManager {
  constructor(editor) { this.editor = editor; }

  openImage(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      this.editor.history.snapshot("Import image");
      if (this.editor.layers.length === 0) this.editor.setDocumentSize(image.naturalWidth, image.naturalHeight);
      const layer = this.editor.layersManager.make(file.name.replace(/\.[^.]+$/, "") || "Изображение");
      layer.canvas.getContext("2d").drawImage(image, 0, 0, this.editor.width, this.editor.height);
      this.editor.layers.unshift(layer);
      this.editor.activeLayerId = layer.id;
      this.editor.markDirty();
      URL.revokeObjectURL(url);
      this.editor.render();
      this.editor.requestCenter();
      this.editor.ui.notify("Изображение импортировано");
    };
    image.src = url;
  }

  exportImage(format = "png", quality = 0.92) {
    const canvas = this.editor.buildFlatCanvas();
    if (format === "jpeg") {
      const output = document.createElement("canvas");
      output.width = canvas.width;
      output.height = canvas.height;
      const ctx = output.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, output.width, output.height);
      ctx.drawImage(canvas, 0, 0);
      this.download(output, `imageshop.${format === "jpeg" ? "jpg" : format}`, `image/${format}`, quality);
    } else {
      this.download(canvas, `imageshop.${format}`, `image/${format}`, quality);
    }
  }

  download(canvas, name, mime, quality) {
    canvas.toBlob(blob => {
      if (!blob) return this.editor.ui.notify("Не удалось экспортировать");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.editor.ui.notify(`${name} сохранён`);
    }, mime, quality);
  }

  saveProject() {
    const project = this.serializeProject();
    const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "imageshop.ishp";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.editor.dirty = false;
  }

  serializeProject() {
    return {
      format: "ImageShop Project",
      version: 1,
      width: this.editor.width,
      height: this.editor.height,
      dpi: this.editor.dpi,
      activeLayerId: this.editor.activeLayerId,
      layers: this.editor.layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        maskEnabled: layer.maskEnabled,
        maskData: layer.mask?.toDataURL("image/png") || null,
        textObject: layer.textObject ? { ...layer.textObject } : null,
        data: layer.canvas.toDataURL("image/png")
      }))
    };
  }

  async openProject(file, options = {}) {
    try {
      const project = typeof file === "string" ? JSON.parse(file) : JSON.parse(await file.text());
      if (!project.width || !project.height || !Array.isArray(project.layers)) throw new Error("Неверный формат");
      if (options.confirm !== false && this.editor.dirty && this.editor.settings.get("general.confirmClose") && !confirm("Документ изменён. Открыть другой без сохранения?")) return;
      if (options.recordHistory !== false) this.editor.history.snapshot("Open project");
      this.editor.width = project.width;
      this.editor.height = project.height;
      this.editor.dpi = project.dpi || 72;
      await this.editor.setDocumentSize(project.width, project.height, false);
      this.editor.layers = [];
      for (const saved of project.layers) {
        const canvas = document.createElement("canvas");
        canvas.width = project.width;
        canvas.height = project.height;
        await new Promise(resolve => {
          const image = new Image();
          image.onload = () => { canvas.getContext("2d").drawImage(image, 0, 0); resolve(); };
          image.onerror = resolve;
          image.src = saved.data;
        });
        const layer = { id: saved.id, name: saved.name, visible: saved.visible, locked: saved.locked, opacity: saved.opacity ?? 1, maskEnabled: saved.maskEnabled ?? true, mask: null, textObject: saved.textObject || null, canvas };
        if (saved.maskData) {
          layer.mask = document.createElement("canvas");
          layer.mask.width = project.width;
          layer.mask.height = project.height;
          await new Promise(resolve => {
            const image = new Image();
            image.onload = () => { layer.mask.getContext("2d").drawImage(image, 0, 0); resolve(); };
            image.onerror = resolve;
            image.src = saved.maskData;
          });
        }
        this.editor.layers.push(layer);
      }
      this.editor.activeLayerId = project.activeLayerId && this.editor.layers.some(l => l.id === project.activeLayerId) ? project.activeLayerId : this.editor.layers[0]?.id;
      this.editor.dirty = false;
      this.editor.render();
      this.editor.requestCenter();
      if (options.restoreSession) this.editor.history.loadPersisted();
      this.editor.ui.notify("Проект открыт");
    } catch {
      this.editor.ui.notify("Не удалось открыть проект");
    }
  }

  restoreLastSession() {
    const saved = this.editor.settings.get("general.autoSave")
      ? localStorage.getItem("imageshop.autosave.v1") || localStorage.getItem("imageshop.lastSession.v1")
      : localStorage.getItem("imageshop.lastSession.v1");
    if (!saved) {
      if (this.editor.settings.get("general.welcomeScreen")) document.querySelector("#welcomeDialog").showModal();
      return;
    }
    this.openProject(saved, { confirm: false, recordHistory: false, restoreSession: true });
  }
}
