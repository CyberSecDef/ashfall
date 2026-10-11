// Save and continue. One small JSON record in localStorage. Every access is
// guarded: private browsing, blocked storage or a corrupt record just means
// starting fresh, never a crash.

export interface SaveData {
  version: 1;
  level: string;
  /** Index into the level's checkpoint list, or -1 for the level's spawn. */
  checkpoint: number;
  /** Collected memories as "L01:rabbit" ids. */
  memories: string[];
}

export const SAVE_KEY = 'ashfall.save.v1';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export class SaveGame {
  data: SaveData | null;

  constructor(private readonly store: KeyValueStore | null = defaultStore()) {
    this.data = this.read();
  }

  private read(): SaveData | null {
    try {
      const raw = this.store?.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as Partial<SaveData>;
      if (d.version !== 1 || typeof d.level !== 'string' || typeof d.checkpoint !== 'number' || !Array.isArray(d.memories)) return null;
      return { version: 1, level: d.level, checkpoint: d.checkpoint, memories: d.memories.filter((m) => typeof m === 'string') };
    } catch {
      return null;
    }
  }

  private write(): void {
    try {
      if (this.data) this.store?.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Quota or blocked storage: keep playing; progress just won't persist.
    }
  }

  get memories(): readonly string[] {
    return this.data?.memories ?? [];
  }

  /** Record reaching a level/checkpoint. Never moves progress backwards within a level. */
  reach(level: string, checkpoint: number): void {
    const memories = this.data?.memories ?? [];
    if (this.data && this.data.level === level && checkpoint <= this.data.checkpoint) return;
    this.data = { version: 1, level, checkpoint, memories };
    this.write();
  }

  collect(memoryId: string, level: string): void {
    if (!this.data) this.data = { version: 1, level, checkpoint: -1, memories: [] };
    if (!this.data.memories.includes(memoryId)) {
      this.data.memories.push(memoryId);
      this.write();
    }
  }

  hasMemory(memoryId: string): boolean {
    return this.memories.includes(memoryId);
  }

  reset(): void {
    this.data = null;
    try {
      this.store?.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
  }
}
