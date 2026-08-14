// src/systems/BalanceManager.ts
//
// ═══════════════════════════════════════════════════════════════════════════
//  BALANCE MANAGER
//
//  Provides runtime access to balance data.
//  Supports hot-reload in development builds.
//
//  Usage:
//    const bal = BalanceManager.get();
//    const fireDmg = bal.cores.FIRE.baseDamage;
//
//  Hot reload:
//    BalanceManager.reload(newData);     // replace all balance data
//    BalanceManager.patch('cores.FIRE.baseDamage', 30);  // patch a single value
// ═══════════════════════════════════════════════════════════════════════════

import { BALANCE, BalanceData, CoreBalance, FormBalance, PrefixBalance, SuffixBalance } from '../config/balance';

export class BalanceManager {
  private static data: BalanceData = JSON.parse(JSON.stringify(BALANCE));
  private static listeners: Array<() => void> = [];
  private static version: number = 0;

  /**
   * Get the current balance data. Read-only reference.
   */
  static get(): Readonly<BalanceData> {
    return this.data;
  }

  /**
   * Get a core's balance data by ID.
   */
  static core(id: string): CoreBalance {
    return this.data.cores[id] || this.data.cores.FIRE;
  }

  /**
   * Get a form's balance data by ID.
   */
  static form(id: string): FormBalance {
    return this.data.forms[id] || this.data.forms.BLADE;
  }

  /**
   * Get a prefix's balance data by ID.
   */
  static prefix(id: string): PrefixBalance {
    return this.data.prefixes[id];
  }

  /**
   * Get a suffix's balance data by ID.
   */
  static suffix(id: string): SuffixBalance {
    return this.data.suffixes[id];
  }

  /**
   * Get a specific value from balance data using dot notation.
   * Example: BalanceManager.val('cores.FIRE.baseDamage')
   */
  static val(path: string): number {
    const parts = path.split('.');
    let current: any = this.data;
    for (const part of parts) {
      if (current === undefined || current === null) return 0;
      current = current[part];
    }
    return typeof current === 'number' ? current : 0;
  }

  /**
   * Reload all balance data. Used for hot-reload in dev builds.
   */
  static reload(newData: BalanceData): void {
    this.data = JSON.parse(JSON.stringify(newData));
    this.version++;
    this.notifyListeners();
    console.log(`[BalanceManager] Reloaded balance data (v${this.version})`);
  }

  /**
   * Patch a single value using dot notation.
   * Example: BalanceManager.patch('cores.FIRE.baseDamage', 30)
   */
  static patch(path: string, value: number): void {
    const parts = path.split('.');
    let current: any = this.data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) {
        console.warn(`[BalanceManager] Invalid path: ${path}`);
        return;
      }
      current = current[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = value;
    this.version++;
    this.notifyListeners();
    console.log(`[BalanceManager] Patched ${path}: ${oldValue} → ${value} (v${this.version})`);
  }

  /**
   * Reset to default balance data.
   */
  static reset(): void {
    this.data = JSON.parse(JSON.stringify(BALANCE));
    this.version++;
    this.notifyListeners();
    console.log(`[BalanceManager] Reset to defaults (v${this.version})`);
  }

  /**
   * Register a listener that fires when balance data changes.
   */
  static onChange(callback: () => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener.
   */
  static offChange(callback: () => void): void {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Get the current version number (increments on every change).
   */
  static getVersion(): number {
    return this.version;
  }

  /**
   * Export current balance data as JSON string (for saving/sharing configs).
   */
  static exportJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import balance data from JSON string.
   */
  static importJSON(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as BalanceData;
      if (parsed.player && parsed.cores && parsed.forms) {
        this.reload(parsed);
        return true;
      }
      console.warn('[BalanceManager] Invalid balance data structure');
      return false;
    } catch (e) {
      console.error('[BalanceManager] Failed to parse JSON:', e);
      return false;
    }
  }

  private static notifyListeners(): void {
    for (const listener of this.listeners) {
      try { listener(); } catch (e) { console.error('[BalanceManager] Listener error:', e); }
    }
  }
}

// Expose to browser console for dev
if (typeof window !== 'undefined') {
  (window as any).BalanceManager = BalanceManager;
}