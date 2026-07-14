# Knowledge Book

> Save highlighted text from any web page into a searchable, organized book of notes — with optional AI summaries and one-click export to Obsidian.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4c1?style=flat-square)
![Chrome & Edge](https://img.shields.io/badge/Chrome%20%7C%20Edge-supported-blue?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Knowledge Book is a browser extension for keeping the parts of the web worth remembering.
Highlight text on any page — an answer from any AI chat, documentation, an article, a
dashboard — and save it as a note. Notes keep their formatting, get filed into pages you
create, and stay searchable. Everything lives **on your own device**.

---

## Features

- **Save from anywhere** — highlight text on any site or AI chat, then use the floating
  **Save to journal** button or the right-click menu. On popular AI chats (ChatGPT, Claude,
  Gemini, Perplexity, DeepSeek, Copilot, Grok, Mistral) notes are labeled with their source,
  and a per-message **save** button lets you grab a whole reply at once.
- **Verbatim by default** — notes store exactly what you highlighted. No summarizing unless
  you ask for it.
- **Structure preserved** — tables, lists, headings, and code blocks survive the save and
  render cleanly in your book.
- **Images** — capture images inside a selection, or right-click any image → *Save image to
  Knowledge Book*. They render in your book and export to Obsidian.
- **Read text from images & PDFs (AI OCR)** — right-click an image → *Extract text from
  image*, or screenshot anything (a scanned PDF, a slide, a video frame) and press
  **Ctrl+V in your book**: the text is transcribed into a Markdown note using your
  OpenRouter key (needs a vision-capable model like `openai/gpt-4o-mini`).
- **Notebooks** — organize notes into notebooks you create (shown as colored tabs in the
  sidebar). Move a note by **dragging its handle onto a tab**, or with the "move to"
  dropdown on the note.
- **One page, one note — your call** — when you save another highlight from a page you've
  already saved from, the toast offers **add to "‹earlier note›"** right there. One click
  appends it to that note (with a divider); ignore it and the save stays separate.
- **Merge notes** — drag one note's handle **onto another note** to combine them (text is
  appended, tags are merged).
- **Optional AI summaries** — add your own [OpenRouter](https://openrouter.ai) API key to
  auto-generate a title, summary, key points, and tags. Off by default.
- **Ask your book (AI)** — with an OpenRouter key set, ask a question and get an answer
  drawn from your **own saved notes**, with citations to the notes it used. Your archive
  becomes a queryable second brain, not just an archive.
- **Per-note AI actions** — expand any note and use **Explain simply**, **Give an example**,
  or **Quiz me**, powered by your key.
- **Export anywhere** — everything is plain Markdown. Write your whole book into any folder
  as `.md` files organized by notebook (works with Obsidian, Logseq, Notion import, or any
  notes app), send single notes or pages straight to Obsidian, or download one combined
  `.md` file.
- **Backup & restore** — download a full JSON backup (notes, notebooks, settings — never
  your API key) and restore it on any machine. Restores merge; nothing is deleted.
- **Field-journal design** — paper-and-ink cards with washi-tape accents, handwritten
  labels, pastel notebook tabs, and serif reading text. Follows your system theme, with a
  manual **Night camp** light/dark toggle in the book.
- **Private by design** — notes and settings never leave your device (see
  [Privacy](#privacy)).

---

## Install

### From source (developer mode)

1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select the project folder.
5. Pin the toolbar icon for quick access.

> A Chrome Web Store listing is on the way.

---

## Usage

On **any web page**:

- **Highlight** text → click the floating **Save to journal** button (bottom-right), **or**
- **Right-click** the selection → **Save selection to Knowledge Book**.
- **Images:** right-click an image → **Save image to Knowledge Book** (images inside a text
  selection are captured too).
- On popular **AI chats** (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot, Grok,
  Mistral), hover a message and click **save** to capture the whole reply — and any other
  AI works too via highlight-save.

**PDFs and images** (needs your OpenRouter key for the OCR parts):

- **PDF with selectable text** — select it, then right-click → *Save selection to Knowledge
  Book* (the floating button can't run inside Chrome's PDF viewer, but the menu works).
- **Scanned PDF / anything you can't select** — screenshot the region (`Win+Shift+S`),
  open your book, and press **Ctrl+V**. The text is transcribed into a note, tagged with a
  **Screenshot** source.
- **An image with text in it** — right-click it → **Extract text from image (AI)**.

Open your collection from the toolbar popup → **Open my journal**. Notes are shown as a clean,
scannable list — each is **collapsed to a title + short preview**; click a note to expand and
read it in full, click again to collapse. You can search, filter by notebook/source/topic, and
export. Drag a note's handle (the dotted grip) **onto a notebook tab to move it**, or **onto
another note to merge the two**. When you save another highlight from a page you've already
saved from, the on-page toast offers **add to "‹earlier note›"** — click it to append, or
ignore it to keep the save separate. Click the **i** button in the book header any time for
a quick field guide to all of these gestures.

### Optional: AI summaries

1. Open the extension **Settings** (popup → *Settings*).
2. Paste an [OpenRouter API key](https://openrouter.ai/keys).
3. Choose a model (`provider/model`, e.g. `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`).
4. Turn on **Summarize with AI when I save**.

The key is stored locally and used only to call OpenRouter directly from your browser.
With summaries on, the note's body is the AI summary + key points — your **exact captured
text is always kept** and shown, fully formatted, under **Show original text** on the note.
Turn the toggle off any time to go back to verbatim-as-the-body saves.

### Ask your book

Once a key is set, an **Ask** bar appears at the top of the book. Type a question and get an
answer synthesized from your saved notes, with the source notes listed underneath. Only the
notes most relevant to your question are sent to OpenRouter as context.

Expanding a note also reveals **per-note AI actions** — **Explain simply**, **Give an
example**, and **Quiz me** — which run against just that note.

### Export & backup

Everything is stored as plain Markdown, so your notes are never locked in:

- **Export notes to a folder…** (on the **Everything** view) — writes every note as `.md`
  files organized by notebook (`‹base folder›/‹notebook›/‹note›.md`) into any folder you
  pick: an Obsidian vault, a Logseq graph, a synced Drive/Dropbox folder, anywhere.
- **Obsidian one-click** — the **Obsidian** button on a note, or **Send page to Obsidian**,
  creates the note in your vault via an `obsidian://` link (set the vault name in Settings;
  needs the Obsidian desktop app).
- **Export all** (sidebar) — one combined `.md` file, ready for Notion import, Google Docs,
  or anywhere else.
- **Backup & restore** (in Settings) — download a JSON backup of notes, notebooks, and
  settings (your API key is never included), and restore it later or on another machine.
  Restoring merges by note ID, so nothing gets deleted or duplicated.

---

## Privacy

- **Local-first:** your notes and settings are stored on your device using the browser's
  extension storage. They are never sent to the developer.
- **No tracking:** no analytics, no ads, no third-party trackers.
- **Third parties, only on request:** content is sent to OpenRouter *only* if you enable AI
  summaries (using your own key), and to the Obsidian app *only* when you click Send to
  Obsidian.

Full policy: [PRIVACY.md](PRIVACY.md).

### Permissions

| Permission | Why it's needed |
|---|---|
| Host access (all sites) | To let you save text on any page you visit. Page content is read **only** when you explicitly trigger a save. |
| `storage` | To keep your notes and settings on your device. |
| `contextMenus` | To add the "Save selection to Knowledge Book" right-click item. |
| `notifications` | To let you know if a save fails. |

No remote code is used — all logic ships inside the extension package.

---

## Project structure

```
manifest.json            Extension definition (Manifest V3)
icons/                   Toolbar and store icons
src/
  background/            Service worker: context menu, storage, OpenRouter call
  content/               On-page capture (button, right-click, structure → Markdown)
  book/                  The book viewer (pages, search, export, Obsidian)
  popup/                 Toolbar popup
  options/               Settings page
```

---

## Tech

Vanilla JavaScript, HTML, and CSS — no build step, no dependencies. Manifest V3.

## License

Released under the [MIT License](LICENSE).
