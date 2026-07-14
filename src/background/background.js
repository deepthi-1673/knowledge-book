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
  const table = [
    ["claude.ai", "Claude"],
    ["chatgpt.com", "ChatGPT"],
    ["chat.openai.com", "ChatGPT"],
    ["gemini.google.com", "Gemini"],
    ["perplexity.ai", "Perplexity"],
    ["chat.deepseek.com", "DeepSeek"],
    ["copilot.microsoft.com", "Copilot"],
    ["grok.com", "Grok"],
    ["chat.mistral.ai", "Mistral"]
  ];
  for (const [h, name] of table) {
    if (url.includes(h)) return name;
  }
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
    // strip leading markdown (##, >, -, 1., **, `) so the title is clean text
    const clean = firstLine
      .replace(/^\s*#{1,6}\s+/, "")
      .replace(/^\s*>\s+/, "")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^\s*\d+\.\s+/, "")
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const words = clean.split(/\s+/);
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
    await chrome.action.setBadgeBackgroundColor({ color: color || "#55713f" });
    await chrome.action.setBadgeText({ text });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2500);
  } catch (_) {}
}

// ---------- OCR: read text out of an image via a vision model ----------
async function ocrImage(imageUrl, settings) {
  const body = {
    model: settings.model || DEFAULT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Transcribe ALL text visible in this image exactly. Preserve the structure as " +
              "Markdown (headings, lists, tables, code blocks). Output only the transcribed " +
              "content — no commentary. If the image contains no readable text, reply exactly: " +
              "No readable text found."
          },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    temperature: 0
  };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + settings.apiKey,
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
    throw new Error(
      "OpenRouter API " + res.status + ": " + detail +
      (res.status === 400 || res.status === 404
        ? " (your model may not support images — try a vision model like openai/gpt-4o-mini)"
        : "")
    );
  }

  const data = await res.json();
  const text = (data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("The model returned no text for this image.");
  return text;
}

// ---------- Ask-your-book (Q&A over the user's saved notes) ----------
async function askBook(question, context, settings) {
  const system =
    "You are the user's personal knowledge assistant. Answer the question using ONLY the " +
    "notes provided as context below. Be concise and specific. Cite the notes you use by " +
    "their title in square brackets, e.g. [Title]. If the notes do not contain the answer, " +
    "say so plainly and suggest what the user could save. Format your answer in Markdown.";

  const body = {
    model: settings.model || DEFAULT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: "Notes:\n\n" + context + "\n\n---\nQuestion: " + question }
    ],
    temperature: 0.2
  };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + settings.apiKey,
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
  return (data?.choices?.[0]?.message?.content || "").trim();
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
async function handleSave({ text, source, url, pageTitle, skipAI }) {
  const clean = (text || "").trim();
  if (!clean) throw new Error("Nothing to save (empty text).");

  const settings = await getSettings();
  source = source || detectSource(url);

  const imageOnly = /^!\[[^\]]*\]\([^)]+\)$/.test(clean);

  let note;
  let aiUsed = false;
  if (settings.useAI && settings.apiKey && !imageOnly && !skipAI) {
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

  // If an earlier note exists for this same page, surface it so the user can
  // choose (on the page, via the toast) to append this save into it.
  let sameUrlTarget = null;
  if (url) {
    const prev = entries.find((x) => x && x.id !== entry.id && x.url === url && !x.aiUsed);
    if (prev) {
      sameUrlTarget = { id: prev.id, title: (prev.note && prev.note.title) || "Saved text" };
    }
  }

  flashBadge("OK", "#16a34a");
  return { entry, sameUrlTarget };
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
    chrome.contextMenus.create({
      id: "kb-ocr-image",
      title: "Extract text from image (AI)",
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
  } else if (info.menuItemId === "kb-ocr-image" && info.srcUrl) {
    (async () => {
      const settings = await getSettings();
      if (!settings.apiKey) {
        throw new Error("Add an OpenRouter API key in Settings to extract text from images.");
      }
      if (info.srcUrl.startsWith("blob:")) {
        throw new Error("This image can't be fetched directly — screenshot it and paste (Ctrl+V) into your book instead.");
      }
      flashBadge("…", "#55713f");
      const text = await ocrImage(info.srcUrl, settings);
      await handleSave({
        text,
        source: detectSource(tab?.url || info.pageUrl),
        url: tab?.url || info.pageUrl || "",
        pageTitle: tab?.title || "",
        skipAI: true
      });
    })().catch((err) => {
      flashBadge("!", "#dc2626");
      try {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Knowledge Book — couldn't extract text",
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
      .then(({ entry, sameUrlTarget }) => sendResponse({ ok: true, entry, sameUrlTarget }))
      .catch((err) => {
        flashBadge("!", "#dc2626");
        sendResponse({ ok: false, error: String(err.message || err) });
      });
    return true; // keep channel open for async response
  }
  if (msg?.type === "MERGE_NOTES") {
    (async () => {
      const entries = await getEntries();
      const src = entries.find((x) => x && x.id === msg.srcId);
      const dst = entries.find((x) => x && x.id === msg.dstId);
      if (!src || !dst) throw new Error("Note not found — it may have been moved or deleted.");
      dst.original = (dst.original || "") + "\n\n---\n\n" + (src.original || "");
      dst.note = dst.note || {};
      const tags = new Set((dst.note.tags || []).concat((src.note && src.note.tags) || []));
      dst.note.tags = Array.from(tags);
      dst.updatedAt = Date.now();
      await setEntries(entries.filter((x) => x.id !== msg.srcId));
      return dst;
    })()
      .then((dst) => sendResponse({ ok: true, entry: dst }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  if (msg?.type === "OCR_IMAGE") {
    (async () => {
      const settings = await getSettings();
      if (!settings.apiKey) throw new Error("Add an OpenRouter API key in Settings first.");
      const text = await ocrImage(msg.dataUrl, settings);
      return handleSave({
        text,
        source: "Screenshot",
        url: "",
        pageTitle: msg.title || "Pasted image",
        skipAI: true
      });
    })()
      .then(({ entry }) => sendResponse({ ok: true, entry }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  if (msg?.type === "OPEN_BOOK") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/book/book.html") });
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "ASK_BOOK") {
    (async () => {
      const settings = await getSettings();
      if (!settings.apiKey) throw new Error("Add an OpenRouter API key in Settings first.");
      return askBook(msg.question || "", msg.context || "", settings);
    })()
      .then((answer) => sendResponse({ ok: true, answer }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
});
