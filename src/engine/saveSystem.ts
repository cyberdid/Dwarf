/**
 * Royal Fortress Archive & Save System for Dwarf Fortress
 * Allows instant local persistence, JSON world export/import, and multiple archive slots.
 */

import { FortressState } from '../types/simulation';

const SAVE_KEY_PRIMARY = 'df_fortress_royal_archive_v1';
const SAVE_KEY_AUTO = 'df_fortress_autosave_v1';

export interface SaveMetadata {
  fortressName: string;
  year: number;
  season: string;
  dwarfCount: number;
  wealth: number;
  timestamp: number;
  version: string;
}

/**
 * Save fortress state directly to browser LocalStorage
 */
export function saveFortressToStorage(state: FortressState, slotKey = SAVE_KEY_PRIMARY): boolean {
  try {
    const payload = {
      version: '1.2',
      timestamp: Date.now(),
      state,
    };
    const serialized = JSON.stringify(payload);
    localStorage.setItem(slotKey, serialized);
    return true;
  } catch (err) {
    console.error('Failed to save fortress to localStorage:', err);
    return false;
  }
}

/**
 * Load fortress state from LocalStorage
 */
export function loadFortressFromStorage(slotKey = SAVE_KEY_PRIMARY): FortressState | null {
  try {
    const raw = localStorage.getItem(slotKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.state && parsed.state.tiles) {
      return parsed.state as FortressState;
    }
    return null;
  } catch (err) {
    console.error('Failed to load fortress from localStorage:', err);
    return null;
  }
}

/**
 * Check if a saved fortress exists and read its metadata
 */
export function getSavedFortressMetadata(slotKey = SAVE_KEY_PRIMARY): SaveMetadata | null {
  try {
    const raw = localStorage.getItem(slotKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.state) return null;
    const st: FortressState = parsed.state;
    return {
      fortressName: (st as unknown as { fortressName?: string }).fortressName || 'Mountainhome',
      year: st.year || 105,
      season: st.season || 'Spring',
      dwarfCount: st.dwarves?.length || 0,
      wealth: st.wealth || 0,
      timestamp: parsed.timestamp || Date.now(),
      version: parsed.version || '1.0',
    };
  } catch {
    return null;
  }
}

/**
 * Trigger browser file download of fortress state as JSON
 */
export function exportFortressToJsonFile(state: FortressState): void {
  try {
    const payload = {
      app: 'Dwarf Fortress Web',
      version: '1.2',
      exportDate: new Date().toISOString(),
      state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fortressTitle = (state as unknown as { fortressName?: string }).fortressName || 'Mountainhome';
    const sanitizedName = fortressTitle.replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');
    const filename = `${sanitizedName}_Year${state.year}_${state.season}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export fortress file:', err);
  }
}

/**
 * Parse an imported JSON string and validate the FortressState schema
 */
export function parseFortressSaveJson(jsonString: string): FortressState {
  const parsed = JSON.parse(jsonString);
  const state: FortressState = parsed.state || parsed;
  if (!state.tiles || !Array.isArray(state.tiles) || !state.dwarves) {
    throw new Error('Invalid fortress save format: missing required world layers or dwarves');
  }
  return state;
}
