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
- **Pages (notebooks)** — organize notes into pages you create, and move notes between them.
- **Optional AI summaries** — add your own [OpenRouter](https://openrouter.ai) API key to
  auto-generate a title, summary, key points, and tags. Off by default.
- **Send to Obsidian** — export a single note, or a whole page, to your Obsidian vault with
  one click.
- **Markdown export** — download everything as a `.md` file.
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
- On **ChatGPT / Claude**, hover a message and click **Save** to capture the whole reply.

Open your collection from the toolbar popup → **Open my Book**. There you can search, filter
by page/source/topic, move notes between pages, export, or send to Obsidian.

### Optional: AI summaries

1. Open the extension **Settings** (popup → *Settings*).
2. Paste an [OpenRouter API key](https://openrouter.ai/keys).
3. Choose a model (`provider/model`, e.g. `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`).
4. Turn on **Summarize with AI when I save**.

The key is stored locally and used only to call OpenRouter directly from your browser.

### Optional: Obsidian export

Set your **vault name** (and an optional folder) in Settings, then use the **Obsidian**
button on a note — or **Send page to Obsidian** — to create the note in your vault via an
`obsidian://` link. Requires the Obsidian desktop app installed.

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

| File | Purpose |
|---|---|
| `manifest.json` | Extension definition (Manifest V3) |
| `background.js` | Context menu, storage, and the OpenRouter call |
| `content.js` / `content.css` | On-page capture (button, right-click, structure→Markdown) |
| `book.html` / `book.js` / `book.css` | The book viewer (pages, search, export, Obsidian) |
| `popup.html` / `popup.js` / `popup.css` | Toolbar popup |
| `options.html` / `options.js` | Settings |
| `icons/` | Toolbar and store icons |

---

## Tech

Vanilla JavaScript, HTML, and CSS — no build step, no dependencies. Manifest V3.

## License

Released under the [MIT License](LICENSE).
