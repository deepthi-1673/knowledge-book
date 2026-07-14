// Knowledge Book — settings

const SETTINGS_KEY = "kb_settings";
const DEFAULTS = {
  apiKey: "",
  model: "openai/gpt-4o-mini",
  useAI: false,
  customPrompt: "",
  defaultPage: "Inbox",
  obsidianVault: "",
  obsidianFolder: "Knowledge Book"
};

const els = {
  apiKey: document.getElementById("apiKey"),
  model: document.getElementById("model"),
  useAI: document.getElementById("useAI"),
  customPrompt: document.getElementById("customPrompt"),
  defaultPage: document.getElementById("defaultPage"),
  obsidianVault: document.getElementById("obsidianVault"),
  obsidianFolder: document.getElementById("obsidianFolder"),
  save: document.getElementById("save"),
  saved: document.getElementById("saved")
};

function load() {
  chrome.storage.local.get("kb_theme", (d) => {
    const t = d.kb_theme;
    if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
  });
  chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const s = { ...DEFAULTS, ...(data[SETTINGS_KEY] || {}) };
    els.apiKey.value = s.apiKey;
    els.model.value = s.model || "openai/gpt-4o-mini";
    els.useAI.checked = s.useAI !== false;
    els.customPrompt.value = s.customPrompt || "";
    els.defaultPage.value = s.defaultPage || "Inbox";
    els.obsidianVault.value = s.obsidianVault || "";
    els.obsidianFolder.value = s.obsidianFolder || "";
  });
}

function save() {
  const s = {
    apiKey: els.apiKey.value.trim(),
    model: els.model.value.trim() || "openai/gpt-4o-mini",
    useAI: els.useAI.checked,
    customPrompt: els.customPrompt.value.trim(),
    defaultPage: els.defaultPage.value.trim() || "Inbox",
    obsidianVault: els.obsidianVault.value.trim(),
    obsidianFolder: els.obsidianFolder.value.trim()
  };
  chrome.storage.local.set({ [SETTINGS_KEY]: s }, () => {
    els.saved.classList.add("show");
    setTimeout(() => els.saved.classList.remove("show"), 1800);
  });
}

els.save.addEventListener("click", save);
load();
