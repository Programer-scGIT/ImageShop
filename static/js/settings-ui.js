import { DEFAULT_SETTINGS, ENGLISH_CATEGORIES, ENGLISH_SETTING_LABELS, ENGLISH_UI_TEXT, LOCALE_UI_TEXT, SETTING_CATEGORIES, SETTING_FIELDS, SHORTCUTS } from "./settings.js";

export class SettingsUI {
  constructor(editor) {
    this.editor = editor;
    this.settings = editor.settings;
    this.category = "general";
    this.query = "";
    this.bind();
  }

  bind() {
    document.querySelector("#themeButton").onclick = () => this.open();
    document.querySelector("#settingsClose").onclick = () => document.querySelector("#settingsDialog").close();
    document.querySelector("#settingsReset").onclick = () => {
      if (!confirm("Сбросить все настройки ImageShop?")) return;
      this.settings.reset();
      this.render();
      this.editor.ui.notify("Настройки сброшены");
    };
    document.querySelector("#settingsSearch").addEventListener("input", event => {
      this.query = event.target.value.trim().toLocaleLowerCase();
      this.render();
    });
    document.querySelector("#settingsContent").addEventListener("click", event => {
      if (!event.target.closest("#settingsResetWorkspace")) return;
      this.settings.set("workspace.leftVisible", true);
      this.settings.set("workspace.rightVisible", true);
      this.settings.set("workspace.topVisible", true);
      this.settings.set("workspace.leftWidth", DEFAULT_SETTINGS.workspace.leftWidth);
      this.settings.set("workspace.rightWidth", DEFAULT_SETTINGS.workspace.rightWidth);
      this.render();
      this.editor.ui.notify("Расположение панелей сброшено");
    });
    document.querySelector("#settingsContent").addEventListener("input", event => this.onSettingChange(event));
    document.querySelector("#settingsContent").addEventListener("change", event => this.onSettingChange(event));
    document.addEventListener("imageshop-language-changed", () => this.render());
    this.render();
  }

  language() {
    return this.settings.get("general.language");
  }

  translate(text) {
    const language = this.language();
    const russian = Object.entries(ENGLISH_UI_TEXT).find(([key, english]) => english === text)?.[0] || text;
    if (language === "ru") return russian;
    if (language === "en") return ENGLISH_UI_TEXT[russian] || text;
    return LOCALE_UI_TEXT[language]?.[russian] || ENGLISH_SETTING_LABELS[text] || ENGLISH_UI_TEXT[russian] || text;
  }

  categoryLabel(id, russian) {
    return this.translate(russian) || ENGLISH_CATEGORIES[id];
  }

  localizedText(text) {
    return this.translate(text);
  }

  open() {
    document.querySelector("#settingsDialog").showModal();
    document.querySelector("#settingsSearch").focus();
  }

  render() {
    const nav = document.querySelector("#settingsNav");
    const content = document.querySelector("#settingsContent");
    nav.innerHTML = "";
    content.innerHTML = "";
    for (const [id, label] of SETTING_CATEGORIES) {
      const button = document.createElement("button");
      button.className = `settings-nav-item${id === this.category ? " active" : ""}`;
      button.textContent = this.categoryLabel(id, label);
      button.onclick = () => { this.category = id; this.query = ""; document.querySelector("#settingsSearch").value = ""; this.render(); };
      nav.append(button);
    }

    const heading = document.createElement("h2");
    heading.textContent = this.query
      ? this.translate("Результаты поиска")
      : this.categoryLabel(this.category, SETTING_CATEGORIES.find(([id]) => id === this.category)?.[1]);
    content.append(heading);
    if (this.category === "workspace" && !this.query) {
      const resetLayout = document.createElement("button");
      resetLayout.className = "settings-secondary-button";
      resetLayout.textContent = this.translate("Сбросить расположение панелей");
      resetLayout.id = "settingsResetWorkspace";
      content.append(resetLayout);
    }
    if (this.category === "shortcuts" && !this.query) {
      this.renderShortcuts(content);
    } else {
      const fields = this.query
        ? Object.entries(SETTING_FIELDS).flatMap(([category, items]) => items
          .filter(field => `${field.label} ${field.path} ${field.keywords || ""} ${SETTING_CATEGORIES.find(([id]) => id === category)?.[1]}`.toLocaleLowerCase().includes(this.query))
          .map(field => ({ ...field, category })))
        : (SETTING_FIELDS[this.category] || []).map(field => ({ ...field, category: this.category }));
      if (this.query) {
        const shortcutMatches = SHORTCUTS.filter(([id, label]) => `${label} ${id}`.toLocaleLowerCase().includes(this.query));
        if (shortcutMatches.length) this.renderShortcuts(content, shortcutMatches);
      }
      if (!fields.length && (!this.query || !SHORTCUTS.some(([id, label]) => `${label} ${id}`.toLocaleLowerCase().includes(this.query)))) {
        const empty = document.createElement("p");
        empty.className = "settings-empty";
        empty.textContent = this.translate("Настройки не найдены");
        content.append(empty);
      }
      fields.forEach(field => content.append(this.makeField(field)));
    }
  }

  makeField(field) {
    const row = document.createElement("label");
    row.className = "setting-row";
    row.dataset.settingPath = field.path;
    if (field.when && (field.when === "tools.eyedropper.sample" ? this.settings.get(field.when) !== "area" : !this.settings.get(field.when))) row.hidden = true;
    const description = document.createElement("span");
    description.className = "setting-description";
    description.textContent = this.language() === "ru" ? field.label
      : this.language() === "en" ? ENGLISH_SETTING_LABELS[field.path] || field.label
        : LOCALE_UI_TEXT[this.language()]?.[field.label] || ENGLISH_SETTING_LABELS[field.path] || field.label;
    row.append(description);

    let control;
    const value = this.settings.get(field.path);
    if (field.type === "toggle") {
      const shell = document.createElement("span");
      shell.className = "setting-toggle";
      control = document.createElement("input");
      control.type = "checkbox";
      control.checked = Boolean(value);
      shell.append(control);
      row.append(shell);
    } else if (field.type === "select") {
      control = document.createElement("select");
      field.options.forEach(([optionValue, label]) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = this.localizedText(label);
        option.selected = String(value) === String(optionValue);
        control.append(option);
      });
      row.append(control);
    } else {
      control = document.createElement("input");
      control.type = field.type === "range" ? "range" : field.type;
      control.value = value;
      if (field.min !== undefined) control.min = field.min;
      if (field.max !== undefined) control.max = field.max;
      if (field.step !== undefined) control.step = field.step;
      if (field.type === "range") {
        const valueLabel = document.createElement("output");
        valueLabel.className = "setting-value";
        valueLabel.textContent = `${value}${field.suffix || ""}`;
        control.dataset.suffix = field.suffix || "";
        control.addEventListener("input", () => { valueLabel.textContent = `${control.value}${control.dataset.suffix}`; });
        const wrapper = document.createElement("span");
        wrapper.className = "setting-range";
        wrapper.append(valueLabel, control);
        row.append(wrapper);
      } else {
        if (field.type === "color") control.className = "setting-color";
        row.append(control);
      }
    }
    control.dataset.settingPath = field.path;
    return row;
  }

  renderShortcuts(container, selected = SHORTCUTS) {
    const existing = document.createElement("p");
    existing.className = "settings-help";
    existing.textContent = this.translate("Нажмите на комбинацию и введите новую. Повторяющиеся сочетания будут отмечены и отклонены.");
    container.append(existing);
    selected.forEach(([id, label]) => {
      const row = document.createElement("div");
      row.className = "shortcut-row";
      const name = document.createElement("span");
      name.textContent = this.language() === "en" ? ({
        "Кисть": "Brush", "Карандаш": "Pencil", "Ластик": "Eraser", "Рука": "Hand",
        "Отменить": "Undo", "Повторить": "Redo",
        "Сохранить проект": "Save", "Открыть изображение": "Open", "Новый документ": "New document",
        "Увеличить масштаб": "Zoom in", "Уменьшить масштаб": "Zoom out"
      }[label] || label) : this.translate(label);
      const key = document.createElement("button");
      key.type = "button";
      key.className = "shortcut-key";
      key.textContent = this.settings.get(`shortcuts.${id}`);
      key.onclick = () => {
        key.textContent = "Нажмите клавиши…";
        key.classList.add("recording");
        const capture = event => {
          event.preventDefault();
          event.stopPropagation();
          const value = this.normalizeShortcut(event);
          if (!value) {
            key.textContent = "Нажмите клавиши…";
            return;
          }
          key.removeEventListener("keydown", capture);
          key.classList.remove("recording");
          const conflict = SHORTCUTS.find(([otherId]) => otherId !== id && this.settings.get(`shortcuts.${otherId}`) === value);
          if (conflict) {
            key.textContent = `Конфликт: ${conflict[1]}`;
            key.classList.add("shortcut-conflict");
            setTimeout(() => { key.textContent = this.settings.get(`shortcuts.${id}`); key.classList.remove("shortcut-conflict"); }, 1600);
          } else {
            this.settings.set(`shortcuts.${id}`, value);
            key.textContent = value;
          }
        };
        key.addEventListener("keydown", capture);
        key.focus();
      };
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "shortcut-reset";
      reset.textContent = this.translate("Сбросить");
      reset.onclick = () => {
        this.settings.set(`shortcuts.${id}`, DEFAULT_SETTINGS.shortcuts[id]);
        this.render();
      };
      row.append(name, key, reset);
      container.append(row);
    });
  }

  normalizeShortcut(event) {
    const key = event.key.toLowerCase();
    if (["control", "shift", "alt", "meta"].includes(key)) return "";
    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push("ctrl");
    if (event.altKey) parts.push("alt");
    if (event.shiftKey && key.length > 1) parts.push("shift");
    parts.push(key === " " ? "space" : key);
    return parts.join("+");
  }

  onSettingChange(event) {
    const control = event.target.closest("[data-setting-path]");
    if (!control) return;
    const field = Object.values(SETTING_FIELDS).flat().find(item => item.path === control.dataset.settingPath);
    const value = field?.type === "toggle" ? control.checked : control.value;
    if (!this.settings.set(control.dataset.settingPath, value)) {
      this.editor.ui.notify("Недопустимое значение настройки");
      return;
    }
    if (field?.path === "tools.brush.color") this.editor.foreground = value;
    if (field?.path === "tools.brush.color") this.editor.updateColorControls();
    this.refreshConditionalSettings();
  }

  refreshConditionalSettings() {
    document.querySelectorAll(".setting-row[data-setting-path]").forEach(row => {
      const field = Object.values(SETTING_FIELDS).flat().find(item => item.path === row.dataset.settingPath);
      if (field?.when) {
        const value = this.settings.get(field.when);
        row.hidden = field.when === "tools.eyedropper.sample" ? value !== "area" : !value;
      }
    });
  }
}
