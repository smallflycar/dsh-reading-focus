<p align="center"><img src="icon.svg" width="96" alt="Reading Focus"></p>

<h1 align="center">Reading Focus for DeepSeek Harness</h1>

<p align="center">A reading layer for the DeepSeek Harness chat surface: gradient text, a reading ruler, line and block focus, and colour bands.</p>

<p align="center">
  <a href="https://github.com/smallflycar/dsh-reading-focus"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-repo-24292f.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-2f6fed.svg"></a>
  <img alt="DSH" src="https://img.shields.io/badge/DSH-0.2.2--rc.3%20%7C%200.2.x-4f70d9.svg">
  <a href="README.md"><img alt="中文" src="https://img.shields.io/badge/lang-%E4%B8%AD%E6%96%87-6b7686.svg"></a>
</p>

> Every effect is a visual overlay. The plugin never edits the message text, inserts text nodes, or changes selection and copy.

## What it does

- **Gradient reading** — colours body text line by line, alternating direction so each line break lands on a full colour or the base tone; headings, code and tables keep their own colour.
- **Reading ruler** — a faint band with two solid edge lines that follows the pointer; medium scroll protection so it stays aligned while scrolling.
- **Line focus** — the rows under the pointer stay fully transparent while the rest of the page is dimmed.
- **Block focus** — the current paragraph stays as it is and the rest either fades its text or dims behind a veil.
- **Colour bands** — alternating blocks separate adjacent passages; code blocks and headings are excluded, tables are banded, and a tool call does not restart the hue cycle.

Font size is shared with DSH's own stepper (10–22 px, default 14). Line height follows DSH's own ladder (`size + 10px`); the plugin only adds an optional 0–12 px extra spacing on top, and `0` leaves DSH's line height untouched.

## Install

In DSH Desktop: **Settings → Plugins → Add plugin**, enter `dsh-reading-focus`, install, then refresh the page.

From a terminal:

```bash
dsh plugin --profile <profile> add dsh-reading-focus

# from a local build
npm run build && npm run pack
dsh plugin --profile <profile> add ./dist/dsh-reading-focus-0.8.4.tgz

# development
dsh plugin --profile <profile> add "link:/absolute/path/to/this/repo"
```

Turn it on under **Settings → Reading focus**. With a `link:` install, rebuild and reload the plugin after changing the source.

## Development

```bash
npm run build                  # src/*.js -> lib/client.js, lib/index.js, preview.html
npm test                       # build + 17 assertions (logic, structure, artifact equality)
npm run test:browser           # 19 rendering assertions in headless Chrome
npm run test:browser:geometry  # 7 geometry assertions in headless Chrome
npm run pack                   # dist/dsh-reading-focus-<version>.tgz
```

Generated files are built from `src/`; tests compare them byte for byte, so a stale build fails. `preview.html` and `docs/screenshots` are local fixtures, not real-GUI evidence.

## Compatibility

The plugin relies on private host structure: markdown roots that are direct children of `.xMeOpW_body` with a `_markdown_[alnum]_[digits]` class, plus `data-chat-turn`, `data-slot="conversation.chat.flow"` and `data-composer-*` markers. It is verified against DSH 0.2.2-rc.3; a host refactor may require an update. It never reads credentials or modifies the profile.

## License

MIT. See [LICENSE](LICENSE).
