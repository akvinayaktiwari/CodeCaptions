import * as vscode from 'vscode';

export interface CaptionEntry {
  id: string;
  timestamp: Date;
  caption: string;
  filename: string;
}

const STORAGE_KEY = 'codecaptions.history';

export class Timeline implements vscode.Disposable {
  private entries: CaptionEntry[] = [];
  private maxItems: number;

  readonly onUpdate = new vscode.EventEmitter<CaptionEntry[]>();

  constructor(
    private readonly context: vscode.ExtensionContext,
  ) {
    const config = vscode.workspace.getConfiguration('codecaptions');
    this.maxItems = config.get<number>('maxHistoryItems', 50);
    this.restoreFromState();
  }

  private restoreFromState() {
    try {
      const stored = this.context.workspaceState.get<CaptionEntry[]>(STORAGE_KEY, []);
      // Re-hydrate Date objects from stored strings
      this.entries = stored.map((e) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));
    } catch {
      this.entries = [];
    }
  }

  private persist() {
    this.context.workspaceState.update(STORAGE_KEY, this.entries).then(
      undefined,
      () => { /* silently ignore persistence errors */ }
    );
  }

  add(caption: string, filename: string): CaptionEntry {
    const entry: CaptionEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
      caption,
      filename,
    };

    this.entries.unshift(entry);

    // Cap to max
    if (this.entries.length > this.maxItems) {
      this.entries = this.entries.slice(0, this.maxItems);
    }

    this.persist();
    this.onUpdate.fire([...this.entries]);
    return entry;
  }

  getAll(): CaptionEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.persist();
    this.onUpdate.fire([]);
  }

  updateMaxItems(max: number) {
    this.maxItems = max;
    if (this.entries.length > max) {
      this.entries = this.entries.slice(0, max);
      this.persist();
      this.onUpdate.fire([...this.entries]);
    }
  }

  dispose() {
    this.onUpdate.dispose();
  }
}
