# opencode-tab-colors

An [OpenCode](https://opencode.ai) 2 TUI plugin that gives every open session tab its own color, so tabs from the same repo don't blend together.

- **Tab mark:** each open tab gets a colored emoji at the start of its session title: 🟩 🟦 🟥 🟨 🟪 🟧 🟫, then 🟢 🔵 🔴 🟡 🟣 🟠 🟤 from the eighth tab on.
- **Prompt bar:** a bar above the prompt in the same color, showing the session title.

A new tab takes the first color no other open tab uses. A reopened session keeps its earlier color when it is still free.

## Why the mark is in the title

OpenCode draws its tab strip from fixed theme colors, and plugins cannot style it. The session title is the only per-tab thing a plugin can change, so the mark is written into the real title. It also shows in the session list, and it comes back if OpenCode regenerates the title.

To remove the marks, run **Hide tab color marks** from the command palette. It strips them from all loaded sessions. **Show tab color marks** turns them back on.

## Install

Requires OpenCode 2.0.32 or later.

```sh
git clone https://github.com/vlad-saling/opencode-tab-colors ~/.config/opencode/plugins/tab-colors
```

OpenCode picks the plugin up from that folder on the next start.

## Colors

Colors are chosen in OKLCH, so they look evenly bright, and fitted into sRGB without changing lightness or hue. The bar text is black or white, whichever has more contrast. Every color reaches at least 5.4:1, above the WCAG AA minimum of 4.5:1.

How the emoji look depends on your terminal's emoji font.
