// Knowledge Book — popup (Field Journal)

const SETTINGS_KEY = "kb_settings";
const ENTRIES_KEY = "kb_entries";
const THEME_KEY = "kb_theme";

function get(key) {
  return new Promise((resolve) => chrome.storage.local.get(key, (d) => resolve(d[key])));
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + " min ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}

function fmtShort(ts) {
  const d = new Date(ts);
  return d.getDate() + " " + d.toLocaleDateString(undefined, { month: "short" });
}

function cleanTitle(t) {
  return (
    (t || "Saved text")
      .replace(/^\s*#{1,6}\s+/, "")
      .replace(/^\s*>\s+/, "")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/[*_`]/g, "")
      .trim() || "Saved text"
  );
}

async function render() {
  const theme = await get(THEME_KEY);
  if (theme === "dark" || theme === "light") document.documentElement.dataset.theme = theme;

  const settings = (await get(SETTINGS_KEY)) || {};
  const entries = (await get(ENTRIES_KEY)) || [];

  const statusEl = document.getElementById("pk-status");
  const n = entries.length;
  const notesPart = n + (n === 1 ? " note" : " notes");
  const savePart = n ? " · last save " + timeAgo(entries[0].createdAt) : "";
  const hasKey = settings.apiKey && settings.apiKey.trim();
  statusEl.textContent = hasKey ? notesPart + savePart : notesPart + " · add a key to unlock Ask";

  const list = document.getElementById("pk-list");
  if (!entries.length) return;
  list.innerHTML = "";
  entries.slice(0, 5).forEach((e) => {
    const item = document.createElement("div");
    item.className = "pk-item";

    const top = document.createElement("div");
    top.className = "pk-item-top";
    const src = document.createElement("span");
    src.className = "pk-src " + (e.source || "Web");
    src.textContent = e.source || "Web";
    const date = document.createElement("span");
    date.className = "pk-date";
    date.textContent = fmtShort(e.createdAt);
    top.append(src, date);

    const h = document.createElement("h3");
    h.textContent = cleanTitle(e.note?.title);

    item.append(top, h);
    item.addEventListener("click", openBook);
    list.appendChild(item);
  });
}

function openBook() {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/book/book.html") });
}

document.getElementById("pk-open").addEventListener("click", openBook);
document.getElementById("pk-seeall").addEventListener("click", openBook);
document.getElementById("pk-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

render();
