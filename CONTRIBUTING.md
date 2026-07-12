# Contributing to CodeCaptions

Thanks for your interest in contributing! 🎬

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/akvinayaktiwari/CodeCaptions.git
   cd CodeCaptions
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the build watcher**
   ```bash
   npm run watch
   ```

4. **Launch the Extension Development Host**
   - Open the project in VS Code
   - Press **F5** (or go to Run → Start Debugging)
   - A new VS Code window opens with the extension loaded

5. **Make your changes** in `src/` — esbuild will rebuild automatically

6. **Reload** the Extension Development Host with `Ctrl+Shift+P` → "Developer: Reload Window"

## Project Structure

```
src/
├── extension.ts    # Entry point — wires all components
├── diffEngine.ts   # File watching and diff extraction
├── summarizer.ts   # AI provider routing (Gemini/Claude/OpenAI/Ollama)
├── timeline.ts     # In-memory + persisted caption history
└── historyView.ts  # Webview sidebar panel
```

## Contribution Areas

- 🤖 **New AI providers** — add a new provider in `summarizer.ts`
- 🎨 **UI themes** — improve the webview design in `historyView.ts`
- ⚡ **Performance** — optimize the diff engine or debouncing logic
- 📚 **Documentation** — improve README, add examples, write guides
- 🐛 **Bug fixes** — see open issues on GitHub

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Mistral AI provider
fix: handle binary file detection edge case
docs: update README with Ollama setup guide
chore: bump esbuild to 0.21
```

## Pull Request Process

1. Fork the repo and create a feature branch
2. Make your changes with clear commits
3. Ensure `npx tsc --noEmit` passes with no errors
4. Open a PR with a description of what you changed and why

## Code Style

- TypeScript strict mode is enabled — no `any` types
- Use `async/await` consistently
- All errors must be caught — never let the extension crash the host
- Log to the `CodeCaptions` output channel using the provided `outputChannel`
