# 在出问题的机器上确认宿主结构

插件不读取认证信息，也不上传任何数据；下面这段脚本只在浏览器控制台里读当前页面，用来判断「效果没出现」到底是哪一层断的：插件没加载、没开启，还是没找到正文。

代码块可以整体复制粘贴。

## 怎么打开控制台

- **DSH Desktop**：菜单 **View → Toggle Developer Tools**（或 `Cmd+Option+I`），切到 **Console**。
- **浏览器里的 Web GUI**：在设置 → 远程连接里复制链接，用桌面浏览器打开后按 `F12` / `Cmd+Option+I`，切到 **Console**。

## 检查脚本

```js
(() => {
  const tokens = el => [...(el?.classList ?? [])];
  const bodyTokens = new Set(), markdownTokens = new Set();
  let inAssistantStep = 0;
  const roots = [...document.querySelectorAll('[class*="_markdown_"]')];
  for (const el of roots) {
    tokens(el).filter(t => /markdown/i.test(t)).forEach(t => markdownTokens.add(t));
    const parent = el.parentElement;
    if (parent) tokens(parent).filter(t => t.endsWith('_body')).forEach(t => bodyTokens.add(t));
    if (el.closest('[data-chat-flow-kind="assistant-step"]')) inAssistantStep += 1;
  }
  const ui = document.querySelector('[data-reading-focus-ui]');
  const saved = [...Array(localStorage.length)].map((_, i) => localStorage.key(i))
    .map(k => [k, localStorage.getItem(k)])
    .filter(([, v]) => typeof v === 'string' && v.includes('"mode"'))
    .map(([k, v]) => { let enabled = null; try { enabled = JSON.parse(v).enabled; } catch {} return { key: k, enabled }; });
  return {
    dshVersion: window.__DSH_BOOT__?.version ?? 'unknown',
    pluginLoaded: !!ui,
    pluginVersion: ui?.shadowRoot?.querySelector('.rf-version')?.textContent ?? null,
    savedSettings: saved,
    bodyClassTokens: [...bodyTokens],
    markdownClassTokens: [...markdownTokens].slice(0, 8),
    markdownRoots: roots.length,
    assistantStepRoots: inAssistantStep,
    flowKinds: [...new Set([...document.querySelectorAll('[data-chat-flow-kind]')].map(e => e.getAttribute('data-chat-flow-kind')))],
  };
})()
```

## 结果怎么读

| 字段 | 含义 |
| --- | --- |
| `pluginLoaded` | 插件客户端有没有挂载。`false` 表示它根本没被加载，跟类名无关——先查插件是否已安装、是否在 profile 里启用、页面是否刷新过。 |
| `pluginVersion` | 面板头部显示的版本号，用来确认装的是不是你以为的那一版。 |
| `savedSettings` | 里层的 `enabled` 是开关状态。`false` 表示效果没打开，不是失效。 |
| `bodyClassTokens` | 当前版本正文容器的真实类名（形如 `xxxxxx_body`）。0.2.x 目前是 `xMeOpW_body`。 |
| `markdownClassTokens` | Markdown 根的类名。0.2.2-rc.1/rc.3 是 `_markdown_<哈希>_<序号>`，0.2.3-alpha.2 是 `<哈希>_markdown`（本机实测 `-TmMFa_markdown`）；0.8.6 起两种形状都认。 |
| `markdownRoots` / `assistantStepRoots` | 页面上识别到的 Markdown 根数量，以及其中位于 `assistant-step` 流项目里的数量。两者为 0 说明当前会话还没有回答，不是插件问题。 |

0.8.5 起插件不再依赖 `bodyClassTokens` 的具体值：只要容器以 `_body` 结尾、直子含 Markdown 根、且不在工具行等非 `assistant-step` 流项目里，就会被当成正文。所以这里出现任何新哈希都不需要改插件。
