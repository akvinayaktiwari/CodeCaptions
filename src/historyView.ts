import * as vscode from 'vscode';
import { Timeline, CaptionEntry } from './timeline';

export class HistoryViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codecaptionsHistory';

  private view?: vscode.WebviewView;
  private isEnabled = true;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly timeline: Timeline,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this.getHtml();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'pause':
          vscode.commands.executeCommand('codecaptions.toggle');
          break;
        case 'resume':
          vscode.commands.executeCommand('codecaptions.toggle');
          break;
        case 'clear':
          vscode.commands.executeCommand('codecaptions.clearHistory');
          break;
        case 'openSettings':
          vscode.commands.executeCommand('workbench.action.openSettings', 'codecaptions');
          break;
      }
    });

    // Send initial state
    this.refresh();
  }

  update(caption: string, filename: string) {
    if (!this.view) return;
    this.view.webview.postMessage({
      type: 'update',
      caption,
      filename,
      history: this.timeline.getAll(),
    });
  }

  refresh() {
    if (!this.view) return;
    this.view.webview.postMessage({
      type: 'update',
      caption: '',
      filename: '',
      history: this.timeline.getAll(),
    });
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!this.view) return;
    this.view.webview.postMessage({
      type: 'stateChange',
      enabled,
    });
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline';" />
  <title>CodeCaptions</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg: #0d0d0f;
      --bg-card: rgba(255, 255, 255, 0.04);
      --border: rgba(255, 255, 255, 0.08);
      --border-hover: rgba(255, 255, 255, 0.15);
      --accent-from: #7c3aed;
      --accent-to: #4f46e5;
      --accent-gradient: linear-gradient(135deg, var(--accent-from), var(--accent-to));
      --text-primary: #e2e8f0;
      --text-muted: #64748b;
      --text-dim: #475569;
      --live-red: #ef4444;
      --radius-card: 12px;
      --radius-tag: 8px;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
      font-size: 13px;
      line-height: 1.5;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

    /* ─── HEADER ─── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 12px;
      background: rgba(13,13,15,0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header-logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-logo .logo-icon {
      font-size: 18px;
      line-height: 1;
    }

    .header-logo .logo-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 100px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      transition: all 0.3s ease;
    }

    .live-badge.live {
      background: rgba(239, 68, 68, 0.15);
      color: var(--live-red);
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .live-badge.paused {
      background: rgba(100, 116, 139, 0.15);
      color: var(--text-muted);
      border: 1px solid rgba(100, 116, 139, 0.2);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .live .pulse-dot {
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }

    /* ─── CURRENT CAPTION CARD ─── */
    .current-caption-section {
      padding: 14px 16px 0;
    }

    .caption-card {
      position: relative;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      padding: 14px 16px 14px 20px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .caption-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--accent-gradient);
      border-radius: 3px 0 0 3px;
    }

    .caption-card.animate-in {
      animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .caption-text {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      line-height: 1.3;
      margin-bottom: 6px;
    }

    .caption-text.empty {
      font-size: 13px;
      font-weight: 400;
      color: var(--text-muted);
      font-style: italic;
    }

    .caption-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .caption-filename {
      font-size: 11px;
      color: var(--text-muted);
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }

    .caption-time {
      font-size: 11px;
      color: var(--text-dim);
      flex-shrink: 0;
    }

    /* ─── CC CONTROLS ─── */
    .controls-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 12px 16px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 100px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      white-space: nowrap;
    }

    .btn:hover {
      border-color: var(--border-hover);
      color: var(--text-primary);
      background: rgba(255,255,255,0.07);
      box-shadow: 0 0 12px rgba(124, 58, 237, 0.15);
    }

    .btn:active {
      transform: scale(0.96);
    }

    .btn-primary {
      background: rgba(124, 58, 237, 0.15);
      border-color: rgba(124, 58, 237, 0.3);
      color: #a78bfa;
    }

    .btn-primary:hover {
      background: rgba(124, 58, 237, 0.25);
      border-color: rgba(124, 58, 237, 0.5);
      color: #c4b5fd;
      box-shadow: 0 0 16px rgba(124, 58, 237, 0.3);
    }

    .btn-danger:hover {
      border-color: rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.15);
    }

    /* ─── HISTORY SECTION ─── */
    .history-section {
      padding: 0 16px 16px;
    }

    .history-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .history-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1px 6px;
      border-radius: 100px;
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--border);
      font-size: 10px;
      font-weight: 600;
      color: var(--text-dim);
      min-width: 20px;
    }

    .divider {
      height: 1px;
      background: var(--border);
      margin: 0 16px 14px;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .history-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: var(--radius-tag);
      border: 1px solid transparent;
      transition: all 0.2s ease;
      animation: fadeInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeInLeft {
      from {
        opacity: 0;
        transform: translateX(-12px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .history-item:hover {
      background: var(--bg-card);
      border-color: var(--border);
    }

    .time-pill {
      flex-shrink: 0;
      padding: 2px 7px;
      border-radius: 100px;
      background: rgba(124, 58, 237, 0.12);
      border: 1px solid rgba(124, 58, 237, 0.2);
      color: #a78bfa;
      font-size: 10px;
      font-weight: 600;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      min-width: 42px;
      text-align: center;
    }

    .item-caption {
      flex: 1;
      font-size: 12px;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-badge {
      flex-shrink: 0;
      padding: 2px 7px;
      border-radius: var(--radius-tag);
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 10px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      max-width: 80px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ─── EMPTY STATE ─── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      gap: 8px;
      color: var(--text-muted);
      text-align: center;
    }

    .empty-icon {
      font-size: 28px;
      opacity: 0.5;
    }

    .empty-text {
      font-size: 12px;
      color: var(--text-dim);
      line-height: 1.5;
    }

    /* ─── FOOTER ─── */
    .footer {
      padding: 8px 16px 14px;
      text-align: center;
    }

    .footer-text {
      font-size: 10px;
      color: var(--text-dim);
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-logo">
      <span class="logo-icon">🎬</span>
      <span class="logo-text">CodeCaptions</span>
    </div>
    <div class="live-badge live" id="liveBadge">
      <span class="pulse-dot"></span>
      <span id="liveLabel">LIVE</span>
    </div>
  </div>

  <!-- CURRENT CAPTION CARD -->
  <div class="current-caption-section">
    <div class="caption-card" id="captionCard">
      <div class="caption-text empty" id="captionText">Watching for changes…</div>
      <div class="caption-meta" id="captionMeta" style="display: none;">
        <span class="caption-filename" id="captionFilename"></span>
        <span class="caption-time" id="captionTime"></span>
      </div>
    </div>
  </div>

  <!-- CONTROLS -->
  <div class="controls-row">
    <button class="btn btn-primary" id="toggleBtn" onclick="handleToggle()">
      ⏸ Pause
    </button>
    <button class="btn btn-danger" onclick="handleClear()">
      🗑 Clear
    </button>
    <button class="btn" onclick="handleSettings()">
      ⚙ Settings
    </button>
  </div>

  <div class="divider"></div>

  <!-- HISTORY -->
  <div class="history-section">
    <div class="history-header">
      <span class="history-title">Recent Activity</span>
      <span class="count-badge" id="countBadge">0</span>
    </div>
    <div class="history-list" id="historyList">
      <div class="empty-state">
        <span class="empty-icon">✨</span>
        <span class="empty-text">No captions yet.<br>Start coding!</span>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span class="footer-text">Analyzing observable code changes only.</span>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let isEnabled = true;
    let lastTimestamp = null;

    function handleToggle() {
      vscode.postMessage({ type: isEnabled ? 'pause' : 'resume' });
    }

    function handleClear() {
      vscode.postMessage({ type: 'clear' });
    }

    function handleSettings() {
      vscode.postMessage({ type: 'openSettings' });
    }

    function formatTime(date) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function formatRelativeTime(date) {
      const diffMs = Date.now() - new Date(date).getTime();
      if (diffMs < 5000) return 'just now';
      if (diffMs < 60000) return Math.floor(diffMs / 1000) + 's ago';
      if (diffMs < 3600000) return Math.floor(diffMs / 60000) + 'm ago';
      return Math.floor(diffMs / 3600000) + 'h ago';
    }

    function truncate(str, maxLen) {
      if (!str) return '';
      return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
    }

    function renderHistory(history) {
      const list = document.getElementById('historyList');
      const badge = document.getElementById('countBadge');
      badge.textContent = history.length;

      if (!history || history.length === 0) {
        list.innerHTML = \`
          <div class="empty-state">
            <span class="empty-icon">✨</span>
            <span class="empty-text">No captions yet.<br>Start coding!</span>
          </div>\`;
        return;
      }

      list.innerHTML = history.map((entry, i) => {
        const time = formatTime(new Date(entry.timestamp));
        const caption = entry.caption || '';
        const filename = truncate(entry.filename, 15);
        const delay = i === 0 ? '0ms' : \`\${Math.min(i * 30, 200)}ms\`;
        return \`
          <div class="history-item" style="animation-delay: \${delay}">
            <span class="time-pill">\${time}</span>
            <span class="item-caption" title="\${caption}">\${caption}</span>
            <span class="file-badge" title="\${entry.filename}">\${filename}</span>
          </div>\`;
      }).join('');
    }

    function updateCurrentCaption(caption, filename) {
      const card = document.getElementById('captionCard');
      const text = document.getElementById('captionText');
      const meta = document.getElementById('captionMeta');
      const filenameEl = document.getElementById('captionFilename');
      const timeEl = document.getElementById('captionTime');

      if (caption) {
        text.textContent = caption;
        text.classList.remove('empty');
        filenameEl.textContent = filename || '';
        lastTimestamp = new Date();
        timeEl.textContent = 'just now';
        meta.style.display = 'flex';

        // Animate in
        card.classList.remove('animate-in');
        void card.offsetWidth; // reflow
        card.classList.add('animate-in');

        // Update relative time every second
        clearInterval(window._timeInterval);
        window._timeInterval = setInterval(() => {
          if (lastTimestamp) {
            timeEl.textContent = formatRelativeTime(lastTimestamp);
          }
        }, 1000);
      } else {
        text.textContent = 'Watching for changes…';
        text.classList.add('empty');
        meta.style.display = 'none';
      }
    }

    function updateLiveBadge(enabled) {
      const badge = document.getElementById('liveBadge');
      const label = document.getElementById('liveLabel');
      const btn = document.getElementById('toggleBtn');

      if (enabled) {
        badge.className = 'live-badge live';
        label.textContent = 'LIVE';
        btn.textContent = '⏸ Pause';
      } else {
        badge.className = 'live-badge paused';
        label.textContent = 'PAUSED';
        btn.textContent = '▶ Resume';
      }
    }

    window.addEventListener('message', (event) => {
      const message = event.data;

      if (message.type === 'update') {
        if (message.caption) {
          updateCurrentCaption(message.caption, message.filename);
        }
        renderHistory(message.history || []);
      }

      if (message.type === 'stateChange') {
        isEnabled = message.enabled;
        updateLiveBadge(isEnabled);
      }
    });
  </script>
</body>
</html>`;
  }
}
