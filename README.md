# 🎬 CodeCaptions

```
   ______          __        ______            __  _
  / ____/___  ____/ /__     / ____/___ _____  / /_(_)___  ____  _____
 / /   / __ \/ __  / _ \   / /   / __ `/ __ \/ __/ / __ \/ __ \/ ___/
/ /___/ /_/ / /_/ /  __/  / /___/ /_/ / /_/ / /_/ / /_/ / / / (__  )
\____/\____/\__,_/\___/   \____/\__,_/ .___/\__/_/\____/_/ /_/____/
                                    /_/

```

[![VS Code](https://img.shields.io/badge/VS_Code-^1.85.0-blue?style=flat-square&logo=visualstudiocode)](https://code.visualstudio.com/)
[![Version](https://img.shields.io/badge/version-0.1.0-purple?style=flat-square)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

> **Closed captions for AI coding assistants. Stay focused in your editor while understanding exactly what your AI agent is doing.**

Like Netflix subtitles — but for your AI code agent. CodeCaptions watches file changes made by AI assistants (Claude Code, Gemini CLI, Cursor, Copilot, etc.), diffs them in real time, and generates a concise 3–8 word subtitle right in your status bar and a beautiful sidebar panel.

**You never have to look at the AI chat window again.**

---

## Demo

![Demo](./assets/demo.gif)

---

## ✨ Features

- 🎬 **Live subtitles** — 3–8 word captions that describe what the AI is doing ("Adding JWT authentication", "Fixing null pointer bug")
- 📊 **Timestamped history** — scrollable sidebar panel with a full caption timeline
- 🔍 **Diff-based analysis** — reads observable code changes only, never AI chat logs
- 🤖 **Multi-provider** — Gemini, Claude, OpenAI, or local Ollama
- ⚡ **Status bar integration** — always visible without leaving your editor
- 🎛️ **CC controls** — pause/resume, clear history, quick-access CC menu
- 🔒 **Privacy-first** — only analyzes file saves and writes, nothing else
- 🌐 **Offline capable** — works with Ollama for fully local operation
- ⚙️ **Fully configurable** — debounce, history size, auto-hide, and more

---

## 🚀 Quick Start

1. **Install** the CodeCaptions extension from the VS Code Marketplace
2. **Open Settings** → `Ctrl+,` / `Cmd+,` → search `codecaptions`
3. **Set your provider** — choose `gemini`, `claude`, `openai`, or `ollama`
4. **Paste your API key** for the selected provider
5. **Start coding with your AI assistant** — captions appear automatically in the status bar (`$(comment-discussion) CC: ...`) and the sidebar panel

> Click the **🎬 CodeCaptions** icon in the Activity Bar to open the sidebar.
> Click the **CC ▼** button in the status bar for quick controls.

---

## ⚙️ Configuration

All settings are under the `codecaptions.*` namespace.

| Setting | Type | Default | Description |
|---|---|---|---|
| `codecaptions.enabled` | boolean | `true` | Enable or disable live captions |
| `codecaptions.provider` | enum | `"gemini"` | AI provider: `gemini`, `claude`, `openai`, `ollama` |
| `codecaptions.geminiApiKey` | string | `""` | Google Gemini API key |
| `codecaptions.geminiModel` | string | `"gemini-1.5-flash"` | Gemini model name |
| `codecaptions.claudeApiKey` | string | `""` | Anthropic Claude API key |
| `codecaptions.claudeModel` | string | `"claude-haiku-20240307"` | Claude model name |
| `codecaptions.openaiApiKey` | string | `""` | OpenAI API key |
| `codecaptions.openaiModel` | string | `"gpt-4o-mini"` | OpenAI model name |
| `codecaptions.ollamaUrl` | string | `"http://localhost:11434"` | Ollama base URL |
| `codecaptions.ollamaModel` | string | `"qwen2.5-coder"` | Ollama model name |
| `codecaptions.debounceMs` | number | `1500` | Debounce delay (ms) before processing a change |
| `codecaptions.maxHistoryItems` | number | `50` | Max caption history entries |
| `codecaptions.showStatusBar` | boolean | `true` | Show subtitles in the status bar |
| `codecaptions.autoHide` | boolean | `false` | Auto-hide caption after 8 seconds |

---

## 🤖 Supported Providers

| Provider | Recommended Model | Speed | Cost | Offline |
|---|---|---|---|---|
| **Gemini** | `gemini-1.5-flash` | ⚡ Very Fast | 💚 Free tier | ❌ |
| **Claude** | `claude-haiku-20240307` | ⚡ Fast | 💛 Low | ❌ |
| **OpenAI** | `gpt-4o-mini` | ⚡ Fast | 💛 Low | ❌ |
| **Ollama** | `qwen2.5-coder` | 🐢 Depends on hardware | 💚 Free | ✅ |

---

## 🔬 How It Works

```
AI Agent writes code
        ↓
DiffEngine detects file save / FS change
        ↓
Debounce (1500ms default)
        ↓
Extract diff (git diff HEAD, or file preview)
        ↓
Summarizer sends diff to AI provider
        ↓
AI returns 3–8 word caption
        ↓
Status bar updates + sidebar history logs entry
```

1. **Watch**: CodeCaptions listens for `onDidSaveTextDocument` events and file system changes via `createFileSystemWatcher`.
2. **Diff**: It runs `git diff HEAD` to get the actual changes, falling back to reading file content for untracked files.
3. **Summarize**: The diff is sent to your chosen AI provider with a carefully crafted prompt that asks for a 3–8 word present-participle summary.
4. **Display**: The caption appears in the status bar and is logged to the timestamped history timeline in the sidebar.

---

## 🔒 Privacy

**CodeCaptions never reads AI chat windows, conversation logs, or internal reasoning traces.**

It only analyzes:
- File saves triggered by your editor
- File writes observed by the OS file system watcher

No data is sent anywhere except to the AI provider API you configure (Gemini, Claude, OpenAI, or your local Ollama instance). The diff content is sent to generate captions — if you use Ollama, everything stays on your machine.

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

---

## 📄 License

MIT © CodeCaptions Contributors — see [LICENSE](./LICENSE)
