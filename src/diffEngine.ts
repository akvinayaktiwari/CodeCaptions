import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface DiffChange {
  filename: string;
  diff: string;
  linesChanged: number;
}

// Binary file extensions to ignore
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.ogg', '.webm',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib',
  '.vsix', '.bin', '.dat',
]);

// Paths/patterns to always ignore
const IGNORED_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'out',
  '.vscode-test',
];

const IGNORED_EXTENSIONS = new Set(['.lock', '.log', '.map']);

function shouldIgnoreFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return true;
  if (IGNORED_EXTENSIONS.has(ext)) return true;

  const normalised = filePath.replace(/\\/g, '/');
  for (const pattern of IGNORED_PATTERNS) {
    if (normalised.includes(`/${pattern}/`) || normalised.includes(`/${pattern}`)) {
      return true;
    }
  }
  return false;
}

function getGitDiff(workspaceRoot: string, filePath: string): string | null {
  try {
    const gitDir = path.join(workspaceRoot, '.git');
    if (!fs.existsSync(gitDir)) return null;

    const relativePath = path.relative(workspaceRoot, filePath);
    const output = cp.execSync(`git diff HEAD -- "${relativePath}"`, {
      cwd: workspaceRoot,
      timeout: 5000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!output || output.trim() === '') {
      // Try staged diff
      const staged = cp.execSync(`git diff --cached HEAD -- "${relativePath}"`, {
        cwd: workspaceRoot,
        timeout: 5000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return staged.trim() || null;
    }
    return output;
  } catch {
    return null;
  }
}

function parseDiff(rawDiff: string): { diff: string; linesChanged: number } {
  const lines = rawDiff.split('\n');
  const meaningful: string[] = [];
  let linesChanged = 0;

  for (const line of lines) {
    if (
      line.startsWith('+++') ||
      line.startsWith('---') ||
      line.startsWith('@@') ||
      line.startsWith('+') ||
      line.startsWith('-')
    ) {
      if (line.startsWith('+') || line.startsWith('-')) {
        linesChanged++;
      }
      meaningful.push(line);
      if (meaningful.length >= 50) break;
    }
  }

  return { diff: meaningful.join('\n'), linesChanged };
}

function readFilePreview(filePath: string): { diff: string; linesChanged: number } {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').slice(0, 100);
    return {
      diff: lines.join('\n'),
      linesChanged: lines.length,
    };
  } catch {
    return { diff: '', linesChanged: 0 };
  }
}

export class DiffEngine implements vscode.Disposable {
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private enabled = true;
  private debounceMs: number;
  private disposables: vscode.Disposable[] = [];
  private outputChannel: vscode.OutputChannel;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onDiff: (change: DiffChange) => void,
  ) {
    const config = vscode.workspace.getConfiguration('codecaptions');
    this.debounceMs = config.get<number>('debounceMs', 1500);
    this.enabled = config.get<boolean>('enabled', true);

    this.outputChannel = vscode.window.createOutputChannel('CodeCaptions');
    this.context.subscriptions.push(this.outputChannel);

    this.registerListeners();
  }

  private registerListeners() {
    // Listen for saves
    const saveListener = vscode.workspace.onDidSaveTextDocument((doc) => {
      this.handleFileChange(doc.uri.fsPath);
    });
    this.disposables.push(saveListener);

    // File system watcher for AI agent writes (no explicit save)
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    watcher.onDidChange((uri) => this.handleFileChange(uri.fsPath));
    watcher.onDidCreate((uri) => this.handleFileChange(uri.fsPath));
    this.disposables.push(watcher);
  }

  private handleFileChange(filePath: string) {
    if (!this.enabled) return;
    if (shouldIgnoreFile(filePath)) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processDiff(filePath);
    }, this.debounceMs);
  }

  private processDiff(filePath: string) {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspaceRoot = workspaceFolders?.[0]?.uri?.fsPath ?? '';
      const filename = path.basename(filePath);

      let diff: string;
      let linesChanged: number;

      const rawGitDiff = getGitDiff(workspaceRoot, filePath);
      if (rawGitDiff) {
        const parsed = parseDiff(rawGitDiff);
        diff = parsed.diff;
        linesChanged = parsed.linesChanged;
      } else {
        const preview = readFilePreview(filePath);
        diff = preview.diff;
        linesChanged = preview.linesChanged;
      }

      if (!diff || diff.trim() === '') {
        this.outputChannel.appendLine(`[DiffEngine] No meaningful diff for: ${filename}`);
        return;
      }

      this.outputChannel.appendLine(`[DiffEngine] Change detected in: ${filename} (${linesChanged} lines)`);
      this.onDiff({ filename, diff, linesChanged });
    } catch (err) {
      this.outputChannel.appendLine(`[DiffEngine] Error processing ${filePath}: ${err}`);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  updateDebounceMs(ms: number) {
    this.debounceMs = ms;
  }

  dispose() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
