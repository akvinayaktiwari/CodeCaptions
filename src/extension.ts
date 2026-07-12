import * as vscode from 'vscode';
import { DiffEngine } from './diffEngine';
import { Summarizer } from './summarizer';
import { Timeline } from './timeline';
import { HistoryViewProvider } from './historyView';

let outputChannel: vscode.OutputChannel;
let autoHideTimer: ReturnType<typeof setTimeout> | undefined;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('CodeCaptions');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('[CodeCaptions] Activating…');

  // ─── Init all components ───
  const timeline = new Timeline(context);
  context.subscriptions.push(timeline);

  let config = vscode.workspace.getConfiguration('codecaptions');
  const summarizer = new Summarizer(config, outputChannel);
  const historyView = new HistoryViewProvider(context, timeline);

  // ─── Register sidebar view ───
  const viewProvider = vscode.window.registerWebviewViewProvider(
    HistoryViewProvider.viewType,
    historyView,
  );
  context.subscriptions.push(viewProvider);

  // ─── Status bar ───
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBar.text = '$(comment-discussion) CC: Ready';
  statusBar.tooltip = 'CodeCaptions — Click to open CC menu';
  statusBar.command = 'codecaptions.cc';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // ─── DiffEngine ───
  const diffEngine = new DiffEngine(context, async (change) => {
    try {
      outputChannel.appendLine(`[Extension] Processing diff for: ${change.filename}`);

      // Signal webview immediately so the processing bar animates
      historyView.signalProcessing();
      statusBar.text = '$(comment-discussion) CC: Analyzing…';

      const caption = await summarizer.summarize(change);
      if (!caption) {
        statusBar.text = '$(comment-discussion) CC: Ready';
        return;
      }

      outputChannel.appendLine(`[Extension] Caption: "${caption}"`);

      // Update status bar
      const showStatusBar = config.get<boolean>('showStatusBar', true);
      if (showStatusBar) {
        statusBar.text = `$(comment-discussion) ${caption}`;
      }

      // Auto-hide
      const autoHide = config.get<boolean>('autoHide', false);
      if (autoHide) {
        if (autoHideTimer) clearTimeout(autoHideTimer);
        autoHideTimer = setTimeout(() => {
          statusBar.text = '$(comment-discussion) CC';
        }, 8000);
      }

      // Add to timeline & update webview
      const enabled = config.get<boolean>('enabled', true);
      if (enabled) {
        timeline.add(caption, change.filename);
        historyView.update(caption, change.filename);
        // Show as a transient toast on screen
        vscode.window.showInformationMessage(`🎬 CC: ${caption} (${change.filename})`);
      }
    } catch (err) {
      // Swallow silently — never crash the host
      outputChannel.appendLine(`[Extension] Swallowed error in pipeline: ${err}`);
    }
  });
  context.subscriptions.push(diffEngine);

  // ─── Commands ───

  // Toggle
  context.subscriptions.push(
    vscode.commands.registerCommand('codecaptions.toggle', () => {
      const current = config.get<boolean>('enabled', true);
      const newVal = !current;
      vscode.workspace.getConfiguration().update(
        'codecaptions.enabled',
        newVal,
        vscode.ConfigurationTarget.Global,
      );
      diffEngine.setEnabled(newVal);
      historyView.setEnabled(newVal);
      statusBar.text = newVal
        ? '$(comment-discussion) CC: Ready'
        : '$(comment-discussion) CC: Paused';
      vscode.window.showInformationMessage(
        `CodeCaptions ${newVal ? 'enabled ✅' : 'paused ⏸'}`,
      );
    }),
  );

  // Show history
  context.subscriptions.push(
    vscode.commands.registerCommand('codecaptions.showHistory', () => {
      vscode.commands.executeCommand('codecaptionsHistory.focus');
    }),
  );

  // Clear history
  context.subscriptions.push(
    vscode.commands.registerCommand('codecaptions.clearHistory', () => {
      timeline.clear();
      historyView.refresh();
      statusBar.text = '$(comment-discussion) CC: Ready';
      outputChannel.appendLine('[Extension] History cleared.');
    }),
  );

  // Open settings
  context.subscriptions.push(
    vscode.commands.registerCommand('codecaptions.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'codecaptions');
    }),
  );

  // CC quick pick menu
  context.subscriptions.push(
    vscode.commands.registerCommand('codecaptions.cc', async () => {
      const enabled = config.get<boolean>('enabled', true);

      const items: vscode.QuickPickItem[] = [
        {
          label: enabled
            ? '$(check) Live Captions: ON'
            : '$(circle-slash) Live Captions: OFF',
          description: enabled ? 'Click to pause' : 'Click to resume',
        },
        {
          label: '$(history) Caption History',
          description: 'Open sidebar panel',
        },
        {
          label: '$(settings-gear) Settings',
          description: 'Open CodeCaptions settings',
        },
        {
          label: '$(trash) Clear History',
          description: 'Remove all caption entries',
        },
      ];

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'CodeCaptions',
        title: '🎬 CodeCaptions',
      });

      if (!selection) return;

      if (selection.label.includes('Live Captions')) {
        vscode.commands.executeCommand('codecaptions.toggle');
      } else if (selection.label.includes('Caption History')) {
        vscode.commands.executeCommand('codecaptions.showHistory');
      } else if (selection.label.includes('Settings')) {
        vscode.commands.executeCommand('codecaptions.openSettings');
      } else if (selection.label.includes('Clear History')) {
        vscode.commands.executeCommand('codecaptions.clearHistory');
      }
    }),
  );

  // ─── Config change listener ───
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('codecaptions')) {
        config = vscode.workspace.getConfiguration('codecaptions');
        summarizer.updateConfig(config);
        diffEngine.updateDebounceMs(config.get<number>('debounceMs', 1500));
        timeline.updateMaxItems(config.get<number>('maxHistoryItems', 50));

        const enabled = config.get<boolean>('enabled', true);
        diffEngine.setEnabled(enabled);
        historyView.setEnabled(enabled);

        outputChannel.appendLine('[Extension] Configuration refreshed.');
      }
    }),
  );

  // ─── Timeline update listener ───
  context.subscriptions.push(
    timeline.onUpdate.event(() => {
      historyView.refresh();
    }),
  );

  outputChannel.appendLine('[CodeCaptions] Activated successfully.');
}

export function deactivate() {
  if (autoHideTimer) clearTimeout(autoHideTimer);
}
