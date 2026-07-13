# 📖 Knowledge Book

A personal browser extension that turns the good bits of your **ChatGPT** and **Claude**
chats into a browsable **book of concise notes**. Highlight something worth keeping,
click Save, and the extension uses the **OpenRouter API** to write a short title, summary,
key points, and topic tags — then files it in your book so you can find it later.
OpenRouter lets one key route to many models (OpenAI, Anthropic, Google, Llama, …).

Everything is stored **locally on your machine**. Your API key and notes never leave
your computer except for the direct call to OpenRouter that writes each note.

---

## Install (Chrome or Edge)

1. Open **`chrome://extensions`** (or `edge://extensions`).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder:
   `C:\Users\KaranamDeepthi\personal_project\knowledge-book`
4. The 📖 icon appears in your toolbar. (Pin it for easy access.)

## Set up your API key

1. Click the 📖 icon → **Settings** (or right-click the icon → Options).
2. Paste your **OpenRouter API key** (get one at
   <https://openrouter.ai/keys>).
3. Leave the model as `openai/gpt-4o-mini` (cheap + good), or change it to any model on
   <https://openrouter.ai/models> written as `provider/model`
   (e.g. `anthropic/claude-3.5-sonnet`, `google/gemini-flash-1.5`). Click **Save settings**.

> No key yet? The extension still works — it just saves the raw text without an
> AI note. Add a key any time to turn on summaries.

## How to use

Works on **any website** (ChatGPT, Claude, docs, blogs, anything):

- **Highlight** any text → a floating **📖** button appears at the bottom-right → click it, **or**
- **Right-click** the selection → **Save selection to Knowledge Book**.
- On **ChatGPT / Claude** specifically, you can also hover a message and click the little
  **📖 Save** button to grab the whole message.

Tables, lists, headings, and code in the highlighted text are preserved.

A note is generated and added to your book. Open the book from the toolbar popup →
**Open my Book**.

## Your book

- **Pages (notebooks):** the sidebar lists your pages. Click **＋** next to *Pages* to
  create one (e.g. "SQL", "Interview prep"). New saves land in your **default page**
  (set in Settings, default `Inbox`). Move any note to another page with the little
  dropdown on the note. Rename/Delete a page from the buttons at the top of the page view
  (deleting a page moves its notes to `Inbox`, it never deletes notes).
- **Send to Obsidian:** click **Obsidian** on a note to create it in your vault instantly,
  or **⬗ Send page to Obsidian** to drop the whole page in as one note. Set your vault name
  (and optional folder) in Settings. The note is also copied to your clipboard as a backup.
  Requires the Obsidian app installed on this machine.
- **Search** across every note; filter by **source** (ChatGPT / Claude) or **topic tag**.
- Notes show the full highlighted text with **tables, lists, headings, and code preserved**.
- **Copy** the exact text, **Delete** notes, or **Export all** to a `.md` file.

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension definition (MV3) |
| `background.js` | Context menu, OpenAI call, storage |
| `content.js` / `content.css` | On-page Save buttons + toasts |
| `popup.html/js/css` | Toolbar popup (recent notes, quick actions) |
| `options.html/js` | API key & model settings |
| `book.html/js/css` | The book viewer |
| `icons/` | Toolbar icons |

## Notes & privacy

- The API key is stored in Chrome's local extension storage and sent **only** to
  `openrouter.ai`. It is never sent anywhere else.
- Notes live in local storage too — clearing the extension's data (or removing the
  extension) deletes them. Use **Export all** to keep a backup.
- Site markup on ChatGPT/Claude changes over time; if the per-message Save buttons ever
  stop appearing, the floating button and right-click menu still work.
