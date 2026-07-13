// Knowledge Book — content script
// Injects a floating Save button, per-message Save buttons, toasts, and captures
// the highlighted content as Markdown so structure (tables, lists, code) is kept.
(function () {
  if (window.__kbInjected) return;
  window.__kbInjected = true;

  const host = location.hostname;
  const SOURCE = host.includes("claude.ai")
    ? "Claude"
    : host.includes("chatgpt.com") || host.includes("openai.com")
    ? "ChatGPT"
    : "Web";

  // ---------- HTML -> Markdown (preserves structure) ----------
  function serialize(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue.replace(/\s+/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    const inner = () => Array.from(node.childNodes).map(serialize).join("");
    switch (tag) {
      case "br":
        return "\n";
      case "strong":
      case "b":
        return "**" + inner().trim() + "**";
      case "em":
      case "i":
        return "_" + inner().trim() + "_";
      case "code":
        if (node.closest && node.closest("pre")) return inner();
        return "`" + inner().trim() + "`";
      case "pre": {
        const text = node.innerText || node.textContent || "";
        return "\n```\n" + text.replace(/\n+$/, "") + "\n```\n";
      }
      case "a": {
        const href = node.getAttribute("href") || "";
        const t = inner().trim();
        return href && /^https?:/i.test(href) ? "[" + t + "](" + href + ")" : t;
      }
      case "img": {
        const src = node.currentSrc || node.src || node.getAttribute("src") || "";
        if (!src) return "";
        const alt = (node.getAttribute("alt") || "").replace(/[[\]"\n]/g, " ").trim();
        return "\n![" + alt + "](" + src + ")\n";
      }
      case "h1":
        return "\n# " + inner().trim() + "\n";
      case "h2":
        return "\n## " + inner().trim() + "\n";
      case "h3":
        return "\n### " + inner().trim() + "\n";
      case "h4":
      case "h5":
      case "h6":
        return "\n#### " + inner().trim() + "\n";
      case "li": {
        const parent = node.parentElement;
        const ordered = parent && parent.tagName.toLowerCase() === "ol";
        const prefix = ordered
          ? Array.prototype.indexOf.call(parent.children, node) + 1 + ". "
          : "- ";
        return prefix + inner().trim() + "\n";
      }
      case "ul":
      case "ol":
        return "\n" + inner() + "\n";
      case "blockquote": {
        const t = inner().trim();
        return t ? "\n> " + t.replace(/\n/g, "\n> ") + "\n" : "";
      }
      case "table":
        return "\n" + serializeTable(node) + "\n";
      case "thead":
      case "tbody":
      case "tr":
      case "td":
      case "th":
        return inner();
      case "p":
      case "div":
      case "section":
      case "article":
      case "header":
      case "footer": {
        const t = inner().trim();
        return t ? "\n" + t + "\n" : "";
      }
      case "script":
      case "style":
      case "button":
        return "";
      default:
        return inner();
    }
  }

  function serializeTable(table) {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (!rows.length) return "";
    const matrix = rows.map((tr) =>
      Array.from(tr.querySelectorAll("th,td")).map((cell) =>
        (cell.innerText || cell.textContent || "").replace(/\s+/g, " ").trim().replace(/\|/g, "\\|")
      )
    );
    const cols = Math.max.apply(null, matrix.map((r) => r.length));
    const pad = (r) => {
      const c = r.slice();
      while (c.length < cols) c.push("");
      return c;
    };
    const out = [];
    const first = pad(matrix[0]);
    out.push("| " + first.join(" | ") + " |");
    out.push("| " + first.map(() => "---").join(" | ") + " |");
    for (let i = 1; i < matrix.length; i++) out.push("| " + pad(matrix[i]).join(" | ") + " |");
    return out.join("\n");
  }

  function cleanup(md) {
    return md
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function nodeToMarkdown(node) {
    let md;
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      md = Array.from(node.childNodes).map(serialize).join("");
    } else {
      md = serialize(node);
    }
    return cleanup(md);
  }

  function getSelectionMarkdown() {
    const sel = window.getSelection && window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return "";
    let combined = "";
    for (let r = 0; r < sel.rangeCount; r++) {
      combined += nodeToMarkdown(sel.getRangeAt(r).cloneContents()) + "\n\n";
    }
    const md = cleanup(combined);
    return md || (sel.toString() || "").trim();
  }

  // ---------- toast ----------
  let toastEl;
  let toastTimer;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "kb-toast";
      document.documentElement.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("kb-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("kb-show"), 3200);
  }

  // ---------- save ----------
  function save(text) {
    const clean = (text || "").trim();
    if (!clean) {
      toast("Select some text first, then click Save to Book");
      return;
    }
    toast("Saving to your book…");
    try {
      chrome.runtime.sendMessage(
        {
          type: "SAVE_TO_BOOK",
          payload: { text: clean, source: SOURCE, url: location.href, pageTitle: document.title }
        },
        (resp) => {
          if (chrome.runtime.lastError) {
            toast("Error: " + chrome.runtime.lastError.message);
            return;
          }
          if (resp?.ok) {
            const t = resp.entry?.note?.title || "";
            toast("Saved to your book" + (t ? ": " + t : ""));
          } else {
            toast("Couldn't save: " + (resp?.error || "unknown error"));
          }
        }
      );
    } catch (e) {
      toast("Error: " + (e.message || e));
    }
  }

  // context-menu click asks us to capture the current selection (so it too keeps structure)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "CAPTURE_SELECTION") {
      const md = getSelectionMarkdown();
      if (md) save(md);
      else toast("Select some text first, then try again");
    }
  });

  // ---------- floating action button ----------
  const fab = document.createElement("button");
  fab.className = "kb-fab";
  fab.type = "button";
  fab.title = "Knowledge Book: save the highlighted text";
  fab.textContent = "Save to Book";
  fab.style.display = "none";
  // Keep the selection alive when pressing the button (a plain click can collapse it).
  fab.addEventListener("mousedown", (e) => e.preventDefault());
  fab.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    save(getSelectionMarkdown());
  });
  document.documentElement.appendChild(fab);

  // Show the button only while there is a non-empty selection — unobtrusive on any site.
  function updateFabVisibility() {
    const sel = window.getSelection && window.getSelection();
    const has = sel && !sel.isCollapsed && (sel.toString() || "").trim().length > 0;
    fab.style.display = has ? "block" : "none";
  }
  document.addEventListener("selectionchange", updateFabVisibility);
  document.addEventListener("mouseup", updateFabVisibility);
  document.addEventListener("keyup", updateFabVisibility);

  // ---------- per-message Save buttons (best-effort) ----------
  const MSG_SELECTORS = [
    "[data-message-author-role]",
    "[data-testid='user-message']",
    ".font-claude-message",
    "div.font-claude-response"
  ];

  function decorate(el) {
    if (!el || el.__kbDecorated) return;
    const text = (el.innerText || "").trim();
    if (text.length < 12) return;
    el.__kbDecorated = true;
    el.classList.add("kb-msg");
    const btn = document.createElement("button");
    btn.className = "kb-msg-btn";
    btn.type = "button";
    btn.textContent = "Save";
    btn.title = "Save this whole message to your Knowledge Book";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      save(nodeToMarkdown(el));
    });
    el.appendChild(btn);
  }

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    MSG_SELECTORS.forEach((sel) => {
      let nodes;
      try {
        nodes = scope.querySelectorAll(sel);
      } catch (_) {
        return;
      }
      nodes.forEach(decorate);
    });
  }

  let scanQueued = false;
  const observer = new MutationObserver(() => {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(() => {
      scanQueued = false;
      scan(document);
    }, 400);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan(document);
})();
