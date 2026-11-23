export class UI {
  constructor(editor) {
    this.editor = editor;
    this.thumbnailQueue = [];
    this.thumbnailFrame = null;
    this.thumbnailGeneration = 0;
    document.addEventListener("pointerdown", event => {
      if (!event.target.closest(".tool-group")) this.closeToolGroup();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && document.querySelector(".tool-group.is-open")) {
        this.closeToolGroup();
        document.querySelector(".tool-group-current")?.focus();
      }
    });
  }

  notify(message) {
    const node = document.createElement("div");
    node.className = "notification";
    node.textContent = message;
    document.querySelector("#notifications").append(node);
    setTimeout(() => node.remove(), 2600);
  }

  showContextMenu(x, y, items) {
    const menu = document.querySelector("#contextMenu");
    menu.innerHTML = "";
    items.forEach(item => {
      const button = document.createElement("button");
      button.textContent = item.label;
      button.onclick = () => { menu.style.display = "none"; item.action(); };
      menu.append(button);
    });
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = "block";
  }

  renderTools() {
    const container = document.querySelector("#tools");
    container.innerHTML = "";
    const groups = [
      { ids: ["selectRect", "lasso"], name: "Выделение", toggleLabel: "Другие инструменты выделения" },
      { ids: ["brush", "pencil", "pixelBrush", "marker", "airbrush", "glowBrush", "eraser"], name: "Инструменты рисования", toggleLabel: "Другие инструменты рисования" },
      { ids: ["line", "rectangle", "ellipse", "polygon", "star", "bezier"], name: "Фигуры", toggleLabel: "Другие фигуры" }
    ];
    const renderedGroups = new Set();
    for (const [id, label, icon, defaultShortcut] of this.editor.toolDefs) {
      const group = groups.find(candidate => candidate.ids.includes(id));
      if (group) {
        if (!renderedGroups.has(group.name)) {
          container.append(this.renderToolGroup(group.ids, group.name, group.toggleLabel));
          renderedGroups.add(group.name);
        }
        continue;
      }
      const button = document.createElement("button");
      button.className = `tool-button${id === this.editor.tool ? " active" : ""}`;
      button.dataset.tool = id;
      const shortcut = this.editor.settings.get(`shortcuts.${id}`) || defaultShortcut;
      button.dataset.tooltip = `${label} · ${shortcut}`;
      button.setAttribute("aria-label", `${label}, клавиша ${shortcut}`);
      button.textContent = icon;
      button.onclick = () => this.editor.selectTool(id);
      container.append(button);
    }
  }

  renderToolGroup(ids, name, toggleLabel) {
    const definitions = this.editor.toolDefs.filter(([id]) => ids.includes(id));
    const current = definitions.find(([id]) => id === this.editor.tool) || definitions[0];
    const group = document.createElement("div");
    group.className = "tool-group";
    const currentButton = document.createElement("button");
    currentButton.type = "button";
    currentButton.className = `tool-button tool-group-current${current[0] === this.editor.tool ? " active" : ""}`;
    currentButton.dataset.tool = current[0];
    const currentShortcut = this.editor.settings.get(`shortcuts.${current[0]}`) || current[3];
    currentButton.dataset.tooltip = `${current[1]} · ${currentShortcut}`;
    currentButton.setAttribute("aria-label", `${current[1]}, клавиша ${currentShortcut}`);
    currentButton.textContent = current[2];
    currentButton.onclick = () => this.editor.selectTool(current[0]);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tool-group-toggle";
    toggle.textContent = "▾";
    toggle.setAttribute("aria-label", toggleLabel);
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.onclick = event => {
      event.stopPropagation();
      const open = group.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open || group.matches(":hover")));
    };
    const updateExpanded = () => toggle.setAttribute("aria-expanded", String(
      group.classList.contains("is-open") || group.matches(":hover")
    ));
    group.addEventListener("pointerenter", updateExpanded);
    group.addEventListener("pointerleave", updateExpanded);

    const submenu = document.createElement("div");
    submenu.className = "tool-submenu";
    submenu.setAttribute("role", "group");
    submenu.setAttribute("aria-label", name);
    for (const [id, label, icon, defaultShortcut] of definitions) {
      const button = document.createElement("button");
      const shortcut = this.editor.settings.get(`shortcuts.${id}`) || defaultShortcut;
      button.type = "button";
      button.className = `tool-submenu-item${id === current[0] ? " active" : ""}`;
      button.dataset.tool = id;
      button.setAttribute("aria-label", `${label}, клавиша ${shortcut}`);
      const iconNode = document.createElement("span");
      iconNode.className = "tool-submenu-icon";
      iconNode.setAttribute("aria-hidden", "true");
      iconNode.textContent = icon;
      const labelNode = document.createElement("span");
      labelNode.textContent = label;
      const shortcutNode = document.createElement("kbd");
      shortcutNode.textContent = shortcut;
      button.append(iconNode, labelNode, shortcutNode);
      button.onclick = () => {
        group.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", String(group.matches(":hover")));
        this.editor.selectTool(id);
      };
      submenu.append(button);
    }

    group.append(currentButton, toggle, submenu);
    return group;
  }

  closeToolGroup() {
    document.querySelectorAll(".tool-group.is-open").forEach(group => {
      group.classList.remove("is-open");
      const toggle = group.querySelector(".tool-group-toggle");
      toggle?.setAttribute("aria-expanded", String(group.matches(":hover")));
    });
  }

  renderLayers() {
    const list = document.querySelector("#layerList");
    list.innerHTML = "";
    const showThumbnails = this.editor.settings.get("layers.thumbnails");
    const thumbnailSize = this.editor.settings.get("layers.thumbnailSize");
    const generation = ++this.thumbnailGeneration;
    this.thumbnailQueue = [];
    this.editor.layers.forEach(layer => {
      const item = document.createElement("div");
      item.className = `layer-item${layer.id === this.editor.activeLayerId ? " active" : ""}${showThumbnails ? "" : " no-thumb"}`;
      item.dataset.id = layer.id;
      item.draggable = true;
      item.style.gridTemplateColumns = `24px ${showThumbnails ? `${thumbnailSize}px` : "0px"} minmax(0,1fr) 34px 22px ${layer.textObject ? "22px " : ""}24px`;
      let thumb = null;
      if (showThumbnails) {
        thumb = document.createElement("canvas");
        thumb.width = thumbnailSize;
        thumb.height = thumbnailSize;
        thumb.className = "layer-thumb";
        thumb.style.width = `${thumbnailSize}px`;
        thumb.style.height = `${thumbnailSize}px`;
        this.thumbnailQueue.push({ canvas: thumb, source: layer.canvas, generation });
      }
      const eye = document.createElement("button");
      eye.className = "layer-eye";
      eye.textContent = layer.visible ? "◉" : "○";
      eye.title = "Показать/скрыть";
      eye.onclick = event => { event.stopPropagation(); this.editor.layersManager.toggleVisible(layer); };
      const lock = document.createElement("button");
      lock.className = "layer-lock";
      lock.textContent = layer.locked ? "▣" : "□";
      lock.title = "Блокировка";
      if (layer.locked) lock.style.color = this.editor.settings.get("layers.lockedColor");
      const name = document.createElement("span");
      name.className = "layer-name";
      name.textContent = layer.name;
      lock.onclick = event => { event.stopPropagation(); this.editor.layersManager.toggleLocked(layer); };
      const order = document.createElement("span");
      order.className = "layer-order";
      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "↑";
      up.title = "Переместить выше";
      up.setAttribute("aria-label", "Переместить слой выше");
      up.disabled = this.editor.layers.indexOf(layer) === 0;
      up.onclick = event => { event.stopPropagation(); this.editor.layersManager.move(layer, -1); };
      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "↓";
      down.title = "Переместить ниже";
      down.setAttribute("aria-label", "Переместить слой ниже");
      down.disabled = this.editor.layers.indexOf(layer) === this.editor.layers.length - 1;
      down.onclick = event => { event.stopPropagation(); this.editor.layersManager.move(layer, 1); };
      order.append(up, down);
      item.append(eye);
      if (thumb) item.append(thumb);
      else item.append(Object.assign(document.createElement("span"), { className: "layer-thumb-placeholder" }));
      item.append(name, order);
      const maskButton = document.createElement("button");
      maskButton.type = "button";
      maskButton.className = `layer-mask-button${this.editor.editingMaskLayerId === layer.id ? " active" : ""}`;
      maskButton.textContent = layer.mask ? "M" : "+";
      maskButton.title = layer.mask ? "Редактировать маску слоя" : "Добавить маску слоя";
      maskButton.setAttribute("aria-label", maskButton.title);
      maskButton.onclick = event => {
        event.stopPropagation();
        if (layer.mask) this.editor.layersManager.toggleMaskEditing(layer);
        else this.editor.layersManager.addMask(layer);
      };
      item.append(maskButton);
      if (layer.textObject) {
        const editText = document.createElement("button");
        editText.type = "button";
        editText.className = "layer-edit-text";
        editText.textContent = "T";
        editText.title = "Редактировать текст";
        editText.setAttribute("aria-label", "Редактировать текстовый слой");
        editText.onclick = event => { event.stopPropagation(); this.editor.textEditor.editLayer(layer); };
        item.append(editText);
      } else item.append(Object.assign(document.createElement("span"), { className: "layer-edit-placeholder" }));
      item.append(lock);
      const opacity = document.createElement("input");
      opacity.type = "range";
      opacity.className = "layer-opacity";
      opacity.min = "0";
      opacity.max = "100";
      opacity.value = String(Math.round(layer.opacity * 100));
      opacity.title = `Непрозрачность слоя: ${opacity.value}%`;
      opacity.setAttribute("aria-label", `Непрозрачность слоя ${layer.name}`);
      opacity.onpointerdown = () => this.editor.beginLayerOpacityChange(layer);
      opacity.oninput = () => {
        this.editor.setLayerOpacity(layer, Number(opacity.value) / 100);
        opacity.title = `Непрозрачность слоя: ${opacity.value}%`;
      };
      opacity.onchange = () => this.editor.finishLayerOpacityChange();
      opacity.onclick = event => event.stopPropagation();
      item.append(opacity);
      item.onclick = () => { this.editor.activeLayerId = layer.id; this.editor.render(); };
      item.ondblclick = () => this.editor.layersManager.rename(layer);
      item.addEventListener("dragstart", event => {
        if (event.target.closest("button, input")) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/plain", layer.id);
        event.dataTransfer.effectAllowed = "move";
        item.classList.add("dragging");
      });
      item.addEventListener("dragend", () => item.classList.remove("dragging"));
      item.addEventListener("dragover", event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });
      item.addEventListener("drop", event => {
        event.preventDefault();
        const source = this.editor.layers.find(candidate => candidate.id === event.dataTransfer.getData("text/plain"));
        if (source && source !== layer) this.editor.layersManager.moveTo(source, this.editor.layers.indexOf(layer));
      });
      list.append(item);
    });
    this.processThumbnailQueue(generation);
  }

  processThumbnailQueue(generation) {
    if (this.thumbnailFrame !== null) cancelAnimationFrame(this.thumbnailFrame);
    const processFrame = () => {
      if (generation !== this.thumbnailGeneration) return;
      const limit = this.editor.settings.get("performance.backgroundOperations");
      for (let count = 0; count < limit && this.thumbnailQueue.length; count++) {
        const item = this.thumbnailQueue.shift();
        if (item.generation !== generation || !item.canvas.isConnected) continue;
        const size = item.canvas.width;
        const scale = Math.min(size / this.editor.width, size / this.editor.height);
        const ctx = item.canvas.getContext("2d");
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(item.source, 0, 0, this.editor.width * scale, this.editor.height * scale);
      }
      if (this.thumbnailQueue.length) this.thumbnailFrame = requestAnimationFrame(processFrame);
      else this.thumbnailFrame = null;
    };
    if (this.thumbnailQueue.length) this.thumbnailFrame = requestAnimationFrame(processFrame);
  }

  bindTabs() {
    document.querySelectorAll(".panel-tabs button").forEach(button => {
      button.onclick = () => {
        document.querySelectorAll(".panel-tabs button").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        button.classList.add("active");
        document.querySelector(`#${button.dataset.tab}Panel`).classList.add("active");
      };
    });
  }
}
