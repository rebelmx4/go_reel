import { BaseJsonManager } from './BaseJsonManager';

/**
 * History store - simple array of absolute paths
 * According to documentation (recent.json)
 */
export type HistoryStore = string[];

export class HistoryManager extends BaseJsonManager<HistoryStore> {
  constructor() {
    super('history.json', []);
  }

  /**
   * Add a path to history (at the beginning)
   * Limits to 100 items
   * @param filePath - Absolute path to video file
   */
  public addHistory(filePath: string): void {
    // Remove if already exists to avoid duplicates
    const filtered = this.data.filter((p) => p !== filePath);
    // Add to beginning and limit to 100
    const newItems = [filePath, ...filtered].slice(0, 100);
    this.data = newItems;
    this.save();
  }

  /**
   * Get all history items
   * @returns Array of file paths (most recent first)
   */
  public getHistory(): string[] {
    return this.data;
  }

  /**
   * Clear all history
   */
  public clearHistory(): void {
    this.data = [];
    this.save();
  }

  /**
   * Remove a specific path from history
   * @param filePath - Path to remove
   */
  public removeFromHistory(filePath: string): void {
    this.data = this.data.filter((p) => p !== filePath);
    this.save();
  }

  /**
   * Check if a path is in history
   * @param filePath - Path to check
   * @returns True if path is in history
   */
  public isInHistory(filePath: string): boolean {
    return this.data.includes(filePath);
  }
}
