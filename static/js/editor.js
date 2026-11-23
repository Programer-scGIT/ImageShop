import { TOOL_DEFINITIONS } from "./tools.js";
import { LayerManager } from "./layers.js";
import { History } from "./history.js";
import { FileManager } from "./file-manager.js";
import { UI } from "./ui.js";
import { SettingsManager } from "./settings.js";
import { SettingsUI } from "./settings-ui.js";
import { TextEditor } from "./text-editor.js";

export class Editor {
  constructor() {
    this.width = 1200;
    this.height = 800;
    this.dpi = 72;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.tool = "brush";
    this.foreground = "#5b9cf5";
    this.background = "#ffffff";
    this.colorTarget = "foreground";
    this.colorGradientEnabled = false;
    this.colorGradientStart = "#5b9cf5";
    this.colorGradientEnd = "#ffffff";
    this.colorGradientStroke = null;
    this.toolDefs = TOOL_DEFINITIONS;
    this.strokeTools = ["brush", "pencil", "pixelBrush", "marker", "airbrush", "glowBrush", "eraser", "blur", "dodge", "burn"];
    this.activeLayerId = null;
    this.layers = [];
    this.isDrawing = false;
    this.draggingView = false;
    this.lastPoint = null;
    this.shapeStart = null;
    this.cropRect = null;
    this.selection = null;
    this.selectionGesture = null;
    this.editingMaskLayerId = null;
    this.ui = new UI(this);
    this.settings = new SettingsManager(this);
    this.history = new History(this);
    this.layersManager = new LayerManager(this);
    this.files = new FileManager(this);
    this.textEditor = new TextEditor(this);
    this.bucketWorker = null;
    this.bucketWorkerSequence = 0;
    this.bucketRequests = new Map();
    this.bucketBusy = false;
    this.dirty = false;
    this.documentCanvas = document.querySelector("#documentCanvas");
    this.overlayCanvas = document.querySelector("#overlayCanvas");
    this.brushCursor = document.querySelector("#brushCursor");
    this.stage = document.querySelector("#stage");
    this.shell = document.querySelector("#canvasShell");
    this.settingsUI = new SettingsUI(this);
    this.init();
  }

  makeGradient(ctx, from, to) {
    const type = this.settings.get("tools.gradient.type");
    let gradient;
    if (type === "radial") {
      const radius = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
      gradient = ctx.createRadialGradient(from.x, from.y, 0, from.x, from.y, radius);
    } else {
      const end = Math.hypot(to.x - from.x, to.y - from.y) < 1e-6
        ? { x: from.x + 1, y: from.y }
        : to;
      gradient = ctx.createLinearGradient(from.x, from.y, end.x, end.y);
    }
    const layer = this.getActiveLayer();
    const isMask = layer?.mask && this.getEditingCanvas(layer) === layer.mask;
    const startColor = isMask ? this.grayColor(this.foreground) : this.foreground;
    const endColor = isMask ? this.grayColor(this.background) : this.background;
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    return gradient;
  }

  grayColor(color) {
    const match = color.match(/^#([0-9a-f]{6})$/i);
    if (!match) return color;
    const channels = [0, 2, 4].map(index => parseInt(match[1].slice(index, index + 2), 16));
    const gray = Math.round(channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722);
    return `rgb(${gray},${gray},${gray})`;
  }

  commitGradient(from, to) {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
    const target = this.getEditingCanvas(layer);
    const ctx = target.getContext("2d");
    ctx.save();
    ctx.globalAlpha = Number(document.querySelector("#brushOpacity").value) / 100;
    if (this.selection) {
      this.traceSelection(ctx, this.selection);
      ctx.clip();
    }
    ctx.fillStyle = this.makeGradient(ctx, from, to);
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
    if (target === layer.mask) this.markMaskRenderDirty(layer);
  }

  init() {
    this.setDocumentSize(this.width, this.height);
    this.bindEvents();
    this.ui.renderTools();
    this.ui.bindTabs();
    this.foreground = this.settings.get("tools.brush.color");
    this.background = this.settings.get("tools.gradient.background");
    this.colorGradientEnabled = this.settings.get("tools.colorGradient.enabled");
    this.colorGradientStart = this.settings.get("tools.colorGradient.start");
    this.colorGradientEnd = this.settings.get("tools.colorGradient.end");
    this.updateColorControls();
    this.settings.apply();
    this.applyToolSettings();
    this.history.loadPersisted();
    this.startAutoSave();
    this.bindPersistence();
    if (this.settings.get("general.restoreSession")) this.files.restoreLastSession();
    else if (this.settings.get("general.welcomeScreen")) document.querySelector("#welcomeDialog").showModal();
    this.requestCenter();
  }

  setDocumentSize(width, height, reset = true) {
    this.width = Math.max(1, Math.min(10000, Number(width)));
    this.height = Math.max(1, Math.min(10000, Number(height)));
    this.documentCanvas.width = this.width;
    this.documentCanvas.height = this.height;
    this.overlayCanvas.width = this.width;
    this.overlayCanvas.height = this.height;
    this.shell.style.width = `${this.width}px`;
    this.shell.style.height = `${this.height}px`;
    document.querySelector("#documentSize").textContent = `${this.width} × ${this.height} px`;
    if (reset) {
      this.layers = [];
      this.addInitialLayer();
    }
    this.render();
  }

  addInitialLayer() {
    const layer = this.layersManager.make(`${this.settings.get("layers.defaultName")} 1`);
    this.layers.unshift(layer);
    this.activeLayerId = layer.id;
  }

  getActiveLayer() {
    return this.layers.find(layer => layer.id === this.activeLayerId);
  }

  render(updateLayers = true) {
    const ctx = this.documentCanvas.getContext("2d");
    ctx.imageSmoothingQuality = this.settings.get("performance.smoothingQuality");
    ctx.clearRect(0, 0, this.width, this.height);
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(this.getLayerRenderCanvas(layer), 0, 0);
    }
    ctx.globalAlpha = 1;
    if (updateLayers) this.ui.renderLayers();
    this.drawSelectionOverlay();
  }

  getLayerRenderCanvas(layer) {
    if (!layer.mask || !layer.maskEnabled) return layer.canvas;
    if (!layer.maskRenderCanvas || layer.maskRenderCanvas.width !== this.width || layer.maskRenderCanvas.height !== this.height) {
      layer.maskRenderCanvas = document.createElement("canvas");
      layer.maskRenderCanvas.width = this.width;
      layer.maskRenderCanvas.height = this.height;
      layer.maskDirtyBounds = { left: 0, top: 0, right: this.width, bottom: this.height };
    }
    if (layer.maskDirtyBounds) {
      const bounds = layer.maskDirtyBounds;
      const left = Math.max(0, Math.floor(bounds.left));
      const top = Math.max(0, Math.floor(bounds.top));
      const right = Math.min(this.width, Math.ceil(bounds.right));
      const bottom = Math.min(this.height, Math.ceil(bounds.bottom));
      const width = right - left;
      const height = bottom - top;
      if (width > 0 && height > 0) {
        const image = layer.mask.getContext("2d").getImageData(left, top, width, height);
        for (let index = 0; index < image.data.length; index += 4) {
          const luminance = Math.round(image.data[index] * 0.2126 + image.data[index + 1] * 0.7152 + image.data[index + 2] * 0.0722);
          image.data[index] = 255;
          image.data[index + 1] = 255;
          image.data[index + 2] = 255;
          image.data[index + 3] = Math.round(luminance * image.data[index + 3] / 255);
        }
        layer.maskRenderCanvas.getContext("2d").putImageData(image, left, top);
      }
      layer.maskDirtyBounds = null;
    }
    const composite = this.layerCompositeCanvas ||= document.createElement("canvas");
    if (composite.width !== this.width) composite.width = this.width;
    if (composite.height !== this.height) composite.height = this.height;
    const ctx = composite.getContext("2d");
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(layer.maskRenderCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    return composite;
  }

  buildFlatCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext("2d");
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(this.getLayerRenderCanvas(layer), 0, 0);
    }
    ctx.globalAlpha = 1;
    return canvas;
  }

  applyView() {
    this.shell.style.width = `${this.width}px`;
    this.shell.style.height = `${this.height}px`;
    this.shell.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    document.querySelector("#zoomLabel").textContent = `${Math.round(this.zoom * 100)}%`;
    document.querySelector("#zoomSlider").value = Math.round(this.zoom * 100);
    this.updateBrushCursorSize();
  }

  center() {
    this.panX = (this.stage.clientWidth - this.width * this.zoom) / 2;
    this.panY = (this.stage.clientHeight - this.height * this.zoom) / 2;
    this.applyView();
  }

  requestCenter() {
    requestAnimationFrame(() => this.applyOpenView());
  }

  applyOpenView() {
    const zoom = this.settings.get("canvas.defaultZoom");
    if (zoom === "fit") {
      const padding = 80;
      this.zoom = Math.max(.05, Math.min(1, (this.stage.clientWidth - padding) / this.width, (this.stage.clientHeight - padding) / this.height));
    } else {
      this.zoom = Number(zoom) / 100;
    }
    if (this.settings.get("canvas.centerOnOpen")) this.center();
    else this.applyView();
  }

  fit() {
    const padding = 80;
    const zx = (this.stage.clientWidth - padding) / this.width;
    const zy = (this.stage.clientHeight - padding) / this.height;
    this.zoom = Math.max(.05, Math.min(1, zx, zy));
    this.center();
  }

  setZoom(nextZoom, anchorX, anchorY) {
    nextZoom = Math.max(.05, Math.min(4, nextZoom));
    if (anchorX === undefined) anchorX = this.stage.clientWidth / 2;
    if (anchorY === undefined) anchorY = this.stage.clientHeight / 2;
    const worldX = (anchorX - this.panX) / this.zoom;
    const worldY = (anchorY - this.panY) / this.zoom;
    this.zoom = nextZoom;
    this.panX = anchorX - worldX * this.zoom;
    this.panY = anchorY - worldY * this.zoom;
    this.applyView();
  }

  stagePoint(event) {
    const rect = this.stage.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - this.panX) / this.zoom,
      y: (event.clientY - rect.left - this.panY) / this.zoom
    };
  }

  stagePointFixed(event) {
    const rect = this.stage.getBoundingRect?.() || this.stage.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - this.panX) / this.zoom,
      y: (event.clientY - rect.top - this.panY) / this.zoom
    };
  }

  bindEvents() {
    const overlay = this.overlayCanvas;
    this.bindTopMenus();
    overlay.addEventListener("pointerdown", event => this.pointerDown(event));
    window.addEventListener("pointermove", event => {
      this.updateBrushCursor(event);
      this.pointerMove(event);
    });
    window.addEventListener("pointerup", event => this.pointerUp(event));
    this.stage.addEventListener("pointerleave", () => this.hideBrushCursor());
    window.addEventListener("blur", () => this.hideBrushCursor());
    this.stage.addEventListener("wheel", event => {
      if (!this.settings.get("canvas.wheelZoom")) return;
      event.preventDefault();
      const rect = this.stage.getBoundingClientRect();
      this.setZoom(this.zoom * (event.deltaY < 0 ? 1.1 : .9), event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: false });

    document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => this.doAction(button.dataset.action)));
    document.querySelectorAll("[data-selection-action]").forEach(button => {
      button.addEventListener("click", () => this.transformSelection(button.dataset.selectionAction));
    });
    document.querySelector("#brushSize").oninput = event => {
      document.querySelector("#sizeValue").textContent = `${event.target.value} px`;
      this.syncToolSetting(event.target);
      this.updateBrushCursorSize();
    };
    document.querySelector("#brushOpacity").oninput = event => {
      document.querySelector("#opacityValue").textContent = `${event.target.value}%`;
      this.syncToolSetting(event.target);
    };
    document.querySelector("#brushHardness").oninput = event => {
      document.querySelector("#hardnessValue").textContent = `${event.target.value}%`;
      this.syncToolSetting(event.target);
    };
    document.querySelector("#glowIntensity").oninput = event => {
      document.querySelector("#glowIntensityValue").textContent = event.target.value;
      this.syncToolSetting(event.target);
    };
    document.querySelector("#smoothingToggle").onchange = event => this.syncToolSetting(event.target);
    document.querySelector("#gradientType").addEventListener("change", event => {
      if (!this.settings.set("tools.gradient.type", event.target.value)) {
        event.target.value = this.settings.get("tools.gradient.type");
        this.ui.notify("Недопустимый тип градиента");
      }
    });
    document.querySelectorAll("[data-bucket-setting]").forEach(control => {
      control.addEventListener("input", () => this.syncBucketSetting(control));
      control.addEventListener("change", () => this.syncBucketSetting(control));
    });
    document.querySelector("#colorPicker").oninput = event => {
      if (this.colorTarget === "background") {
        this.background = event.target.value;
        this.settings.set("tools.gradient.background", this.background);
      } else {
        this.foreground = event.target.value;
        this.settings.set("tools.brush.color", this.foreground);
      }
      this.updateColorControls();
    };
    document.querySelector("#foregroundColor").onclick = () => this.openColorPicker("foreground");
    document.querySelector("#backgroundColor").onclick = () => this.openColorPicker("background");
    document.querySelector("#swapColors").onclick = () => {
      [this.foreground, this.background] = [this.background, this.foreground];
      this.settings.set("tools.brush.color", this.foreground);
      this.settings.set("tools.gradient.background", this.background);
      this.updateColorControls();
    };
    document.querySelector("#colorGradientEnabled").onchange = event => {
      this.colorGradientEnabled = event.target.checked;
      this.settings.set("tools.colorGradient.enabled", this.colorGradientEnabled);
      document.querySelector("#colorGradientControls").hidden = !this.colorGradientEnabled;
    };
    document.querySelector("#colorGradientStart").oninput = event => {
      this.colorGradientStart = event.target.value;
      this.settings.set("tools.colorGradient.start", this.colorGradientStart);
      document.querySelector("#colorGradientStartSwatch").style.background = this.colorGradientStart;
    };
    document.querySelector("#colorGradientEnd").oninput = event => {
      this.colorGradientEnd = event.target.value;
      this.settings.set("tools.colorGradient.end", this.colorGradientEnd);
      document.querySelector("#colorGradientEndSwatch").style.background = this.colorGradientEnd;
    };

    document.querySelector("#imageInput").onchange = event => this.files.openImage(event.target.files[0]);
    document.querySelector("#projectInput").onchange = event => this.files.openProject(event.target.files[0]);
    document.querySelector("#newDocumentForm").onsubmit = event => this.newDocumentSubmit(event);
    document.querySelector("#exportForm").onsubmit = event => this.exportSubmit(event);
    document.querySelector("#sizePresets").onclick = event => {
      const button = event.target.closest("[data-width]");
      if (!button) return;
      document.querySelector("#docWidth").value = button.dataset.width;
      document.querySelector("#docHeight").value = button.dataset.height;
    };
    document.querySelector("#handToggle").onclick = () => this.selectTool("hand");
    document.querySelector("#zoomSlider").oninput = event => this.setZoom(Number(event.target.value) / 100);

    window.addEventListener("keydown", event => this.keyDown(event));
    window.addEventListener("beforeunload", event => {
      this.saveSession();
      if (this.dirty && this.settings.get("general.confirmClose")) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    document.querySelector("#welcomeOpen").onclick = () => { document.querySelector("#welcomeDialog").close(); document.querySelector("#imageInput").click(); };
    document.querySelector("#welcomeNew").onclick = () => { document.querySelector("#welcomeDialog").close(); document.querySelector("#newDocumentDialog").showModal(); };
    document.querySelector("#welcomeDismiss").onclick = () => document.querySelector("#welcomeDialog").close();
    document.querySelector("#textEntryCancel").onclick = () => {
      this.pendingTextEntry = null;
      document.querySelector("#textEntryDialog").close();
    };
    document.querySelector("#textEntryForm").addEventListener("submit", event => {
      event.preventDefault();
      const callback = this.pendingTextEntry;
      this.pendingTextEntry = null;
      document.querySelector("#textEntryDialog").close();
      callback?.(document.querySelector("#textEntryValue").value);
    });
    document.addEventListener("imageshop-settings-applied", () => {
      this.startAutoSave();
      if (this.settings.get("history.persistSession")) this.history.persist();
      else sessionStorage.removeItem("imageshop.history.v1");
    });
    this.stage.addEventListener("dragover", event => event.preventDefault());
    this.stage.addEventListener("drop", event => {
      event.preventDefault();
      const image = [...event.dataTransfer.files].find(file => file.type.startsWith("image/"));
      if (image) this.files.openImage(image);
    });
    window.addEventListener("contextmenu", event => {
      event.preventDefault();
      this.ui.showContextMenu(event.clientX, event.clientY, [
        { label: "Новый слой", action: () => this.layersManager.add() },
        { label: "Дублировать слой", action: () => this.layersManager.duplicate() },
        { label: "Удалить слой", action: () => this.layersManager.delete() }
      ]);
    });
    window.addEventListener("click", () => document.querySelector("#contextMenu").style.display = "none");
  }

  bindTopMenus() {
    const menus = document.querySelector("#menus");
    if (!menus) return;

    const getMenu = target => target instanceof Element ? target.closest(".menu") : null;
    const closeMenus = except => {
      menus.querySelectorAll(".menu.is-open").forEach(menu => {
        if (menu === except) return;
        menu.classList.remove("is-open");
        menu.querySelector(":scope > button")?.setAttribute("aria-expanded", "false");
      });
    };
    const openMenu = menu => {
      if (!menu || !menus.contains(menu)) return;
      closeMenus(menu);
      menu.classList.add("is-open");
      menu.querySelector(":scope > button")?.setAttribute("aria-expanded", "true");
    };

    menus.querySelectorAll(".menu > button").forEach(button => {
      button.setAttribute("aria-haspopup", "true");
      button.setAttribute("aria-expanded", "false");
    });

    menus.addEventListener("pointerover", event => {
      const menu = getMenu(event.target);
      if (menu) openMenu(menu);
    });
    menus.addEventListener("pointerout", event => {
      const menu = getMenu(event.target);
      if (!menu) return;
      const nextMenu = getMenu(event.relatedTarget);
      if (nextMenu === menu || (nextMenu && menus.contains(nextMenu))) return;
      closeMenus();
    });
    menus.addEventListener("focusin", event => openMenu(getMenu(event.target)));
    menus.addEventListener("focusout", event => {
      const menu = getMenu(event.target);
      if (!menu || menu.contains(event.relatedTarget)) return;
      closeMenus();
    });
  }

  updateColorControls() {
    document.querySelector("#foregroundColor").style.background = this.foreground;
    document.querySelector("#backgroundColor").style.background = this.background;
    document.querySelector("#colorPicker").value = this.colorTarget === "background" ? this.background : this.foreground;
    const enabled = this.settings.get("tools.colorGradient.enabled");
    document.querySelector("#colorGradientEnabled").checked = enabled;
    document.querySelector("#colorGradientControls").hidden = !enabled;
    document.querySelector("#colorGradientStart").value = this.settings.get("tools.colorGradient.start");
    document.querySelector("#colorGradientEnd").value = this.settings.get("tools.colorGradient.end");
    document.querySelector("#colorGradientStartSwatch").style.background = this.settings.get("tools.colorGradient.start");
    document.querySelector("#colorGradientEndSwatch").style.background = this.settings.get("tools.colorGradient.end");
  }

  openColorPicker(target) {
    this.colorTarget = target;
    this.updateColorControls();
    document.querySelector("#colorPicker").click();
  }

  keyDown(event) {
    if (event.target.closest(".shortcut-key.recording")) return;
    const shortcutAction = Object.entries(this.settings.values.shortcuts).find(([, shortcut]) => this.shortcutMatches(event, shortcut));
    if (shortcutAction) {
      event.preventDefault();
      this.runShortcut(shortcutAction[0]);
      return;
    }
    if (!event.ctrlKey && !event.metaKey && event.key === "0") this.fit();
    if (!event.ctrlKey && !event.metaKey && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      const toolShortcut = Object.entries(this.settings.values.shortcuts).find(([action, shortcut]) =>
        ["selectRect", "lasso", "line", "rectangle", "ellipse", "polygon", "star", "bezier", "fill", "eyedropper", "text", "crop"].includes(action) &&
        this.shortcutMatches(event, shortcut)
      );
      if (toolShortcut) this.runShortcut(toolShortcut[0]);
    }
  }

  shortcutMatches(event, shortcut) {
    const parts = shortcut.split("+");
    const key = parts.at(-1);
    const ctrl = parts.includes("ctrl");
    const alt = parts.includes("alt");
    const shift = parts.includes("shift");
    return event.key.toLowerCase() === key &&
      Boolean(event.ctrlKey || event.metaKey) === ctrl &&
      event.altKey === alt &&
      event.shiftKey === shift &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
  }

  runShortcut(action) {
    const actions = {
      brush: () => this.selectTool("brush"),
      pencil: () => this.selectTool("pencil"),
      selectRect: () => this.selectTool("selectRect"),
      lasso: () => this.selectTool("lasso"),
      pixelBrush: () => this.selectTool("pixelBrush"),
      marker: () => this.selectTool("marker"),
      airbrush: () => this.selectTool("airbrush"),
      glowBrush: () => this.selectTool("glowBrush"),
      eraser: () => this.selectTool("eraser"),
      blur: () => this.selectTool("blur"),
      dodge: () => this.selectTool("dodge"),
      burn: () => this.selectTool("burn"),
      hand: () => this.selectTool("hand"),
      line: () => this.selectTool("line"),
      rectangle: () => this.selectTool("rectangle"),
      ellipse: () => this.selectTool("ellipse"),
      polygon: () => this.selectTool("polygon"),
      star: () => this.selectTool("star"),
      bezier: () => this.selectTool("bezier"),
      gradient: () => this.selectTool("gradient"),
      fill: () => this.selectTool("fill"),
      eyedropper: () => this.selectTool("eyedropper"),
      text: () => this.selectTool("text"),
      crop: () => this.selectTool("crop"),
      undo: () => this.bucketBusy ? this.ui.notify("Дождитесь завершения заливки") : this.history.undo(),
      redo: () => this.bucketBusy ? this.ui.notify("Дождитесь завершения заливки") : this.history.redo(),
      save: () => this.files.saveProject(),
      open: () => { if (this.confirmDiscard()) document.querySelector("#imageInput").click(); },
      newDocument: () => this.openNewDocument(),
      zoomIn: () => this.setZoom(this.zoom * 1.2),
      zoomOut: () => this.setZoom(this.zoom / 1.2)
    };
    actions[action]?.();
  }

  openNewDocument() {
    if (!this.confirmDiscard()) return;
    document.querySelector("#newDocumentDialog").showModal();
  }

  applyDrawingSettings() {
    const settings = this.settings.values;
    const quality = settings.performance.smoothingQuality;
    this.documentCanvas.getContext("2d").imageSmoothingQuality = quality;
  }

  applyViewSettings() {
    this.applyView();
  }

  applyToolSettings() {
    const tool = this.tool;
    const settings = this.settings.values.tools;
    const values = this.strokeTools.includes(tool) ? settings[tool] : null;
    if (values) {
      document.querySelector("#brushSize").value = values.size;
      document.querySelector("#brushOpacity").value = values.opacity;
      document.querySelector("#brushHardness").value = values.hardness ?? 100;
      document.querySelector("#glowIntensity").value = values.glow ?? 180;
      document.querySelector("#smoothingToggle").checked = values.smoothing ?? true;
      document.querySelector("#smoothingToggle").disabled = values.smoothing === undefined;
      document.querySelector("#sizeValue").textContent = `${values.size} px`;
      document.querySelector("#opacityValue").textContent = `${values.opacity}%`;
      document.querySelector("#hardnessValue").textContent = `${values.hardness ?? 100}%`;
      document.querySelector("#glowIntensityValue").textContent = values.glow ?? 180;
    } else if (["line", "rectangle", "ellipse", "polygon", "star", "bezier"].includes(tool)) {
      document.querySelector("#smoothingToggle").disabled = true;
      document.querySelector("#brushSize").value = settings.shapes.width;
      document.querySelector("#sizeValue").textContent = `${settings.shapes.width} px`;
    } else {
      document.querySelector("#smoothingToggle").disabled = true;
    }
    document.querySelector("#glowIntensityControl").hidden = tool !== "glowBrush";
    const bucketPanel = document.querySelector("#bucketOptions");
    const isBucket = tool === "fill";
    bucketPanel.hidden = !isBucket;
    const gradientPanel = document.querySelector("#gradientOptions");
    gradientPanel.hidden = tool !== "gradient";
    if (tool === "gradient") document.querySelector("#gradientType").value = settings.gradient.type;
    if (isBucket) {
      const bucket = settings.bucket;
      for (const control of document.querySelectorAll("[data-bucket-setting]")) {
        const key = control.dataset.bucketSetting;
        const value = bucket[key];
        if (control.type === "checkbox") control.checked = value;
        else control.value = value;
      }
      this.updateBucketValueLabels();
    }
    this.overlayCanvas.style.cursor = isBucket ? "crosshair" : "";
    this.updateBrushCursorSize();
    this.drawSelectionOverlay();
  }

  updateBucketValueLabels() {
    document.querySelector("#fillToleranceValue").textContent = document.querySelector("#fillTolerance").value;
    document.querySelector("#fillGrowValue").textContent = `${document.querySelector("#fillGrow").value} px`;
  }

  syncBucketSetting(control) {
    const key = control.dataset.bucketSetting;
    const value = control.type === "checkbox" ? control.checked
      : control.tagName === "SELECT" ? control.value : Number(control.value);
    if (!this.settings.set(`tools.bucket.${key}`, value)) {
      control.value = this.settings.get(`tools.bucket.${key}`);
      this.ui.notify("Недопустимое значение настройки заливки");
    }

    if (key === "tolerance") {
      const paired = document.querySelector(control.id === "fillTolerance" ? "#fillToleranceNumber" : "#fillTolerance");
      paired.value = control.value;
    } else if (key === "grow") {
      const paired = document.querySelector(control.id === "fillGrow" ? "#fillGrowNumber" : "#fillGrow");
      paired.value = control.value;
    }
    this.updateBucketValueLabels();
  }

  selectTool(tool) {
    this.tool = tool;
    this.ui.renderTools();
    document.querySelector("#toolStatus").textContent = TOOL_DEFINITIONS.find(t => t[0] === tool)?.[1] || tool;
    document.querySelector("#selectionControls").hidden = !["selectRect", "lasso"].includes(tool);
    this.applyToolSettings();
  }

  beginLayerOpacityChange(layer) {
    if (this.opacityHistoryLayerId === layer.id) return;
    this.history.snapshot("Change layer opacity");
    this.opacityHistoryLayerId = layer.id;
  }

  setLayerOpacity(layer, opacity) {
    if (this.opacityHistoryLayerId !== layer.id) this.beginLayerOpacityChange(layer);
    layer.opacity = Math.max(0, Math.min(1, opacity));
    this.markDirty();
    this.render(false);
  }

  finishLayerOpacityChange() {
    this.opacityHistoryLayerId = null;
    this.ui.renderLayers();
  }

  syncToolSetting(control) {
    const field = control.id === "brushSize" ? "size" : control.id === "brushOpacity" ? "opacity" : control.id === "brushHardness" ? "hardness" : control.id === "glowIntensity" ? "glow" : control.id === "smoothingToggle" ? "smoothing" : null;
    if (!field) return;
    const group = this.strokeTools.includes(this.tool) ? this.tool : null;
    if (group) this.settings.set(`tools.${group}.${field}`, field === "smoothing" ? control.checked : Number(control.value));
    else if (["line", "rectangle", "ellipse", "polygon", "star", "bezier"].includes(this.tool) && field === "size") this.settings.set("tools.shapes.width", Number(control.value));
    this.updateBrushCursorSize();
  }

  brushCursorDiameter() {
    const size = Number(document.querySelector("#brushSize").value);
    if (this.tool === "pencil") return Math.max(1, size * .45);
    if (this.tool === "marker") return size * 1.35;
    return size;
  }

  updateBrushCursorSize() {
    if (!this.brushCursor) return;
    if (!this.strokeTools.includes(this.tool)) {
      this.hideBrushCursor();
      return;
    }
    this.brushCursor.classList.toggle("pixel", this.tool === "pixelBrush");
    this.brushCursor.style.setProperty("--brush-cursor-size", `${this.brushCursorDiameter() * this.zoom}px`);
  }

  hideBrushCursor() {
    this.brushCursor?.classList.remove("visible");
  }

  updateBrushCursor(event) {
    if (!this.brushCursor) return;
    if (!this.strokeTools.includes(this.tool) || this.draggingView || event.buttons && !this.isDrawing) {
      this.hideBrushCursor();
      return;
    }

    const canvasRect = this.shell.getBoundingClientRect();
    const stageRect = this.stage.getBoundingClientRect();
    const insideCanvas = event.clientX >= canvasRect.left && event.clientX <= canvasRect.right &&
      event.clientY >= canvasRect.top && event.clientY <= canvasRect.bottom;
    if (!insideCanvas) {
      this.hideBrushCursor();
      return;
    }
    this.brushCursor.style.left = `${event.clientX - stageRect.left}px`;
    this.brushCursor.style.top = `${event.clientY - stageRect.top}px`;
    this.updateBrushCursorSize();
    this.brushCursor.classList.add("visible");
  }

  markDirty() {
    this.dirty = true;
  }

  startAutoSave() {
    clearInterval(this.autoSaveTimer);
    if (!this.settings.get("general.autoSave")) return;
    const interval = this.settings.get("general.autoSaveMinutes") * 60 * 1000;
    this.autoSaveTimer = setInterval(() => this.saveAutoCopy(), interval);
  }

  saveAutoCopy() {
    if (!this.layers.length) return;
    try {
      localStorage.setItem("imageshop.autosave.v1", JSON.stringify(this.files.serializeProject()));
    } catch (error) {
      this.ui.notify("Не удалось сохранить автокопию: недостаточно места в хранилище");
      console.error("ImageShop autosave failed", error);
    }
  }

  saveSession() {
    if (!this.settings.get("general.restoreSession") || !this.layers.length) return;
    try {
      localStorage.setItem("imageshop.lastSession.v1", JSON.stringify(this.files.serializeProject()));
    } catch (error) {
      console.error("ImageShop session could not be saved", error);
    }
  }

  bindPersistence() {
    window.addEventListener("pagehide", () => this.saveSession());
  }

  doAction(action) {
    const map = {
      new: () => this.openNewDocument(),
      open: () => { if (!this.confirmDiscard()) return; document.querySelector("#imageInput").click(); },
      openProject: () => { if (!this.confirmDiscard()) return; document.querySelector("#projectInput").click(); },
      saveProject: () => this.files.saveProject(),
      export: () => document.querySelector("#exportDialog").showModal(),
      undo: () => this.bucketBusy ? this.ui.notify("Дождитесь завершения заливки") : this.history.undo(),
      redo: () => this.bucketBusy ? this.ui.notify("Дождитесь завершения заливки") : this.history.redo(),
      clearLayer: () => { const l = this.getActiveLayer(); if (!l?.locked) { this.history.snapshot("Clear layer"); l.canvas.getContext("2d").clearRect(0,0,this.width,this.height); this.markDirty(); this.render(); } },
      fit: () => this.fit(),
      center: () => this.center(),
      zoomIn: () => this.setZoom(this.zoom * 1.2),
      zoomOut: () => this.setZoom(this.zoom * .8),
      addLayer: () => this.layersManager.add(),
      duplicateLayer: () => this.layersManager.duplicate(),
      mergeDown: () => this.layersManager.mergeDown(),
      deleteLayer: () => this.layersManager.delete(),
      addLayerMask: () => this.layersManager.addMask(),
      toggleLayerMask: () => this.layersManager.toggleMaskEnabled(),
      removeLayerMask: () => this.layersManager.removeMask()
    };
    map[action]?.();
  }

  newDocumentSubmit(event) {
    event.preventDefault();
    const width = Number(document.querySelector("#docWidth").value);
    const height = Number(document.querySelector("#docHeight").value);
    const dpi = Number(document.querySelector("#docDpi").value);
    this.history.snapshot("New document");
    this.width = width;
    this.height = height;
    this.dpi = dpi;
    this.setDocumentSize(width, height, true);
    if (document.querySelector("#docBackground").value === "white") {
      this.getActiveLayer().canvas.getContext("2d").fillStyle = "#fff";
      this.getActiveLayer().canvas.getContext("2d").fillRect(0, 0, width, height);
    }
    this.dirty = true;
    document.querySelector("#newDocumentDialog").close();
    this.render();
    this.requestCenter();
  }

  exportSubmit(event) {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const format = document.querySelector("#exportFormat").value;
    const quality = Number(document.querySelector("#exportQuality").value) / 100;
    this.files.exportImage(format, quality);
    document.querySelector("#exportDialog").close();
  }

  pointerToCanvas(event) {
    const rect = this.shell.getBoundingClientRect();
    let x = Math.max(0, Math.min(this.width, (event.clientX - rect.left) / this.zoom));
    let y = Math.max(0, Math.min(this.height, (event.clientY - rect.top) / this.zoom));
    if (this.settings.get("canvas.snapToGrid")) {
      const step = this.settings.get("canvas.gridSize");
      x = Math.max(0, Math.min(this.width, Math.round(x / step) * step));
      y = Math.max(0, Math.min(this.height, Math.round(y / step) * step));
    }
    return { x, y };
  }

  pointerDown(event) {
    if (this.bucketBusy) return;
    const point = this.pointerToCanvas(event);
    if (this.tool === "hand" || event.button === 1) {
      this.draggingView = true;
      this.viewStart = { x: event.clientX, y: event.clientY, panX: this.panX, panY: this.panY };
      this.stage.style.cursor = "grabbing";
      event.preventDefault();
      return;
    }
    if (this.tool === "text") {
      const textLayer = this.layers.find(layer => layer.visible && !layer.locked && layer.textObject && this.textEditor.containsPoint(layer, point));
      if (textLayer) {
        this.activeLayerId = textLayer.id;
        this.ui.renderLayers();
        this.draggingText = { layer: textLayer, start: point, origin: { x: textLayer.textObject.x, y: textLayer.textObject.y }, moved: false };
        return;
      }
      this.textEditor.openAt(point);
      return;
    }
    if (this.tool === "selectRect" || this.tool === "lasso") {
      const layer = this.getActiveLayer();
      const handle = this.selection ? this.selectionHandleAt(point) : -1;
      if (this.selection && layer && !layer.locked && (handle >= 0 || this.pointInSelection(point))) {
        const target = this.getEditingCanvas(layer);
        const sourceCanvas = this.createSelectionBitmap(target, this.selection);
        const baseCanvas = document.createElement("canvas");
        baseCanvas.width = this.width;
        baseCanvas.height = this.height;
        baseCanvas.getContext("2d").drawImage(target, 0, 0);
        this.selectionGesture = {
          mode: handle >= 0 ? "resize" : "move",
          handle,
          start: point,
          startBounds: { ...this.selection.bounds },
          startPoints: this.selection.points.map(item => ({ ...item })),
          baseCanvas,
          sourceCanvas,
          layer,
          selection: this.selection,
          moved: false
        };
        return;
      }
      this.selectionGesture = { mode: "create", tool: this.tool, start: point, points: [point] };
      this.selection = null;
      this.drawSelectionOverlay();
      return;
    }
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return this.ui.notify("Слой заблокирован");
    if (this.tool === "eyedropper") { this.pickColor(point); return; }
    if (this.tool === "fill") { this.floodFill(Math.round(point.x), Math.round(point.y)); return; }
    this.history.snapshot(`Draw ${this.tool}`);
    this.isDrawing = true;
    this.shapeStart = point;
    this.lastPoint = point;
    if (this.colorGradientEnabled && ["brush", "pencil", "pixelBrush", "marker"].includes(this.tool)) {
      this.colorGradientStroke = { canvas: document.createElement("canvas"), start: point, end: point };
      this.colorGradientStroke.canvas.width = this.width;
      this.colorGradientStroke.canvas.height = this.height;
    }
    if (this.strokeTools.includes(this.tool)) this.drawStroke(point, point);
  }

  pointerMove(event) {
    if (this.draggingView) {
      this.panX = this.viewStart.panX + event.clientX - this.viewStart.x;
      this.panY = this.viewStart.panY + event.clientY - this.viewStart.y;
      this.applyView();
      return;
    }
    if (this.draggingText) {
      const point = this.pointerToCanvas(event);
      const deltaX = point.x - this.draggingText.start.x;
      const deltaY = point.y - this.draggingText.start.y;
      if (!this.draggingText.moved && Math.hypot(deltaX, deltaY) > 2) {
        this.history.snapshot("Move text layer");
        this.draggingText.moved = true;
      }
      if (this.draggingText.moved) {
        const object = this.draggingText.layer.textObject;
        object.x = Math.round(this.draggingText.origin.x + deltaX);
        object.y = Math.round(this.draggingText.origin.y + deltaY);
        const ctx = this.draggingText.layer.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.width, this.height);
        this.textEditor.drawText(ctx, object.text, object, object.x, object.y);
        this.render();
      }
      return;
    }
    if (this.selectionGesture) {
      const point = this.pointerToCanvas(event);
      if (this.selectionGesture.mode === "create") {
        if (this.selectionGesture.tool === "lasso") {
          const points = this.selectionGesture.points;
          if (Math.hypot(point.x - points.at(-1).x, point.y - points.at(-1).y) >= 2 / this.zoom) points.push(point);
        } else this.selectionGesture.points = [this.selectionGesture.start, point];
        this.drawSelectionGesture();
      } else this.updateSelectionTransform(point);
      return;
    }
    if (!this.isDrawing) return;
    if (this.strokeTools.includes(this.tool)) {
      const coalesced = event.getCoalescedEvents?.() || [];
      const samples = coalesced.length ? [...coalesced] : [event];
      const lastSample = samples[samples.length - 1];
      if (lastSample.clientX !== event.clientX || lastSample.clientY !== event.clientY) samples.push(event);
      for (const sample of samples) {
        const point = this.pointerToCanvas(sample);
        this.drawStroke(this.lastPoint, point);
        this.lastPoint = point;
      }
    } else {
      const point = this.pointerToCanvas(event);
      this.previewShape(this.shapeStart, point);
    }
  }

  pointerUp(event) {
    if (this.draggingView) { this.draggingView = false; this.stage.style.cursor = ""; return; }
    if (this.draggingText) {
      const { layer, moved } = this.draggingText;
      this.draggingText = null;
      if (moved) this.markDirty();
      else this.textEditor.editLayer(layer);
      return;
    }
    if (this.selectionGesture) {
      const gesture = this.selectionGesture;
      if (gesture.mode === "create") {
        const point = this.pointerToCanvas(event);
        if (gesture.tool === "lasso") {
          if (Math.hypot(point.x - gesture.points.at(-1).x, point.y - gesture.points.at(-1).y) > 0) gesture.points.push(point);
          if (gesture.points.length >= 3) this.selection = this.makeSelection("lasso", gesture.points);
        } else {
          const start = gesture.start;
          const bounds = this.normalizeBounds({ left: start.x, top: start.y, right: point.x, bottom: point.y });
          if (bounds.width >= 1 && bounds.height >= 1) this.selection = this.makeSelection("rect", [
            { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
            { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom }
          ]);
        }
      } else if (gesture.moved) this.markDirty();
      this.selectionGesture = null;
      this.drawSelectionOverlay();
      this.render();
      return;
    }
    if (!this.isDrawing) return;
    const point = this.pointerToCanvas(event);
    if (this.tool === "gradient") this.commitGradient(this.shapeStart, point);
    else if (this.colorGradientStroke) this.commitColorGradientStroke(point);
    else if (!this.strokeTools.includes(this.tool)) this.commitShape(this.shapeStart, point);
    this.colorGradientStroke = null;
    this.isDrawing = false;
    this.markDirty();
    this.clearOverlay();
    this.render();
  }

  drawStroke(from, to) {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
    const targetCanvas = this.getEditingCanvas(layer);
    const ctx = targetCanvas.getContext("2d");
    const toolSettings = this.settings.values.tools[this.tool];
    const size = Number(document.querySelector("#brushSize").value);
    const opacity = Number(document.querySelector("#brushOpacity").value) / 100;
    const quality = this.settings.get("performance.smoothingQuality");
    const toolQuality = toolSettings?.quality;
    const hardness = Number(document.querySelector("#brushHardness").value) / 100;
    if (this.colorGradientStroke) {
      this.drawColorGradientStroke(from, to, size, opacity, hardness);
      const skipThumbs = (this.settings.get("performance.optimizeLargeCanvases") && this.width * this.height >= 1_000_000) || toolQuality === "fast";
      this.render(!skipThumbs);
      return;
    }
    if (targetCanvas === layer.mask) {
      this.drawMaskStroke(ctx, from, to, size, opacity, layer);
    } else if (this.tool === "blur") {
      this.drawBlurStroke(layer, from, to, size, opacity, hardness);
    } else if (this.tool === "dodge" || this.tool === "burn") {
      this.adjustStrokePixels(layer.canvas, from, to, size, opacity, hardness, this.tool);
    } else if (this.tool === "pixelBrush") {
      this.drawPixelStroke(ctx, from, to, size, opacity);
    } else if (this.tool === "glowBrush") {
      this.drawGlowStroke(ctx, from, to, size, opacity, hardness, Number(document.querySelector("#glowIntensity").value));
    } else {
    ctx.save();
    ctx.globalCompositeOperation = this.tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.foreground;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = quality;
    if (this.tool === "airbrush") {
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const spacing = Math.max(1, size * .12);
      const steps = Math.max(1, Math.ceil(distance / spacing));
      const radius = Math.max(.5, size / 2);
      ctx.globalAlpha = opacity * .12;
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;
        const gradient = ctx.createRadialGradient(x, y, radius * hardness * .8, x, y, radius);
        gradient.addColorStop(0, this.foreground);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    } else {
      ctx.globalAlpha = this.tool === "marker" ? opacity * .35 : opacity;
      ctx.lineWidth = this.tool === "pencil" ? Math.max(1, size * .45)
        : this.tool === "marker" ? size * 1.35 : size;
      ctx.shadowBlur = this.tool === "marker" ? 0 : size * (1 - hardness) * .35;
      ctx.shadowColor = this.foreground;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.restore();
    }
    const skipThumbs = (this.settings.get("performance.optimizeLargeCanvases") && this.width * this.height >= 1_000_000) || toolQuality === "fast";
    this.render(!skipThumbs);
  }

  drawColorGradientStroke(from, to, size, opacity, hardness) {
    const stroke = this.colorGradientStroke;
    stroke.end = to;
    const ctx = stroke.canvas.getContext("2d");
    ctx.save();
    ctx.globalAlpha = opacity * (this.tool === "marker" ? 0.35 : 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = this.tool === "pencil" ? Math.max(1, size * 0.45)
      : this.tool === "marker" ? size * 1.35 : size;
    ctx.shadowBlur = size * (1 - hardness) * 0.35;
    ctx.shadowColor = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();

    const preview = this.overlayCanvas.getContext("2d");
    preview.clearRect(0, 0, this.width, this.height);
    preview.save();
    if (this.selection) {
      this.traceSelection(preview, this.selection);
      preview.clip();
    }
    preview.globalAlpha = 0.8;
    preview.fillStyle = this.makeColorGradient(preview, stroke.start, stroke.end);
    preview.fillRect(0, 0, this.width, this.height);
    preview.globalCompositeOperation = "destination-in";
    preview.drawImage(stroke.canvas, 0, 0);
    preview.restore();
  }

  makeColorGradient(ctx, from, to, layer = this.getActiveLayer()) {
    const end = Math.hypot(to.x - from.x, to.y - from.y) < 1e-6
      ? { x: from.x + 1, y: from.y }
      : to;
    const gradient = ctx.createLinearGradient(from.x, from.y, end.x, end.y);
    const isMask = layer?.mask && this.getEditingCanvas(layer) === layer.mask;
    const start = isMask ? this.grayColor(this.colorGradientStart) : this.colorGradientStart;
    const finish = isMask ? this.grayColor(this.colorGradientEnd) : this.colorGradientEnd;
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, finish);
    return gradient;
  }

  commitColorGradientStroke(end) {
    const stroke = this.colorGradientStroke;
    const layer = this.getActiveLayer();
    if (!stroke || !layer || layer.locked) return;
    const target = this.getEditingCanvas(layer);
    const paint = document.createElement("canvas");
    paint.width = this.width;
    paint.height = this.height;
    const ctx = paint.getContext("2d");
    ctx.fillStyle = this.makeColorGradient(ctx, stroke.start, end, layer);
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(stroke.canvas, 0, 0);
    if (this.selection) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.beginPath();
      this.traceSelection(ctx, this.selection);
      ctx.fill();
    }
    target.getContext("2d").drawImage(paint, 0, 0);
    if (target === layer.mask) this.markMaskRenderDirty(layer);
  }

  drawMaskStroke(ctx, from, to, size, opacity, layer) {
    const match = this.foreground.match(/^#([0-9a-f]{6})$/i);
    if (!match) return;
    const hex = match[1];
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    const gray = Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722);
    ctx.save();
    ctx.globalCompositeOperation = this.tool === "eraser" ? "destination-out" : "source-over";
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = `rgb(${gray},${gray},${gray})`;
    ctx.lineWidth = this.tool === "pencil" ? Math.max(1, size * 0.45) : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
    const radius = size / 2 + 1;
    this.markMaskRenderDirty(layer, {
      left: Math.min(from.x, to.x) - radius,
      top: Math.min(from.y, to.y) - radius,
      right: Math.max(from.x, to.x) + radius,
      bottom: Math.max(from.y, to.y) + radius
    });
  }

  markMaskRenderDirty(layer, bounds = { left: 0, top: 0, right: this.width, bottom: this.height }) {
    if (!layer?.mask) return;
    const current = layer.maskDirtyBounds;
    layer.maskDirtyBounds = current ? {
      left: Math.min(current.left, bounds.left),
      top: Math.min(current.top, bounds.top),
      right: Math.max(current.right, bounds.right),
      bottom: Math.max(current.bottom, bounds.bottom)
    } : { ...bounds };
  }

  drawPixelStroke(ctx, from, to, size, opacity) {
    const blockSize = Math.max(1, Math.round(size));
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, blockSize * 0.3)));
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = opacity;
    ctx.fillStyle = this.foreground;
    for (let step = 0; step <= steps; step++) {
      const progress = step / steps;
      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress;
      const left = Math.floor((x - blockSize / 2) / blockSize) * blockSize;
      const top = Math.floor((y - blockSize / 2) / blockSize) * blockSize;
      ctx.fillRect(left, top, blockSize, blockSize);
    }
    ctx.restore();
  }

  drawGlowStroke(ctx, from, to, size, opacity, hardness, intensity = 180) {
    const color = this.foreground.match(/^#[0-9a-f]{6}$/i)?.[0];
    if (!color) return;
    const glowLevel = Math.max(1, Math.min(255, intensity)) / 255;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    ctx.globalAlpha = opacity * glowLevel;
    ctx.lineWidth = size;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(1, size * glowLevel * (0.65 + (1 - hardness) * 0.75));
    ctx.stroke();

    ctx.globalAlpha = opacity;
    ctx.lineWidth = Math.max(1, size * 0.3);
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }

  drawBlurStroke(layer, from, to, size, opacity, hardness) {
    const blurRadius = Math.max(1, size * 0.14);
    const padding = Math.ceil(blurRadius * 3);
    const radius = size / 2;
    const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - radius - padding));
    const top = Math.max(0, Math.floor(Math.min(from.y, to.y) - radius - padding));
    const right = Math.min(this.width, Math.ceil(Math.max(from.x, to.x) + radius + padding));
    const bottom = Math.min(this.height, Math.ceil(Math.max(from.y, to.y) + radius + padding));
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return;

    const [source, blurred, mask] = this.blurCanvases ||= [
      document.createElement("canvas"),
      document.createElement("canvas"),
      document.createElement("canvas")
    ];
    for (const canvas of [source, blurred, mask]) {
      canvas.width = width;
      canvas.height = height;
    }
    const sourceContext = source.getContext("2d");
    sourceContext.drawImage(layer.canvas, left, top, width, height, 0, 0, width, height);
    const blurredContext = blurred.getContext("2d");
    blurredContext.filter = `blur(${blurRadius}px)`;
    blurredContext.drawImage(source, 0, 0);

    const maskContext = mask.getContext("2d");
    maskContext.strokeStyle = "#fff";
    maskContext.lineWidth = size;
    maskContext.lineCap = "round";
    maskContext.lineJoin = "round";
    maskContext.beginPath();
    maskContext.moveTo(from.x - left, from.y - top);
    maskContext.lineTo(to.x - left, to.y - top);
    maskContext.stroke();
    blurredContext.globalCompositeOperation = "destination-in";
    blurredContext.drawImage(mask, 0, 0);

    const ctx = layer.canvas.getContext("2d");
    ctx.save();
    ctx.globalAlpha = opacity * (0.25 + hardness * 0.75);
    ctx.drawImage(blurred, left, top);
    ctx.restore();
  }

  adjustStrokePixels(canvas, from, to, size, opacity, hardness, mode) {
    const radius = Math.max(0.5, size / 2);
    const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - radius));
    const top = Math.max(0, Math.floor(Math.min(from.y, to.y) - radius));
    const right = Math.min(canvas.width, Math.ceil(Math.max(from.x, to.x) + radius));
    const bottom = Math.min(canvas.height, Math.ceil(Math.max(from.y, to.y) + radius));
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return;
    const ctx = canvas.getContext("2d");
    const image = ctx.getImageData(left, top, width, height);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy;
    const innerRadius = radius * hardness;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = left + x + 0.5;
        const py = top + y + 0.5;
        const progress = lengthSquared ? Math.max(0, Math.min(1, ((px - from.x) * dx + (py - from.y) * dy) / lengthSquared)) : 0;
        const distance = Math.hypot(px - (from.x + dx * progress), py - (from.y + dy * progress));
        if (distance > radius) continue;
        const falloff = distance <= innerRadius ? 1 : (radius - distance) / Math.max(0.001, radius - innerRadius);
        const amount = Math.max(0, Math.min(1, opacity * falloff * 0.3));
        const offset = (y * width + x) * 4;
        if (!image.data[offset + 3] || amount <= 0) continue;
        for (let channel = 0; channel < 3; channel++) {
          const value = image.data[offset + channel];
          image.data[offset + channel] = mode === "dodge"
            ? Math.round(value + (255 - value) * amount)
            : Math.round(value * (1 - amount));
        }
      }
    }
    ctx.putImageData(image, left, top);
  }

  getEditingCanvas(layer) {
    return layer.mask && this.editingMaskLayerId === layer.id ? layer.mask : layer.canvas;
  }

  normalizeBounds(bounds) {
    const left = Math.min(bounds.left, bounds.right);
    const top = Math.min(bounds.top, bounds.bottom);
    const right = Math.max(bounds.left, bounds.right);
    const bottom = Math.max(bounds.top, bounds.bottom);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  makeSelection(type, points) {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const bounds = this.normalizeBounds({
      left: Math.min(...xs), top: Math.min(...ys),
      right: Math.max(...xs), bottom: Math.max(...ys)
    });
    return { type, points: points.map(point => ({ ...point })), bounds };
  }

  traceSelection(ctx, selection, offsetX = 0, offsetY = 0) {
    if (!selection?.points.length) return;
    ctx.beginPath();
    ctx.moveTo(selection.points[0].x - offsetX, selection.points[0].y - offsetY);
    for (const point of selection.points.slice(1)) ctx.lineTo(point.x - offsetX, point.y - offsetY);
    ctx.closePath();
  }

  createSelectionBitmap(source, selection) {
    const bounds = selection.bounds;
    const left = Math.floor(bounds.left);
    const top = Math.floor(bounds.top);
    const right = Math.ceil(bounds.right);
    const bottom = Math.ceil(bounds.bottom);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, right - left);
    canvas.height = Math.max(1, bottom - top);
    const ctx = canvas.getContext("2d");
    this.traceSelection(ctx, selection, left, top);
    ctx.clip();
    ctx.drawImage(source, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  pointInSelection(point) {
    const selection = this.selection;
    if (!selection || point.x < selection.bounds.left || point.x > selection.bounds.right ||
        point.y < selection.bounds.top || point.y > selection.bounds.bottom) return false;
    let inside = false;
    const points = selection.points;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i];
      const b = points[j];
      if ((a.y > point.y) !== (b.y > point.y) &&
          point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  selectionHandlePoints(bounds = this.selection?.bounds) {
    if (!bounds) return [];
    return [
      { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
      { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom }
    ];
  }

  selectionHandleAt(point) {
    const bounds = this.selection?.bounds;
    if (!bounds) return -1;
    const radius = Math.min(5 / this.zoom, Math.min(bounds.width, bounds.height) * 0.3);
    return this.selectionHandlePoints().findIndex(handle => Math.hypot(handle.x - point.x, handle.y - point.y) <= radius);
  }

  drawSelectionOverlay() {
    if (!this.selection) return;
    const ctx = this.overlayCanvas.getContext("2d");
    this.traceSelection(ctx, this.selection);
    ctx.save();
    ctx.lineWidth = 1 / this.zoom;
    ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
    ctx.strokeStyle = "#111";
    ctx.lineDashOffset = 0;
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineDashOffset = 4 / this.zoom;
    ctx.stroke();
    if (["selectRect", "lasso"].includes(this.tool)) {
      ctx.setLineDash([]);
      for (const handle of this.selectionHandlePoints()) {
        const size = 7 / this.zoom;
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#2879df";
        ctx.lineWidth = 1 / this.zoom;
        ctx.fillRect(handle.x - size / 2, handle.y - size / 2, size, size);
        ctx.strokeRect(handle.x - size / 2, handle.y - size / 2, size, size);
      }
    }
    ctx.restore();
  }

  drawSelectionGesture() {
    this.clearOverlay();
    const gesture = this.selectionGesture;
    let selection;
    if (gesture.tool === "lasso") selection = gesture.points.length > 2
      ? this.makeSelection("lasso", gesture.points) : null;
    else {
      const point = gesture.points.at(-1);
      const bounds = this.normalizeBounds({
        left: gesture.start.x, top: gesture.start.y, right: point.x, bottom: point.y
      });
      selection = this.makeSelection("rect", [
        { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
        { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom }
      ]);
    }
    if (selection) {
      const previous = this.selection;
      this.selection = selection;
      this.drawSelectionOverlay();
      this.selection = previous;
    }
  }

  updateSelectionTransform(point) {
    const gesture = this.selectionGesture;
    if (!gesture) return;
    const deltaX = point.x - gesture.start.x;
    const deltaY = point.y - gesture.start.y;
    if (!gesture.moved && Math.hypot(deltaX, deltaY) < 1 / this.zoom) return;
    if (!gesture.moved) {
      this.history.snapshot(gesture.mode === "move" ? "Move selection" : "Scale selection");
      gesture.moved = true;
    }

    let bounds = { ...gesture.startBounds };
    if (gesture.mode === "move") {
      bounds.left += deltaX;
      bounds.top += deltaY;
      bounds.right += deltaX;
      bounds.bottom += deltaY;
    } else {
      const opposite = this.selectionHandlePoints(gesture.startBounds)[(gesture.handle + 2) % 4];
      const dragged = {
        x: Math.max(0, Math.min(this.width, point.x)),
        y: Math.max(0, Math.min(this.height, point.y))
      };
      bounds = this.normalizeBounds({ left: opposite.x, top: opposite.y, right: dragged.x, bottom: dragged.y });
      if (bounds.width < 1) bounds.width = 1;
      if (bounds.height < 1) bounds.height = 1;
    }

    const newBounds = this.normalizeBounds(bounds);
    const points = gesture.startPoints.map(original => {
      if (gesture.mode === "move") return { x: original.x + deltaX, y: original.y + deltaY };
      const xRatio = (original.x - gesture.startBounds.left) / Math.max(1e-6, gesture.startBounds.width);
      const yRatio = (original.y - gesture.startBounds.top) / Math.max(1e-6, gesture.startBounds.height);
      return { x: newBounds.left + xRatio * newBounds.width, y: newBounds.top + yRatio * newBounds.height };
    });
    const target = this.getEditingCanvas(gesture.layer);
    const ctx = target.getContext("2d");
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(gesture.baseCanvas, 0, 0);
    this.traceSelection(ctx, gesture.selection);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(gesture.sourceCanvas, newBounds.left, newBounds.top, newBounds.width, newBounds.height);
    this.selection = { type: gesture.selection.type, points, bounds: newBounds };
    if (target === gesture.layer.mask) {
      this.markMaskRenderDirty(gesture.layer, {
        left: Math.min(gesture.startBounds.left, newBounds.left),
        top: Math.min(gesture.startBounds.top, newBounds.top),
        right: Math.max(gesture.startBounds.right, newBounds.right),
        bottom: Math.max(gesture.startBounds.bottom, newBounds.bottom)
      });
    }
    this.render(false);
  }

  transformSelection(action) {
    if (action === "deselect") {
      this.selection = null;
      this.clearOverlay();
      this.render(false);
      return;
    }
    if (!this.selection) return this.ui.notify("Сначала создайте выделение");
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return this.ui.notify("Слой заблокирован");
    const target = this.getEditingCanvas(layer);
    const selection = this.selection;
    const bounds = selection.bounds;
    const source = this.createSelectionBitmap(target, selection);
    const bitmap = document.createElement("canvas");
    let points;
    let nextBounds;
    if (action === "rotateLeft" || action === "rotateRight") {
      bitmap.width = source.height;
      bitmap.height = source.width;
      const rotation = action === "rotateRight" ? Math.PI / 2 : -Math.PI / 2;
      const bitmapContext = bitmap.getContext("2d");
      bitmapContext.translate(bitmap.width / 2, bitmap.height / 2);
      bitmapContext.rotate(rotation);
      bitmapContext.drawImage(source, -source.width / 2, -source.height / 2);
      const centerX = (bounds.left + bounds.right) / 2;
      const centerY = (bounds.top + bounds.bottom) / 2;
      nextBounds = this.normalizeBounds({
        left: centerX - bitmap.width / 2, top: centerY - bitmap.height / 2,
        right: centerX + bitmap.width / 2, bottom: centerY + bitmap.height / 2
      });
      const direction = action === "rotateRight" ? 1 : -1;
      points = selection.points.map(original => {
        const x = original.x - centerX;
        const y = original.y - centerY;
        return { x: centerX - direction * y, y: centerY + direction * x };
      });
    } else {
      bitmap.width = source.width;
      bitmap.height = source.height;
      const bitmapContext = bitmap.getContext("2d");
      bitmapContext.translate(action === "flipHorizontal" ? bitmap.width : 0, action === "flipVertical" ? bitmap.height : 0);
      bitmapContext.scale(action === "flipHorizontal" ? -1 : 1, action === "flipVertical" ? -1 : 1);
      bitmapContext.drawImage(source, 0, 0);
      points = selection.points.map(original => ({
        x: action === "flipHorizontal" ? bounds.left + bounds.right - original.x : original.x,
        y: action === "flipVertical" ? bounds.top + bounds.bottom - original.y : original.y
      }));
      nextBounds = { ...bounds };
    }

    this.history.snapshot("Transform selection");
    const layerContext = target.getContext("2d");
    this.traceSelection(layerContext, selection);
    layerContext.globalCompositeOperation = "destination-out";
    layerContext.fill();
    layerContext.globalCompositeOperation = "source-over";
    layerContext.drawImage(bitmap, nextBounds.left, nextBounds.top, nextBounds.width, nextBounds.height);
    this.selection = { type: selection.type, points, bounds: nextBounds };
    if (target === layer.mask) {
      this.markMaskRenderDirty(layer, {
        left: Math.min(bounds.left, nextBounds.left),
        top: Math.min(bounds.top, nextBounds.top),
        right: Math.max(bounds.right, nextBounds.right),
        bottom: Math.max(bounds.bottom, nextBounds.bottom)
      });
    }
    this.markDirty();
    this.render();
  }

  previewShape(from, to) {
    this.clearOverlay();
    const ctx = this.overlayCanvas.getContext("2d");
    if (this.tool === "gradient") {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = this.makeGradient(ctx, from, to);
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
      this.drawSelectionOverlay();
      return;
    }
    ctx.save();
    ctx.globalAlpha = Number(document.querySelector("#brushOpacity").value) / 100;
    const shapeSettings = this.settings.values.tools.shapes;
    ctx.strokeStyle = shapeSettings.stroke;
    ctx.fillStyle = shapeSettings.fill;
    ctx.lineWidth = shapeSettings.width;
    ctx.setLineDash([6, 4]);
    if (this.tool === "line") {
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    } else if (this.tool === "rectangle") {
      if (shapeSettings.fillEnabled) {
        ctx.setLineDash([]);
        ctx.fillRect(from.x, from.y, to.x - from.x, to.y - from.y);
        ctx.setLineDash([6, 4]);
      }
      ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
    } else if (this.tool === "ellipse") {
      ctx.beginPath(); ctx.ellipse((from.x + to.x) / 2, (from.y + to.y) / 2, Math.abs(to.x - from.x) / 2, Math.abs(to.y - from.y) / 2, 0, 0, Math.PI * 2);
      if (shapeSettings.fillEnabled) {
        ctx.setLineDash([]);
        ctx.fill();
        ctx.setLineDash([6, 4]);
      }
      ctx.stroke();
    } else if (["polygon", "star", "bezier"].includes(this.tool)) {
      this.traceConfiguredShape(ctx, this.tool, from, to, shapeSettings);
      if (this.tool !== "bezier" && shapeSettings.fillEnabled) {
        ctx.setLineDash([]);
        ctx.fill();
        ctx.setLineDash([6, 4]);
      }
      ctx.stroke();
    } else if (this.tool === "crop") {
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.clearRect(from.x, from.y, to.x - from.x, to.y - from.y);
      ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
    }
    ctx.restore();
    this.drawSelectionOverlay();
  }

  traceConfiguredShape(ctx, tool, from, to, settings) {
    ctx.beginPath();
    if (tool === "bezier") {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      const bend = distance * 0.3;
      const control = { x: (from.x + to.x) / 2 - dy / Math.max(distance, 1) * bend, y: (from.y + to.y) / 2 + dx / Math.max(distance, 1) * bend };
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
      return;
    }

    const centerX = (from.x + to.x) / 2;
    const centerY = (from.y + to.y) / 2;
    const radiusX = Math.abs(to.x - from.x) / 2;
    const radiusY = Math.abs(to.y - from.y) / 2;
    const points = tool === "star" ? 10 : Math.max(3, Math.min(12, Math.round(settings.polygonSides || 6)));
    for (let index = 0; index < points; index++) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / points;
      const radius = tool === "star" && index % 2 ? 0.45 : 1;
      const x = centerX + Math.cos(angle) * radiusX * radius;
      const y = centerY + Math.sin(angle) * radiusY * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  commitShape(from, to) {
    if (this.tool === "crop") {
      const x = Math.round(Math.max(0, Math.min(from.x, to.x)));
      const y = Math.round(Math.max(0, Math.min(from.y, to.y)));
      const width = Math.round(Math.min(this.width - x, Math.abs(to.x - from.x)));
      const height = Math.round(Math.min(this.height - y, Math.abs(to.y - from.y)));
      if (width < 2 || height < 2) return;
      this.history.snapshot("Crop");
      this.layers.forEach(layer => {
        for (const canvas of [layer.canvas, layer.mask].filter(Boolean)) {
          const source = document.createElement("canvas");
          source.width = canvas.width;
          source.height = canvas.height;
          source.getContext("2d").drawImage(canvas, 0, 0);
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(source, x, y, width, height, 0, 0, width, height);
        }
      });
      this.setDocumentSize(width, height, false);
      this.selection = null;
      this.markDirty();
      this.ui.notify("Изображение обрезано");
      return;
    }
    const layer = this.getActiveLayer();
    if (!layer) return;
    const ctx = layer.canvas.getContext("2d");
    ctx.save();
    ctx.globalAlpha = Number(document.querySelector("#brushOpacity").value) / 100;
    const shapeSettings = this.settings.values.tools.shapes;
    ctx.lineWidth = shapeSettings.width;
    ctx.strokeStyle = shapeSettings.stroke;
    ctx.fillStyle = shapeSettings.fill;
    if (this.tool === "line") { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); }
    if (this.tool === "rectangle") {
      ctx.beginPath();
      ctx.rect(from.x, from.y, to.x - from.x, to.y - from.y);
      if (shapeSettings.fillEnabled) ctx.fill();
      ctx.stroke();
    }
    if (this.tool === "ellipse") {
      ctx.beginPath();
      ctx.ellipse((from.x + to.x) / 2, (from.y + to.y) / 2, Math.abs(to.x - from.x) / 2, Math.abs(to.y - from.y) / 2, 0, 0, Math.PI * 2);
      if (shapeSettings.fillEnabled) ctx.fill();
      ctx.stroke();
    }
    if (["polygon", "star", "bezier"].includes(this.tool)) {
      this.traceConfiguredShape(ctx, this.tool, from, to, shapeSettings);
      if (this.tool !== "bezier" && shapeSettings.fillEnabled) ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    this.markDirty();
  }

  clearOverlay() {
    this.overlayCanvas.getContext("2d").clearRect(0, 0, this.width, this.height);
  }

  pickColor(point) {
    const canvas = this.buildFlatCanvas();
    const ctx = canvas.getContext("2d");
    const sample = this.settings.get("tools.eyedropper.sample");
    const radius = sample === "area" ? this.settings.get("tools.eyedropper.radius") : 1;
    const left = Math.max(0, Math.min(this.width - radius, Math.floor(point.x - radius / 2)));
    const top = Math.max(0, Math.min(this.height - radius, Math.floor(point.y - radius / 2)));
    const pixels = ctx.getImageData(left, top, radius, radius).data;
    let red = 0, green = 0, blue = 0, count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      red += pixels[i]; green += pixels[i + 1]; blue += pixels[i + 2]; count++;
    }
    if (!count) return;
    this.foreground = `#${[red, green, blue].map(v => Math.round(v / count).toString(16).padStart(2, "0")).join("")}`;
    this.updateColorControls();
  }

  getBucketWorker() {
    if (this.bucketWorker) return this.bucketWorker;
    const worker = new Worker(new URL("./bucket-worker.js", import.meta.url), { type: "module" });
    worker.addEventListener("message", event => {
      const request = this.bucketRequests.get(event.data.id);
      if (!request) return;
      this.bucketRequests.delete(event.data.id);
      if (event.data.error) request.reject(new Error(event.data.error));
      else request.resolve(new Uint8Array(event.data.mask));
    });
    worker.addEventListener("error", event => {
      const error = new Error(event.message || "Bucket worker failed");
      for (const request of this.bucketRequests.values()) request.reject(error);
      this.bucketRequests.clear();
      this.bucketWorker = null;
    });
    this.bucketWorker = worker;
    return worker;
  }

  floodFill(x, y) {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
    if (this.bucketBusy) return;
    x = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    this.bucketBusy = true;
    this.overlayCanvas.style.cursor = "progress";

    const width = this.width;
    const height = this.height;
    const bucket = { ...this.settings.values.tools.bucket };
    const fillColor = this.hexToRgb(this.foreground);
    try {
      const sourceCanvas = bucket.sampleAllLayers ? this.buildFlatCanvas() : layer.canvas;
      const sourceData = sourceCanvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, width, height);
      const id = ++this.bucketWorkerSequence;
      const worker = this.getBucketWorker();
      const maskPromise = new Promise((resolve, reject) => this.bucketRequests.set(id, { resolve, reject }));
      try {
        worker.postMessage({
          id,
          data: sourceData.data.buffer,
          width,
          height,
          x,
          y,
          tolerance: bucket.tolerance,
          grow: bucket.grow,
          gapClosing: bucket.gapClosing,
          contiguous: bucket.contiguous,
          antiAliasing: bucket.antiAliasing
        }, [sourceData.data.buffer]);
      } catch (error) {
        this.bucketRequests.delete(id);
        throw error;
      }
      maskPromise.then(mask => {
        if (this.width !== width || this.height !== height || !this.layers.includes(layer) || layer.locked) {
          this.ui.notify("Заливка отменена: документ или целевой слой изменился");
          return;
        }
        if (!mask.some(value => value > 0)) {
          this.ui.notify("В этой области нет пикселей для заливки");
          return;
        }

        const context = layer.canvas.getContext("2d", { willReadFrequently: true });
        const image = context.getImageData(0, 0, width, height);
        const data = image.data;
        let changed = false;
        for (let pixel = 0; pixel < mask.length; pixel++) {
          const coverage = mask[pixel];
          if (!coverage) continue;
          const offset = pixel * 4;
          const sourceAlpha = coverage / 255;
          const destinationAlpha = data[offset + 3] / 255;
          const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
          const red = outputAlpha ? (fillColor.r * sourceAlpha + data[offset] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha : 0;
          const green = outputAlpha ? (fillColor.g * sourceAlpha + data[offset + 1] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha : 0;
          const blue = outputAlpha ? (fillColor.b * sourceAlpha + data[offset + 2] * destinationAlpha * (1 - sourceAlpha)) / outputAlpha : 0;
          const alpha = Math.round(outputAlpha * 255);
          if (data[offset] === Math.round(red) && data[offset + 1] === Math.round(green) &&
              data[offset + 2] === Math.round(blue) && data[offset + 3] === alpha) continue;
          data[offset] = red;
          data[offset + 1] = green;
          data[offset + 2] = blue;
          data[offset + 3] = alpha;
          changed = true;
        }
        if (!changed) return;
        this.history.snapshot("Fill");
        context.putImageData(image, 0, 0);
        layer.textObject = null;
        this.markDirty();
        this.render();
      }).catch(error => {
        this.ui.notify("Не удалось выполнить заливку");
        console.error("ImageShop bucket fill failed", error);
      }).finally(() => {
        this.bucketBusy = false;
        this.overlayCanvas.style.cursor = this.tool === "fill" ? "crosshair" : "";
      });
    } catch (error) {
      this.bucketBusy = false;
      this.overlayCanvas.style.cursor = this.tool === "fill" ? "crosshair" : "";
      this.ui.notify("Не удалось подготовить заливку");
      console.error("ImageShop bucket fill setup failed", error);
    }
  }

  confirmDiscard() {
    return !this.dirty || !this.settings.get("general.confirmClose") || confirm("Документ изменён. Продолжить без сохранения?");
  }

  requestTextEntry(title, value, callback) {
    document.querySelector("#textEntryTitle").textContent = title;
    document.querySelector("#textEntryValue").value = value;
    this.pendingTextEntry = callback;
    document.querySelector("#textEntryDialog").showModal();
    document.querySelector("#textEntryValue").focus();
    document.querySelector("#textEntryValue").select();
  }

  hexToRgb(hex) {
    const value = parseInt(hex.slice(1), 16);
    return { r: value >> 16 & 255, g: value >> 8 & 255, b: value & 255 };
  }
}
