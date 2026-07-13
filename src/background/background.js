// Knowledge Book — background service worker
// Handles: context menu, capture messages from content scripts, OpenAI summarization, storage.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

const SETTINGS_KEY = "kb_settings";
const ENTRIES_KEY = "kb_entries";
const PAGES_KEY = "kb_pages";
const DEFAULT_PAGE = "Inbox";

const DEFAULT_SETTINGS = {
  apiKey: "",
  model: DEFAULT_MODEL,
  useAI: false,
  customPrompt: "",
  defaultPage: DEFAULT_PAGE,
  obsidianVault: "",
  obsidianFolder: "Knowledge Book"
};

// ---------- storage helpers ----------
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (data) => {
      resolve({ ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) });
    });
  });
}

function getEntries() {
  return new Promise((resolve) => {
    chrome.storage.local.get(ENTRIES_KEY, (data) => {
      resolve(Array.isArray(data[ENTRIES_KEY]) ? data[ENTRIES_KEY] : []);
    });
  });
}

function setEntries(entries) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [ENTRIES_KEY]: entries }, resolve);
  });
}

function getPages() {
  return new Promise((resolve) => {
    chrome.storage.local.get(PAGES_KEY, (data) => {
      const p = data[PAGES_KEY];
      resolve(Array.isArray(p) && p.length ? p : [DEFAULT_PAGE]);
    });
  });
}

function setPages(pages) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [PAGES_KEY]: pages }, resolve);
  });
}

// ---------- utilities ----------
function detectSource(url) {
  if (!url) return "Web";
  if (url.includes("claude.ai")) return "Claude";
  if (url.includes("chatgpt.com") || url.includes("openai.com")) return "ChatGPT";
  return "Web";
}

function makeId() {
  return "kb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function fallbackNote(text, source) {
  // Verbatim save: keep the exact text; derive only a short title for the card.
  const firstLine = (text.split(/\r?\n/).map((s) => s.trim()).find(Boolean) || text.trim());
  let title;
  const img = firstLine.match(/^!\[([^\]]*)\]\(/);
  if (img) {
    title = img[1].trim() || "Image";
  } else {
    const words = firstLine.split(/\s+/);
    title = words.slice(0, 10).join(" ") + (words.length > 10 ? "…" : "");
  }
  return {
    title: title || "Saved text",
    summary: "",
    keyPoints: [],
    tags: [source.toLowerCase()]
  };
}

function stripJsonFences(s) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function flashBadge(text, color) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: color || "#7c3aed" });
    await chrome.action.setBadgeText({ text });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2500);
  } catch (_) {}
}

// ---------- OpenAI summarization ----------
async function summarize(text, settings, source) {
  const system =
    "You convert excerpts from AI chat conversations (ChatGPT / Claude) into concise, " +
    "reusable knowledge-book notes. Return ONLY a JSON object with these keys:\n" +
    '  "title": a short title, max 8 words.\n' +
    '  "summary": 2-4 plain-language sentences capturing the core idea worth remembering.\n' +
    '  "keyPoints": an array of 3-7 short bullet strings (facts, steps, or takeaways).\n' +
    '  "tags": an array of 2-5 lowercase topic tags.\n' +
    "Focus on what is worth referring back to later. Drop pleasantries and filler. " +
    "Return valid JSON only, no markdown fences.";

  const userParts = [];
  if (settings.customPrompt && settings.customPrompt.trim()) {
    userParts.push("Extra instructions: " + settings.customPrompt.trim());
  }
  userParts.push("Source: " + source);
  userParts.push("Content:\n" + text);

  const body = {
    model: settings.model || DEFAULT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userParts.join("\n\n") }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" }
  };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + settings.apiKey,
      // Optional OpenRouter attribution headers (safe to send from an extension).
      "HTTP-Referer": "https://knowledge-book.extension",
      "X-Title": "Knowledge Book"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || JSON.stringify(err);
    } catch (_) {
      detail = await res.text().catch(() => "");
    }
    throw new Error("OpenRouter API " + res.status + ": " + detail);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(stripJsonFences(content));
  } catch (_) {
    // Model returned prose instead of JSON — keep it as the summary.
    parsed = { title: "", summary: content.slice(0, 400), keyPoints: [], tags: [] };
  }

  return {
    title: (parsed.title || "").toString().trim() || "Untitled note",
    summary: (parsed.summary || "").toString().trim(),
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map((p) => String(p)) : [],
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean)
      : []
  };
}

// ---------- core save flow ----------
async function handleSave({ text, source, url, pageTitle }) {
  const clean = (text || "").trim();
  if (!clean) throw new Error("Nothing to save (empty text).");

  const settings = await getSettings();
  source = source || detectSource(url);

  const imageOnly = /^!\[[^\]]*\]\([^)]+\)$/.test(clean);

  let note;
  let aiUsed = false;
  if (settings.useAI && settings.apiKey && !imageOnly) {
    note = await summarize(clean, settings, source);
    aiUsed = true;
  } else {
    note = fallbackNote(clean, source);
  }
  // Always make sure the source is one of the tags so it groups nicely.
  const srcTag = source.toLowerCase();
  if (!note.tags.includes(srcTag)) note.tags.unshift(srcTag);

  const page = (settings.defaultPage && settings.defaultPage.trim()) || DEFAULT_PAGE;

  const entry = {
    id: makeId(),
    createdAt: Date.now(),
    source,
    url: url || "",
    pageTitle: pageTitle || "",
    original: clean,
    note,
    aiUsed,
    page
  };

  const entries = await getEntries();
  entries.unshift(entry);
  await setEntries(entries);

  // make sure the target page is registered so it shows in the sidebar
  const pages = await getPages();
  if (!pages.includes(page)) {
    pages.push(page);
    await setPages(pages);
  }

  flashBadge("OK", "#16a34a");
  return entry;
}

// ---------- context menu ----------
function setupMenus() {
  // removeAll first so a leftover item can't cause a duplicate-id error that
  // aborts creation of the remaining items.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "kb-save-selection",
      title: "Save selection to Knowledge Book",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "kb-save-image",
      title: "Save image to Knowledge Book",
      contexts: ["image"]
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  setupMenus();
  // seed the default page so the book has something to show
  const pages = await getPages();
  await setPages(pages);
});
// also (re)create menus when the browser/extension starts up
chrome.runtime.onStartup.addListener(setupMenus);

function saveSelectionTextFallback(info, tab) {
  handleSave({
    text: info.selectionText || "",
    source: detectSource(tab?.url || info.pageUrl),
    url: tab?.url || info.pageUrl || "",
    pageTitle: tab?.title || ""
  }).catch((err) => {
    flashBadge("!", "#dc2626");
    try {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Knowledge Book — save failed",
        message: String(err.message || err)
      });
    } catch (_) {}
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "kb-save-selection") {
    // Prefer the content script so the selection keeps its structure (tables, lists).
    if (tab?.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_SELECTION" }, () => {
        if (chrome.runtime.lastError) saveSelectionTextFallback(info, tab); // no content script here
      });
    } else {
      saveSelectionTextFallback(info, tab);
    }
  } else if (info.menuItemId === "kb-save-image" && info.srcUrl) {
    handleSave({
      text: "![](" + info.srcUrl + ")",
      source: detectSource(tab?.url || info.pageUrl),
      url: tab?.url || info.pageUrl || "",
      pageTitle: tab?.title || ""
    }).catch((err) => {
      flashBadge("!", "#dc2626");
      try {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Knowledge Book — save failed",
          message: String(err.message || err)
        });
      } catch (_) {}
    });
  }
});

// ---------- messages from content script / popup ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SAVE_TO_BOOK") {
    handleSave({
      text: msg.payload?.text,
      source: msg.payload?.source || detectSource(sender.tab?.url),
      url: msg.payload?.url || sender.tab?.url || "",
      pageTitle: msg.payload?.pageTitle || sender.tab?.title || ""
    })
      .then((entry) => sendResponse({ ok: true, entry }))
      .catch((err) => {
        flashBadge("!", "#dc2626");
        sendResponse({ ok: false, error: String(err.message || err) });
      });
    return true; // keep channel open for async response
  }
});
