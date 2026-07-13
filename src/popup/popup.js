// Knowledge Book — popup

const SETTINGS_KEY = "kb_settings";
const ENTRIES_KEY = "kb_entries";

function get(key) {
  return new Promise((resolve) => chrome.storage.local.get(key, (d) => resolve(d[key])));
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}

async function render() {
  const settings = (await get(SETTINGS_KEY)) || {};
  const entries = (await get(ENTRIES_KEY)) || [];

  const statusEl = document.getElementById("pk-status");
  const hasKey = settings.apiKey && settings.apiKey.trim();
  const aiOn = settings.useAI === true;
  const n = entries.length;
  if (!hasKey) {
    statusEl.textContent = n + " notes · add a key to unlock Ask";
  } else if (aiOn) {
    statusEl.textContent = n + " notes · Ask + AI summaries on";
  } else {
    statusEl.textContent = n + " notes · Ask your book enabled";
  }

  const list = document.getElementById("pk-list");
  if (!entries.length) return;
  list.innerHTML = "";
  entries.slice(0, 5).forEach((e) => {
    const item = document.createElement("div");
    item.className = "pk-item";
    const h = document.createElement("h3");
    h.textContent = (e.note?.title || "Saved text")
      .replace(/^\s*#{1,6}\s+/, "")
      .replace(/^\s*>\s+/, "")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/[*_`]/g, "")
      .trim() || "Saved text";
    const p = document.createElement("p");
    p.textContent = e.note?.summary || e.original?.slice(0, 120) || "";
    const meta = document.createElement("div");
    meta.className = "pk-meta";
    meta.textContent = (e.source || "Web") + " · " + timeAgo(e.createdAt);
    item.append(h, p, meta);
    item.addEventListener("click", openBook);
    list.appendChild(item);
  });
}

function openBook() {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/book/book.html") });
}

document.getElementById("pk-open").addEventListener("click", openBook);
document.getElementById("pk-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

render();
