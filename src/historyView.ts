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

  signalProcessing() {
    if (!this.view) return;
    this.view.webview.postMessage({ type: 'processing' });
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #080810;
      --bg-card: rgba(255,255,255,0.035);
      --bg-card-hover: rgba(255,255,255,0.06);
      --border: rgba(255,255,255,0.07);
      --border-hover: rgba(255,255,255,0.16);
      --accent: #7c3aed;
      --accent2: #4f46e5;
      --accent3: #06b6d4;
      --accent-glow: rgba(124,58,237,0.35);
      --accent-gradient: linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #06b6d4 100%);
      --text-primary: #f0f4ff;
      --text-secondary: #94a3b8;
      --text-muted: #475569;
      --live-red: #f43f5e;
      --live-glow: rgba(244,63,94,0.4);
      --r-card: 14px;
      --r-pill: 100px;
      --r-tag: 8px;
    }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
      font-size: 13px;
      line-height: 1.5;
    }

    /* ── SCROLLBAR ── */
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.5); }

    /* ── AMBIENT GLOW BACKGROUND ── */
    body::before {
      content: '';
      position: fixed;
      top: -60px; left: -60px;
      width: 240px; height: 240px;
      background: radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%);
      pointer-events: none;
      animation: drift 8s ease-in-out infinite alternate;
    }
    body::after {
      content: '';
      position: fixed;
      bottom: -40px; right: -40px;
      width: 200px; height: 200px;
      background: radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%);
      pointer-events: none;
      animation: drift 10s ease-in-out infinite alternate-reverse;
    }
    @keyframes drift {
      from { transform: translate(0,0) scale(1); }
      to   { transform: translate(20px,15px) scale(1.1); }
    }

    /* ── HEADER ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 16px 11px;
      background: rgba(8,8,16,0.85);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 20;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-icon-wrap {
      width: 28px; height: 28px;
      border-radius: 8px;
      background: var(--accent-gradient);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      box-shadow: 0 0 16px var(--accent-glow);
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.03em;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ── LIVE BADGE ── */
    .live-badge {
      display: flex; align-items: center; gap: 5px;
      padding: 3px 9px;
      border-radius: var(--r-pill);
      font-size: 9px; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase;
      transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
    }
    .live-badge.live {
      background: rgba(244,63,94,0.12);
      color: var(--live-red);
      border: 1px solid rgba(244,63,94,0.3);
      box-shadow: 0 0 12px rgba(244,63,94,0.15);
    }
    .live-badge.paused {
      background: rgba(71,85,105,0.12);
      color: var(--text-muted);
      border: 1px solid rgba(71,85,105,0.2);
      box-shadow: none;
    }
    .pulse-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
    .live .pulse-dot {
      animation: livePulse 1.4s ease-in-out infinite;
      box-shadow: 0 0 6px currentColor;
    }
    @keyframes livePulse {
      0%,100% { opacity:1; transform: scale(1); }
      50%      { opacity:0.3; transform: scale(0.6); }
    }

    /* ── CAPTION CARD ── */
    .caption-section { padding: 14px 14px 0; }

    .caption-card {
      position: relative;
      background: var(--bg-card);
      border-radius: var(--r-card);
      padding: 16px 16px 14px 20px;
      overflow: hidden;
      border: 1px solid var(--border);
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .caption-card.has-caption {
      border-color: rgba(124,58,237,0.25);
      box-shadow: 0 0 24px rgba(124,58,237,0.1), inset 0 0 24px rgba(124,58,237,0.03);
    }

    /* gradient left accent bar */
    .caption-card::before {
      content: '';
      position: absolute; left:0; top:0; bottom:0; width:4px;
      background: var(--accent-gradient);
      border-radius: 3px 0 0 3px;
      transition: opacity 0.3s ease;
    }

    /* shimmer sweep on new caption */
    .caption-card::after {
      content: '';
      position: absolute; top:0; left:-100%; width:60%; height:100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
      pointer-events: none;
    }
    .caption-card.shimmer::after {
      animation: shimmer 0.7s ease-out forwards;
    }
    @keyframes shimmer {
      from { left: -100%; }
      to   { left: 150%; }
    }

    .caption-card.animate-in {
      animation: captionIn 0.4s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes captionIn {
      from { opacity:0; transform: translateY(-10px) scale(0.98); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }

    .caption-label {
      font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 6px;
    }

    .caption-text {
      font-size: 15px; font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.025em;
      line-height: 1.35;
      margin-bottom: 8px;
      min-height: 22px;
    }
    .caption-text.empty {
      font-size: 13px; font-weight: 400;
      color: var(--text-muted); font-style: italic;
    }

    /* typewriter cursor */
    .caption-text .cursor {
      display: inline-block;
      width: 2px; height: 1em;
      background: var(--accent);
      margin-left: 2px;
      vertical-align: text-bottom;
      animation: blink 0.9s step-end infinite;
      border-radius: 1px;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

    .caption-meta {
      display: flex; align-items: center; gap: 8px;
      flex-wrap: wrap;
    }
    .caption-filename {
      font-size: 10px; color: var(--text-secondary);
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      padding: 1px 7px; border-radius: var(--r-tag);
      max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .caption-time {
      font-size: 10px; color: var(--text-muted);
      margin-left: auto;
    }

    /* ── STATS ROW ── */
    .stats-row {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 14px 0;
    }
    .stat-chip {
      display: flex; align-items: center; gap: 4px;
      padding: 3px 9px; border-radius: var(--r-pill);
      background: var(--bg-card); border: 1px solid var(--border);
      font-size: 10px; color: var(--text-muted);
    }
    .stat-chip .stat-val {
      font-weight: 600; color: var(--text-secondary);
    }
    .stat-chip-accent {
      background: rgba(124,58,237,0.08);
      border-color: rgba(124,58,237,0.18);
    }
    .stat-chip-accent .stat-val {
      color: #a78bfa;
    }

    /* ── CONTROLS ── */
    .controls-row {
      display: flex; align-items: center; gap: 6px;
      padding: 12px 14px;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 11px; border-radius: var(--r-pill);
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-size: 11px; font-weight: 500;
      cursor: pointer;
      transition: all 0.18s ease;
      font-family: inherit; white-space: nowrap;
      position: relative; overflow: hidden;
    }
    .btn::before {
      content: '';
      position: absolute; inset: 0;
      background: var(--accent-gradient);
      opacity: 0;
      transition: opacity 0.18s ease;
    }
    .btn span { position: relative; z-index: 1; }
    .btn:hover {
      border-color: var(--border-hover);
      color: var(--text-primary);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .btn:active { transform: translateY(0) scale(0.97); }

    .btn-primary {
      background: rgba(124,58,237,0.14);
      border-color: rgba(124,58,237,0.35);
      color: #a78bfa;
    }
    .btn-primary:hover {
      background: rgba(124,58,237,0.24);
      border-color: rgba(124,58,237,0.55);
      color: #c4b5fd;
      box-shadow: 0 4px 20px rgba(124,58,237,0.3);
    }
    .btn-danger:hover {
      border-color: rgba(244,63,94,0.4);
      color: #fda4af;
      box-shadow: 0 4px 16px rgba(244,63,94,0.2);
    }
    .btn-icon { flex-shrink: 0; }

    /* ── DIVIDER ── */
    .divider {
      height: 1px;
      margin: 0 14px 12px;
      background: linear-gradient(90deg, transparent, var(--border) 30%, var(--border) 70%, transparent);
    }

    /* ── HISTORY ── */
    .history-section { padding: 0 14px 16px; }

    .history-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 10px;
    }
    .history-title {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--text-muted);
    }
    .count-badge {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 1px 6px; border-radius: var(--r-pill);
      background: rgba(124,58,237,0.1);
      border: 1px solid rgba(124,58,237,0.2);
      font-size: 10px; font-weight: 700;
      color: #a78bfa; min-width: 22px;
      transition: all 0.3s ease;
    }

    .history-list { display: flex; flex-direction: column; gap: 3px; }

    .history-item {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px;
      border-radius: var(--r-tag);
      border: 1px solid transparent;
      cursor: default;
      transition: all 0.15s ease;
      animation: itemIn 0.35s cubic-bezier(0.16,1,0.3,1) both;
    }
    @keyframes itemIn {
      from { opacity:0; transform: translateX(-10px); }
      to   { opacity:1; transform: translateX(0); }
    }
    .history-item:hover {
      background: var(--bg-card-hover);
      border-color: var(--border);
    }
    .history-item:first-child .time-pill {
      background: rgba(124,58,237,0.2);
      border-color: rgba(124,58,237,0.4);
      color: #c4b5fd;
    }

    .time-pill {
      flex-shrink: 0;
      padding: 2px 7px; border-radius: var(--r-pill);
      background: rgba(124,58,237,0.08);
      border: 1px solid rgba(124,58,237,0.15);
      color: #a78bfa;
      font-size: 9px; font-weight: 700;
      font-family: 'SF Mono','Monaco','Consolas',monospace;
      min-width: 40px; text-align: center;
    }
    .item-caption {
      flex: 1; font-size: 12px; font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .file-badge {
      flex-shrink: 0;
      padding: 2px 7px; border-radius: var(--r-tag);
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 9px;
      font-family: 'SF Mono','Monaco','Consolas',monospace;
      max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* ── EMPTY STATE ── */
    .empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 28px 16px 20px; gap: 10px; text-align: center;
    }
    .empty-orb {
      width: 54px; height: 54px; border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, rgba(124,58,237,0.25), rgba(79,70,229,0.06));
      border: 1px solid rgba(124,58,237,0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
      animation: floatOrb 4s ease-in-out infinite;
      box-shadow: 0 0 30px rgba(124,58,237,0.1);
    }
    @keyframes floatOrb {
      0%,100% { transform: translateY(0) rotate(0deg); }
      50%      { transform: translateY(-6px) rotate(3deg); }
    }
    .empty-title {
      font-size: 13px; font-weight: 600;
      color: var(--text-secondary);
      letter-spacing: -0.01em;
    }
    .empty-sub {
      font-size: 11px; color: var(--text-muted); line-height: 1.5;
    }

    /* ── PROCESSING INDICATOR ── */
    .processing-bar {
      height: 2px;
      background: var(--accent-gradient);
      background-size: 200% 100%;
      animation: sweep 1.2s ease-in-out infinite;
      border-radius: 1px;
      margin: 0 14px;
      display: none;
    }
    .processing-bar.active { display: block; }
    @keyframes sweep {
      0%   { background-position: 200% 0; opacity: 0.6; }
      50%  { background-position: 0% 0; opacity: 1; }
      100% { background-position: -200% 0; opacity: 0.6; }
    }

    /* ── FOOTER ── */
    .footer { padding: 6px 14px 12px; text-align: center; }
    .footer-text {
      font-size: 9px; color: var(--text-muted);
      letter-spacing: 0.04em; opacity: 0.7;
    }
  </style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="logo">
    <div class="logo-icon-wrap">🎬</div>
    <span class="logo-text">CodeCaptions</span>
  </div>
  <div class="live-badge live" id="liveBadge">
    <span class="pulse-dot"></span>
    <span id="liveLabel">LIVE</span>
  </div>
</div>

<!-- PROCESSING BAR -->
<div class="processing-bar" id="processingBar"></div>

<!-- CAPTION CARD -->
<div class="caption-section">
  <div class="caption-card" id="captionCard">
    <div class="caption-label">NOW PLAYING</div>
    <div class="caption-text empty" id="captionText">Watching for changes…</div>
    <div class="caption-meta" id="captionMeta" style="display:none">
      <span class="caption-filename" id="captionFilename"></span>
      <span class="caption-time" id="captionTime"></span>
    </div>
  </div>
</div>

<!-- STATS ROW -->
<div class="stats-row">
  <div class="stat-chip stat-chip-accent">
    <span class="stat-val" id="totalStat">0</span>
    <span>captions</span>
  </div>
  <div class="stat-chip" id="sessionStat" style="display:none">
    <span class="stat-val" id="sessionVal">0</span>
    <span>this session</span>
  </div>
</div>

<!-- CONTROLS -->
<div class="controls-row">
  <button class="btn btn-primary" id="toggleBtn" onclick="handleToggle()">
    <span class="btn-icon">⏸</span><span>Pause</span>
  </button>
  <button class="btn btn-danger" onclick="handleClear()">
    <span class="btn-icon">🗑</span><span>Clear</span>
  </button>
  <button class="btn" onclick="handleSettings()">
    <span class="btn-icon">⚙</span><span>Settings</span>
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
      <div class="empty-orb">✨</div>
      <div class="empty-title">No captions yet</div>
      <div class="empty-sub">Start coding with your AI<br>assistant to see live subtitles</div>
    </div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  <span class="footer-text">Analyzing observable code changes only • Never reads AI chat</span>
</div>

<script>
  const vscode = acquireVsCodeApi();
  let isEnabled = true;
  let lastTimestamp = null;
  let sessionCount = 0;
  let timeInterval = null;
  let processingTimeout = null;

  /* ── Helpers ── */
  function handleToggle() { vscode.postMessage({ type: isEnabled ? 'pause' : 'resume' }); }
  function handleClear()  { vscode.postMessage({ type: 'clear' }); sessionCount = 0; updateSessionStat(); }
  function handleSettings(){ vscode.postMessage({ type: 'openSettings' }); }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });
  }
  function formatRelative(date) {
    const d = Date.now() - new Date(date).getTime();
    if (d < 5000)   return 'just now';
    if (d < 60000)  return Math.floor(d/1000) + 's ago';
    if (d < 3600000)return Math.floor(d/60000) + 'm ago';
    return Math.floor(d/3600000) + 'h ago';
  }
  function trunc(s, n) { return s && s.length > n ? s.slice(0,n)+'…' : (s||''); }
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Processing bar ── */
  function showProcessing() {
    document.getElementById('processingBar').classList.add('active');
    clearTimeout(processingTimeout);
    processingTimeout = setTimeout(() => {
      document.getElementById('processingBar').classList.remove('active');
    }, 3000);
  }
  function hideProcessing() {
    clearTimeout(processingTimeout);
    document.getElementById('processingBar').classList.remove('active');
  }

  /* ── Session stat ── */
  function updateSessionStat() {
    const el = document.getElementById('sessionStat');
    const val = document.getElementById('sessionVal');
    if (sessionCount > 0) { el.style.display = 'flex'; val.textContent = sessionCount; }
    else { el.style.display = 'none'; }
  }

  /* ── Caption card ── */
  function typewriterSet(el, text) {
    el.innerHTML = '';
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    el.appendChild(cursor);
    const iv = setInterval(() => {
      if (i < text.length) {
        el.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
      } else {
        clearInterval(iv);
        setTimeout(() => cursor.remove(), 800);
      }
    }, 28);
  }

  function updateCurrentCaption(caption, filename) {
    const card   = document.getElementById('captionCard');
    const text   = document.getElementById('captionText');
    const meta   = document.getElementById('captionMeta');
    const fnEl   = document.getElementById('captionFilename');
    const timeEl = document.getElementById('captionTime');

    hideProcessing();

    if (caption) {
      text.classList.remove('empty');
      card.classList.add('has-caption');
      typewriterSet(text, caption);
      fnEl.textContent = filename || '';
      lastTimestamp = new Date();
      timeEl.textContent = 'just now';
      meta.style.display = 'flex';

      // Animate card
      card.classList.remove('animate-in','shimmer');
      void card.offsetWidth;
      card.classList.add('animate-in','shimmer');

      sessionCount++;
      updateSessionStat();

      // Tick relative time
      clearInterval(timeInterval);
      timeInterval = setInterval(() => {
        if (lastTimestamp) timeEl.textContent = formatRelative(lastTimestamp);
      }, 3000);
    } else {
      text.innerHTML = 'Watching for changes…';
      text.classList.add('empty');
      card.classList.remove('has-caption');
      meta.style.display = 'none';
    }
  }

  /* ── History list ── */
  function renderHistory(history) {
    const list  = document.getElementById('historyList');
    const badge = document.getElementById('countBadge');
    const total = document.getElementById('totalStat');

    badge.textContent = history.length;
    total.textContent = history.length;

    if (!history || history.length === 0) {
      list.innerHTML = \`
        <div class="empty-state">
          <div class="empty-orb">✨</div>
          <div class="empty-title">No captions yet</div>
          <div class="empty-sub">Start coding with your AI<br>assistant to see live subtitles</div>
        </div>\`;
      return;
    }

    list.innerHTML = history.map((entry, i) => {
      const delay = Math.min(i * 25, 250);
      return \`<div class="history-item" style="animation-delay:\${delay}ms">
        <span class="time-pill">\${formatTime(entry.timestamp)}</span>
        <span class="item-caption" title="\${esc(entry.caption)}">\${esc(entry.caption)}</span>
        <span class="file-badge" title="\${esc(entry.filename)}">\${esc(trunc(entry.filename, 14))}</span>
      </div>\`;
    }).join('');
  }

  /* ── Live badge & toggle ── */
  function updateLiveBadge(enabled) {
    const badge  = document.getElementById('liveBadge');
    const label  = document.getElementById('liveLabel');
    const btn    = document.getElementById('toggleBtn');
    if (enabled) {
      badge.className = 'live-badge live';
      label.textContent = 'LIVE';
      btn.innerHTML = '<span class="btn-icon">⏸</span><span>Pause</span>';
    } else {
      badge.className = 'live-badge paused';
      label.textContent = 'PAUSED';
      btn.innerHTML = '<span class="btn-icon">▶</span><span>Resume</span>';
    }
  }

  /* ── Messages from extension ── */
  window.addEventListener('message', (event) => {
    const msg = event.data;

    if (msg.type === 'update') {
      if (msg.caption) updateCurrentCaption(msg.caption, msg.filename);
      renderHistory(msg.history || []);
    }

    if (msg.type === 'stateChange') {
      isEnabled = msg.enabled;
      updateLiveBadge(isEnabled);
    }

    if (msg.type === 'processing') {
      showProcessing();
    }
  });
</script>
</body>
</html>`;
  }
}
