// Knowledge Book — settings

const SETTINGS_KEY = "kb_settings";
const DEFAULTS = {
  apiKey: "",
  model: "openai/gpt-4o-mini",
  useAI: false,
  customPrompt: "",
  defaultPage: "Inbox",
  obsidianVault: "",
  obsidianFolder: "Knowledge Book",
  groupSamePage: true
};

const els = {
  apiKey: document.getElementById("apiKey"),
  model: document.getElementById("model"),
  useAI: document.getElementById("useAI"),
  customPrompt: document.getElementById("customPrompt"),
  defaultPage: document.getElementById("defaultPage"),
  groupSamePage: document.getElementById("groupSamePage"),
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
    els.groupSamePage.checked = s.groupSamePage !== false;
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
    groupSamePage: els.groupSamePage.checked,
    obsidianVault: els.obsidianVault.value.trim(),
    obsidianFolder: els.obsidianFolder.value.trim()
  };
  chrome.storage.local.set({ [SETTINGS_KEY]: s }, () => {
    els.saved.classList.add("show");
    setTimeout(() => els.saved.classList.remove("show"), 1800);
  });
}

els.save.addEventListener("click", save);

// ---------- backup & restore ----------
const ENTRIES_KEY = "kb_entries";
const PAGES_KEY = "kb_pages";
const statusEl = document.getElementById("restoreStatus");

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

document.getElementById("backup").addEventListener("click", () => {
  chrome.storage.local.get([SETTINGS_KEY, ENTRIES_KEY, PAGES_KEY, "kb_theme"], (d) => {
    const settings = { ...(d[SETTINGS_KEY] || {}) };
    delete settings.apiKey; // never write the key to a plain file
    const payload = {
      app: "knowledge-book",
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: Array.isArray(d[ENTRIES_KEY]) ? d[ENTRIES_KEY] : [],
      pages: Array.isArray(d[PAGES_KEY]) ? d[PAGES_KEY] : [],
      settings,
      theme: d.kb_theme || null
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const day = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = "knowledge-book-backup-" + day + ".json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Backup downloaded (" + payload.entries.length + " notes).");
  });
});

const fileInput = document.getElementById("restoreFile");
document.getElementById("restore").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(String(reader.result));
    } catch (_) {
      setStatus("That file isn't valid JSON.");
      return;
    }
    if (!data || data.app !== "knowledge-book" || !Array.isArray(data.entries)) {
      setStatus("That doesn't look like a Knowledge Book backup.");
      return;
    }
    chrome.storage.local.get([SETTINGS_KEY, ENTRIES_KEY, PAGES_KEY], (d) => {
      const current = Array.isArray(d[ENTRIES_KEY]) ? d[ENTRIES_KEY] : [];
      const have = new Set(current.map((e) => e && e.id).filter(Boolean));
      const incoming = data.entries.filter((e) => e && e.id && !have.has(e.id));
      const merged = current.concat(incoming).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const curPages = Array.isArray(d[PAGES_KEY]) ? d[PAGES_KEY] : [];
      const pages = curPages.slice();
      (Array.isArray(data.pages) ? data.pages : []).forEach((p) => {
        if (p && !pages.includes(p)) pages.push(p);
      });

      // restore settings, but never touch the existing API key
      const curSettings = { ...(d[SETTINGS_KEY] || {}) };
      const restored = { ...curSettings, ...(data.settings || {}) };
      restored.apiKey = curSettings.apiKey || "";

      const toSet = { [ENTRIES_KEY]: merged, [PAGES_KEY]: pages, [SETTINGS_KEY]: restored };
      if (data.theme === "dark" || data.theme === "light") toSet.kb_theme = data.theme;

      chrome.storage.local.set(toSet, () => {
        setStatus(
          "Restored: " + incoming.length + " new note" + (incoming.length === 1 ? "" : "s") +
          ", " + pages.length + " notebook" + (pages.length === 1 ? "" : "s") + " total."
        );
        load(); // refresh the form with restored settings
      });
    });
    fileInput.value = "";
  };
  reader.readAsText(file);
});

load();
