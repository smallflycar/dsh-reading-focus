<p align="center">
  <a href="README.md">简体中文</a> · <a href="README.en.md">English</a>
</p>

<p align="center"><img src="icon.svg" width="96" alt="Reading Focus"></p>

<h1 align="center">Reading Focus for DeepSeek Harness</h1>

<p align="center">A reading layer for the DeepSeek Harness chat surface: gradient text, a reading ruler, line and block focus, and colour bands.</p>

<p align="center">
  <a href="https://github.com/smallflycar/dsh-reading-focus"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-repo-24292f.svg"></a>
  <a href="https://www.npmjs.com/package/dsh-reading-focus"><img alt="npm" src="https://img.shields.io/npm/v/dsh-reading-focus"></a>
  <a href="https://github.com/smallflycar/dsh-reading-focus/releases"><img alt="Release" src="https://img.shields.io/github/v/release/smallflycar/dsh-reading-focus"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-2f6fed.svg"></a>
  <img alt="DSH" src="https://img.shields.io/badge/DSH-0.2.2--rc.3%20%7C%200.2.x-4f70d9.svg">
</p>

> Every effect is a visual overlay. The plugin never edits the message text, inserts text nodes, or changes selection and copy.

## Why this exists

Agents are turning from "something you open occasionally" into the interface many people spend most of the day in. Long answers, long sessions and long contexts pile up, so the prose you scroll past in a day can exceed a whole article — and agent work is intermittent by nature: send a task, wait, switch back, read a bit more. Attention is interrupted just as it settles, and re-finding "where I was reading" costs more than it does in a single article.

Reading aids in the browser (a reading ruler, line focus, colour bands, gradient text) already help people who get distracted easily. Agent transcripts are longer, denser and more stacked than a typical page, so the case is stronger here. The plugin does not train attention; it makes the current line clear at the moment you read it.

It brings a few reading modes into DSH's transcript — frame the line under the pointer, push everything but the current paragraph back, separate adjacent passages with cycling colour blocks, replace a wall of black text with a line-by-line gradient — all as a visual overlay, with the original text, selection, copy and find untouched.

**Typical moments**

- a long answer where you lose your place while scanning;
- coming back from another window and landing on the wrong paragraph;
- checking a conclusion or a code block while the rest of the context keeps competing for attention.

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

# without npm, straight from the GitHub release
dsh plugin --profile <profile> add https://github.com/smallflycar/dsh-reading-focus/releases/download/v0.8.4/dsh-reading-focus-0.8.4.tgz

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
