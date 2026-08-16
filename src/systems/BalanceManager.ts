import { BALANCE, BalanceData, CoreBalance, FormBalance, PrefixBalance, SuffixBalance } from '../config/balance';
export class BalanceManager {
  private static data: BalanceData = JSON.parse(JSON.stringify(BALANCE));
  private static listeners: Array<() => void> = [];
  private static version: number = 0;
  static get(): Readonly<BalanceData> { return this.data; }
  static core(id: string): CoreBalance { return this.data.cores[id] || this.data.cores.FIRE; }
  static form(id: string): FormBalance { return this.data.forms[id] || this.data.forms.BLADE; }
  static prefix(id: string): PrefixBalance { return this.data.prefixes[id]; }
  static suffix(id: string): SuffixBalance { return this.data.suffixes[id]; }
  static val(path: string): number { const parts = path.split('.'); let current: any = this.data; for (const part of parts) { if (current === undefined || current === null) return 0; current = current[part]; } return typeof current === 'number' ? current : 0; }
  static reload(newData: BalanceData): void { this.data = JSON.parse(JSON.stringify(newData)); this.version++; this.notifyListeners(); }
  static patch(path: string, value: number): void { const parts = path.split('.'); let current: any = this.data; for (let i = 0; i < parts.length - 1; i++) { if (current[parts[i]] === undefined) return; current = current[parts[i]]; } current[parts[parts.length - 1]] = value; this.version++; this.notifyListeners(); }
  static reset(): void { this.data = JSON.parse(JSON.stringify(BALANCE)); this.version++; this.notifyListeners(); }
  static onChange(callback: () => void): void { this.listeners.push(callback); }
  static offChange(callback: () => void): void { this.listeners = this.listeners.filter(l => l !== callback); }
  static getVersion(): number { return this.version; }
  static exportJSON(): string { return JSON.stringify(this.data, null, 2); }
  static importJSON(json: string): boolean { try { const parsed = JSON.parse(json) as BalanceData; if (parsed.player && parsed.cores && parsed.forms) { this.reload(parsed); return true; } return false; } catch (e) { return false; } }
  private static notifyListeners(): void { for (const listener of this.listeners) { try { listener(); } catch (e) { console.error('[BalanceManager] Listener error:', e); } } }
}
if (typeof window !== 'undefined') { (window as any).BalanceManager = BalanceManager; }
