// Knowledge Book — content script
// Injects a floating Save button, per-message Save buttons, toasts, and captures
// the highlighted content as Markdown so structure (tables, lists, code) is kept.
(function () {
  if (window.__kbInjected) return;
  window.__kbInjected = true;

  const host = location.hostname;

  // Known AI chat sites: proper source label + best-effort per-message selectors.
  // Highlight-save and right-click save work on EVERY site regardless of this list.
  const AI_SITES = [
    { name: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"], selectors: ["[data-message-author-role]"] },
    { name: "Claude", hosts: ["claude.ai"], selectors: ["[data-testid='user-message']", ".font-claude-message", "div.font-claude-response"] },
    { name: "Gemini", hosts: ["gemini.google.com"], selectors: ["message-content"] },
    { name: "Perplexity", hosts: ["perplexity.ai", "www.perplexity.ai"], selectors: [".prose"] },
    { name: "DeepSeek", hosts: ["chat.deepseek.com"], selectors: [".ds-markdown"] },
    { name: "Copilot", hosts: ["copilot.microsoft.com"], selectors: ["[data-content='ai-message']"] },
    { name: "Grok", hosts: ["grok.com"], selectors: [".message-bubble"] },
    { name: "Mistral", hosts: ["chat.mistral.ai"], selectors: ["[data-message-id]"] }
  ];
  const site = AI_SITES.find((s) => s.hosts.some((h) => host === h || host.endsWith("." + h)));
  const SOURCE = site ? site.name : "Web";

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
  // toast(message, { open: true, action: { label, fn } })
  function toast(message, opts) {
    opts = opts === true ? { open: true } : opts || {};
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "kb-toast";
      document.documentElement.appendChild(toastEl);
    }
    toastEl.textContent = message;
    let interactive = false;
    if (opts.action) {
      const btn = document.createElement("span");
      btn.className = "kb-toast-action";
      btn.textContent = opts.action.label;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        opts.action.fn();
      });
      toastEl.appendChild(btn);
      interactive = true;
    }
    if (opts.open) {
      const link = document.createElement("span");
      link.className = "kb-toast-open";
      link.textContent = "open →";
      link.addEventListener("click", (ev) => {
        ev.stopPropagation();
        try {
          chrome.runtime.sendMessage({ type: "OPEN_BOOK" });
        } catch (_) {}
      });
      toastEl.appendChild(link);
      interactive = true;
    }
    toastEl.style.pointerEvents = interactive ? "auto" : "none";
    toastEl.classList.add("kb-show");
    clearTimeout(toastTimer);
    const ms = opts.action ? 9000 : opts.open ? 5000 : 3200;
    toastTimer = setTimeout(() => toastEl.classList.remove("kb-show"), ms);
  }

  // ---------- save ----------
  // The extension "context" dies for content scripts already running in a tab
  // when the extension is reloaded/updated. Detect that and tell the user to
  // refresh, instead of throwing a cryptic "reading 'sendMessage'" error.
  const STALE_MSG = "Knowledge Book was updated — refresh this page (F5), then save again.";
  function extAlive() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  function save(text) {
    const clean = (text || "").trim();
    if (!clean) {
      toast("Select some text first, then click Save to journal");
      return;
    }
    if (!extAlive()) {
      toast(STALE_MSG);
      return;
    }
    toast("Saving to your journal…");
    try {
      chrome.runtime.sendMessage(
        {
          type: "SAVE_TO_BOOK",
          payload: { text: clean, source: SOURCE, url: location.href, pageTitle: document.title }
        },
        (resp) => {
          if (chrome.runtime.lastError) {
            const m = chrome.runtime.lastError.message || "";
            toast(/context invalidated|receiving end|Extension context/i.test(m) ? STALE_MSG : "Error: " + m);
            return;
          }
          if (resp?.ok) {
            const t = resp.entry?.note?.title || "";
            if (resp.sameUrlTarget) {
              // an earlier note exists for this page — let the user decide, right here
              const full = resp.sameUrlTarget.title || "earlier note";
              const short = full.length > 24 ? full.slice(0, 24) + "…" : full;
              toast("✓ Saved · same page as an earlier note ", {
                open: true,
                action: {
                  label: 'add to "' + short + '" →',
                  fn: () => {
                    chrome.runtime.sendMessage(
                      { type: "MERGE_NOTES", srcId: resp.entry.id, dstId: resp.sameUrlTarget.id },
                      (r2) => {
                        if (chrome.runtime.lastError) {
                          toast("Error: " + chrome.runtime.lastError.message);
                          return;
                        }
                        if (r2?.ok) toast('✓ Added to "' + short + '"  ', { open: true });
                        else toast("Couldn't merge: " + ((r2 && r2.error) || "unknown error"));
                      }
                    );
                  }
                }
              });
            } else {
              toast("✓ Saved to your journal" + (t ? ": " + t : "") + "  ", { open: true });
            }
          } else {
            toast("Couldn't save: " + (resp?.error || "unknown error"));
          }
        }
      );
    } catch (e) {
      const m = String((e && e.message) || e);
      toast(/context invalidated|sendMessage|undefined/i.test(m) ? STALE_MSG : "Error: " + m);
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
  fab.textContent = "Save to journal ✎";
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

  // ---------- per-message Save buttons (best-effort, host-scoped) ----------
  const MSG_SELECTORS = site ? site.selectors : [];

  function decorate(el) {
    if (!el || el.__kbDecorated) return;
    const text = (el.innerText || "").trim();
    if (text.length < 12) return;
    el.__kbDecorated = true;
    el.classList.add("kb-msg");
    const btn = document.createElement("button");
    btn.className = "kb-msg-btn";
    btn.type = "button";
    btn.textContent = "save ✎";
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

  if (MSG_SELECTORS.length) {
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
  }
})();
