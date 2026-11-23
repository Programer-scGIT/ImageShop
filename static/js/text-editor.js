const DEFAULT_TEXT_STYLE = {
  fontFamily: "Arial",
  fontSize: 48,
  rotation: 0,
  color: "#5b9cf5",
  bold: false,
  italic: false,
  underline: false,
  align: "left"
};

export class TextEditor {
  constructor(editor) {
    this.editor = editor;
    this.dialog = document.querySelector("#textEditorDialog");
    this.preview = document.querySelector("#textPreview");
    this.previewContext = this.preview.getContext("2d");
    this.form = document.querySelector("#textEditorForm");
    this.position = null;
    this.editingLayerId = null;
    this.bind();
  }

  bind() {
    this.form.addEventListener("input", () => this.updatePreview());
    this.form.addEventListener("change", () => this.updatePreview());
    this.form.addEventListener("submit", event => {
      event.preventDefault();
      this.apply();
    });
    document.querySelectorAll("#textEditorCancel, #textEditorCancelFooter").forEach(button => {
      button.addEventListener("click", () => this.dialog.close());
    });
    document.querySelector("#textSizeRange").addEventListener("input", event => {
      document.querySelector("#textSize").value = event.target.value;
    });
    document.querySelector("#textSize").addEventListener("input", event => {
      document.querySelector("#textSizeRange").value = Math.max(8, Math.min(160, Number(event.target.value) || 8));
    });
    document.querySelector("#textRotation").addEventListener("input", event => {
      document.querySelector("#textRotationValue").value = `${event.target.value}°`;
    });
    document.querySelector("#textColor").addEventListener("input", event => {
      document.querySelector("#textColorHex").value = event.target.value.toUpperCase();
    });
    document.querySelector("#textColorHex").addEventListener("input", event => {
      const color = this.normalizeColor(event.target.value);
      if (color) document.querySelector("#textColor").value = color;
    });
  }

  getStyle(layer) {
    const saved = layer?.textObject || {};
    return {
      fontFamily: saved.fontFamily || DEFAULT_TEXT_STYLE.fontFamily,
      fontSize: saved.fontSize || DEFAULT_TEXT_STYLE.fontSize,
      rotation: saved.rotation || 0,
      color: saved.color || this.editor.foreground || DEFAULT_TEXT_STYLE.color,
      bold: saved.bold ?? false,
      italic: saved.italic ?? false,
      underline: saved.underline ?? false,
      align: saved.align || DEFAULT_TEXT_STYLE.align
    };
  }

  openAt(point) {
    this.position = { x: Math.round(point.x), y: Math.round(point.y) };
    this.editingLayerId = null;
    this.fillForm("", this.getStyle());
    this.show();
  }

  editLayer(layer) {
    if (!layer.textObject) return;
    this.position = { x: layer.textObject.x, y: layer.textObject.y };
    this.editingLayerId = layer.id;
    this.fillForm(layer.textObject.text, this.getStyle(layer));
    this.show();
  }

  show() {
    this.updatePreview();
    this.dialog.showModal();
    document.querySelector("#textValue").focus();
  }

  fillForm(text, style) {
    document.querySelector("#textValue").value = text;
    document.querySelector("#textFont").value = style.fontFamily;
    document.querySelector("#textSize").value = style.fontSize;
    document.querySelector("#textSizeRange").value = style.fontSize;
    document.querySelector("#textRotation").value = style.rotation;
    document.querySelector("#textRotationValue").value = `${style.rotation}°`;
    document.querySelector("#textColor").value = style.color;
    document.querySelector("#textColorHex").value = style.color.toUpperCase();
    document.querySelector("#textBold").checked = style.bold;
    document.querySelector("#textItalic").checked = style.italic;
    document.querySelector("#textUnderline").checked = style.underline;
    document.querySelector("#textAlign").value = style.align;
    document.querySelector("#textApply").textContent = this.editingLayerId ? "Применить изменения" : "Применить";
  }

  readStyle() {
    return {
      fontFamily: document.querySelector("#textFont").value,
      fontSize: Math.max(1, Math.min(500, Number(document.querySelector("#textSize").value) || DEFAULT_TEXT_STYLE.fontSize)),
      rotation: Number(document.querySelector("#textRotation").value),
      color: this.normalizeColor(document.querySelector("#textColorHex").value) || document.querySelector("#textColor").value,
      bold: document.querySelector("#textBold").checked,
      italic: document.querySelector("#textItalic").checked,
      underline: document.querySelector("#textUnderline").checked,
      align: document.querySelector("#textAlign").value
    };
  }

  normalizeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value) ? value : null;
  }

  updatePreview() {
    const number = Number(document.querySelector("#textSize").value) || DEFAULT_TEXT_STYLE.fontSize;
    document.querySelector("#textSizeRange").value = Math.max(8, Math.min(160, number));
    const text = document.querySelector("#textValue").value;
    const style = this.readStyle();
    const context = this.previewContext;
    context.clearRect(0, 0, this.preview.width, this.preview.height);
    if (!text) return;
    const family = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(style.fontFamily)
      ? style.fontFamily
      : `"${style.fontFamily}"`;
    context.font = `${style.italic ? "italic " : ""}${style.bold ? "bold " : ""}${style.fontSize}px ${family}`;
    const lines = text.split(/\r?\n/);
    const width = Math.max(1, ...lines.map(line => context.measureText(line).width));
    const height = lines.length * style.fontSize * 1.2;
    const radians = style.rotation * Math.PI / 180;
    const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
    const rotatedHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
    const scale = Math.min(1, (this.preview.width - 32) / rotatedWidth, (this.preview.height - 32) / rotatedHeight);
    const x = style.align === "left" ? -width / 2 : style.align === "right" ? width / 2 : 0;
    context.save();
    context.translate(this.preview.width / 2, this.preview.height / 2);
    context.scale(scale, scale);
    this.drawText(context, text, style, x, -height / 2, false);
    context.restore();
  }

  drawText(context, text, style, x, y, clear = true) {
    if (clear) context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    if (!text) return;
    context.save();
    context.translate(x, y);
    context.rotate(style.rotation * Math.PI / 180);
    context.fillStyle = style.color;
    context.textAlign = style.align;
    context.textBaseline = "top";
    const family = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(style.fontFamily)
      ? style.fontFamily
      : `"${style.fontFamily}"`;
    context.font = `${style.italic ? "italic " : ""}${style.bold ? "bold " : ""}${style.fontSize}px ${family}`;
    const lineHeight = style.fontSize * 1.2;
    const underlineY = style.fontSize * 1.08;
    text.split(/\r?\n/).forEach((line, index) => {
      const lineY = index * lineHeight;
      context.fillText(line, 0, lineY);
      if (style.underline) {
        const width = context.measureText(line).width;
        const start = style.align === "center" ? -width / 2 : style.align === "right" ? -width : 0;
        context.fillRect(start, lineY + underlineY, width, Math.max(1, style.fontSize / 18));
      }
    });
    context.restore();
  }

  containsPoint(layer, point) {
    const object = layer.textObject;
    if (!object) return false;
    const context = layer.canvas.getContext("2d");
    const style = this.getStyle(layer);
    const family = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(style.fontFamily)
      ? style.fontFamily
      : `"${style.fontFamily}"`;
    context.font = `${style.italic ? "italic " : ""}${style.bold ? "bold " : ""}${style.fontSize}px ${family}`;
    const lines = object.text.split(/\r?\n/);
    const width = Math.max(0, ...lines.map(line => context.measureText(line).width));
    const height = lines.length * style.fontSize * 1.2;
    const dx = point.x - object.x;
    const dy = point.y - object.y;
    const angle = -style.rotation * Math.PI / 180;
    const x = dx * Math.cos(angle) - dy * Math.sin(angle);
    const y = dx * Math.sin(angle) + dy * Math.cos(angle);
    const left = style.align === "center" ? -width / 2 : style.align === "right" ? -width : 0;
    return x >= left - 3 && x <= left + width + 3 && y >= -3 && y <= height + 3;
  }

  apply() {
    const text = document.querySelector("#textValue").value;
    if (!text.trim()) {
      document.querySelector("#textValue").focus();
      return;
    }
    const style = this.readStyle();
    const layer = this.editingLayerId
      ? this.editor.layers.find(item => item.id === this.editingLayerId)
      : null;
    if (this.editingLayerId && (!layer || layer.locked)) {
      this.editor.ui.notify("Текстовый слой недоступен для редактирования");
      this.dialog.close();
      return;
    }

    this.editor.history.snapshot(this.editingLayerId ? "Edit text" : "Add text");
    const target = layer || this.editor.layersManager.make(this.layerName(text));
    const ctx = target.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.editor.width, this.editor.height);
    this.drawText(ctx, text, style, this.position.x, this.position.y);
    target.name = this.layerName(text);
    target.textObject = { text, ...style, x: this.position.x, y: this.position.y };

    if (!layer) this.editor.layers.unshift(target);
    this.editor.activeLayerId = target.id;
    this.editor.markDirty();
    this.editor.render();
    this.dialog.close();
  }

  layerName(text) {
    const firstLine = text.split(/\r?\n/, 1)[0].trim();
    return `Текст: ${firstLine.slice(0, 24) || "Новый текст"}`;
  }
}
