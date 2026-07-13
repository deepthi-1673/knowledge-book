# Knowledge Book

> Save highlighted text from any web page into a searchable, organized book of notes — with optional AI summaries and one-click export to Obsidian.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4c1?style=flat-square)
![Chrome & Edge](https://img.shields.io/badge/Chrome%20%7C%20Edge-supported-blue?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Knowledge Book is a browser extension for keeping the parts of the web worth remembering.
Highlight text on any page — a ChatGPT or Claude answer, documentation, an article, a
dashboard — and save it as a note. Notes keep their formatting, get filed into pages you
create, and stay searchable. Everything lives **on your own device**.

---

## Features

- **Save from anywhere** — highlight text on any site, then use the floating **Save to Book**
  button or the right-click menu. On ChatGPT and Claude, a per-message **Save** button lets
  you grab a whole reply at once.
- **Verbatim by default** — notes store exactly what you highlighted. No summarizing unless
  you ask for it.
- **Structure preserved** — tables, lists, headings, and code blocks survive the save and
  render cleanly in your book.
- **Images** — capture images inside a selection, or right-click any image → *Save image to
  Knowledge Book*. They render in your book and export to Obsidian.
- **Pages (notebooks)** — organize notes into pages you create. Move a note by **dragging
  its handle onto a page** in the sidebar, or with the dropdown on the note.
- **Optional AI summaries** — add your own [OpenRouter](https://openrouter.ai) API key to
  auto-generate a title, summary, key points, and tags. Off by default.
- **Ask your book (AI)** — with an OpenRouter key set, ask a question and get an answer
  drawn from your **own saved notes**, with citations to the notes it used. Your archive
  becomes a queryable second brain, not just an archive.
- **Per-note AI actions** — expand any note and use **Explain simply**, **Give an example**,
  or **Quiz me**, powered by your key.
- **Obsidian export** — send a single note or a whole page via an `obsidian://` link, or
  **Export all to Obsidian** to write your entire book into the vault as files, organized
  into per-page folders.
- **Markdown export** — download everything as a single `.md` file.
- **Light & dark mode** — the whole UI follows your system theme automatically.
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

- **Highlight** text → click the floating **Save to Book** button (bottom-right), **or**
- **Right-click** the selection → **Save selection to Knowledge Book**.
- **Images:** right-click an image → **Save image to Knowledge Book** (images inside a text
  selection are captured too).
- On **ChatGPT / Claude**, hover a message and click **Save** to capture the whole reply.

Open your collection from the toolbar popup → **Open my Book**. Notes are shown as a clean,
scannable list — each is **collapsed to a title + short preview**; click a note to expand and
read it in full, click again to collapse. You can search, filter by page/source/topic, and
export. To move a note between pages, **drag its handle** (the dotted grip on the note) onto a
page in the sidebar, or use the dropdown on the note.

### Optional: AI summaries

1. Open the extension **Settings** (popup → *Settings*).
2. Paste an [OpenRouter API key](https://openrouter.ai/keys).
3. Choose a model (`provider/model`, e.g. `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`).
4. Turn on **Summarize with AI when I save**.

The key is stored locally and used only to call OpenRouter directly from your browser.

### Ask your book

Once a key is set, an **Ask** bar appears at the top of the book. Type a question and get an
answer synthesized from your saved notes, with the source notes listed underneath. Only the
notes most relevant to your question are sent to OpenRouter as context.

Expanding a note also reveals **per-note AI actions** — **Explain simply**, **Give an
example**, and **Quiz me** — which run against just that note.

### Optional: Obsidian export

Set your **vault name** and an optional **base folder** in Settings. Three ways to export:

- **A single note** — click **Obsidian** on the note.
- **A whole page** — open the page and click **Send page to Obsidian**.
- **Everything** — on **All notes**, click **Export all to Obsidian**, choose your vault
  folder once, and every note is written straight in as files.

Notes are organized as `‹base folder›/‹page›/‹note›.md`, so your vault mirrors your book.
The single-note and per-page options use an `obsidian://` link (needs the Obsidian desktop
app); **Export all** writes the files directly into the folder you pick (Chrome/Edge).

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
