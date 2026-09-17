/**
 * Royal Fortress Archive & Save System for Dwarf Fortress
 * Allows instant local persistence, JSON world export/import, and multiple archive slots.
 */

import { FortressState, TaskIndex } from '../types/simulation';
import { buildTaskIndex } from './taskIndex';

export const SAVE_KEY_PRIMARY = 'df_fortress_royal_archive_v1';
export const SAVE_KEY_AUTO = 'df_fortress_autosave_v1';

export interface SaveMetadata {
  fortressName: string;
  year: number;
  season: string;
  dwarfCount: number;
  wealth: number;
  timestamp: number;
  version: string;
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Storage access may throw in restricted iframe / security contexts
  }
  return null;
}

/**
 * Serializes task index Maps to plain structures suitable for JSON serialization
 */
export function serializeTaskIndex(taskIndex?: TaskIndex): Record<string, any> | undefined {
  if (!taskIndex) return undefined;
  const result: Record<string, any> = {
    mining: taskIndex.mining instanceof Map ? Array.from(taskIndex.mining.entries()) : [],
    chopping: taskIndex.chopping instanceof Map ? Array.from(taskIndex.chopping.entries()) : [],
    building: taskIndex.building instanceof Map ? Array.from(taskIndex.building.entries()) : [],
    stockpiles: {
      stone: taskIndex.stockpiles?.stone instanceof Map ? Array.from(taskIndex.stockpiles.stone.entries()) : [],
      wood: taskIndex.stockpiles?.wood instanceof Map ? Array.from(taskIndex.stockpiles.wood.entries()) : [],
      food: taskIndex.stockpiles?.food instanceof Map ? Array.from(taskIndex.stockpiles.food.entries()) : [],
      ore: taskIndex.stockpiles?.ore instanceof Map ? Array.from(taskIndex.stockpiles.ore.entries()) : [],
    },
    beds: taskIndex.beds instanceof Map ? Array.from(taskIndex.beds.entries()) : [],
  };

  // Support any dynamic / custom task maps (e.g. gather)
  for (const key of Object.keys(taskIndex)) {
    if (key !== 'mining' && key !== 'chopping' && key !== 'building' && key !== 'stockpiles' && key !== 'beds') {
      const val = (taskIndex as any)[key];
      if (val instanceof Map) {
        result[key] = Array.from(val.entries());
      }
    }
  }

  return result;
}

/**
 * Reconstructs / hydrates taskIndex Maps from world tiles and any serialized entries.
 * Ensures that mining.values() and all other task index collections are valid iterables.
 */
export function hydrateFortressState(state: FortressState): FortressState {
  if (!state || !state.tiles) {
    return state;
  }

  // Reconstruct active task index directly from world tiles
  const taskIndex = buildTaskIndex(state.tiles);

  // If state had a serialized taskIndex with entries, merge any valid entries
  if (state.taskIndex) {
    const raw = state.taskIndex as Record<string, any>;
    const hydrateMap = (rawVal: any, targetMap: Map<string, any>) => {
      if (rawVal instanceof Map) {
        for (const [k, v] of rawVal.entries()) {
          targetMap.set(k, v);
        }
      } else if (Array.isArray(rawVal)) {
        for (const item of rawVal) {
          if (Array.isArray(item) && item.length === 2) {
            targetMap.set(item[0], item[1]);
          }
        }
      } else if (rawVal && typeof rawVal === 'object') {
        for (const [k, v] of Object.entries(rawVal)) {
          if (v && typeof v === 'object' && 'x' in v && 'y' in v && 'z' in v) {
            targetMap.set(k, v);
          }
        }
      }
    };

    hydrateMap(raw.mining, taskIndex.mining);
    hydrateMap(raw.chopping, taskIndex.chopping);
    hydrateMap(raw.building, taskIndex.building);
    if (raw.stockpiles) {
      hydrateMap(raw.stockpiles.stone, taskIndex.stockpiles.stone);
      hydrateMap(raw.stockpiles.wood, taskIndex.stockpiles.wood);
      hydrateMap(raw.stockpiles.food, taskIndex.stockpiles.food);
      hydrateMap(raw.stockpiles.ore, taskIndex.stockpiles.ore);
    }
    hydrateMap(raw.beds, taskIndex.beds);

    // Merge any additional custom task maps (e.g. gather)
    for (const key of Object.keys(raw)) {
      if (key !== 'mining' && key !== 'chopping' && key !== 'building' && key !== 'stockpiles' && key !== 'beds') {
        const rawProp = raw[key];
        if (rawProp instanceof Map) {
          (taskIndex as any)[key] = rawProp;
        } else if (Array.isArray(rawProp)) {
          (taskIndex as any)[key] = new Map(rawProp);
        } else if (rawProp && typeof rawProp === 'object') {
          (taskIndex as any)[key] = new Map(Object.entries(rawProp));
        } else if (!(key in taskIndex)) {
          (taskIndex as any)[key] = new Map();
        }
      }
    }
  }

  return {
    ...state,
    taskIndex,
  };
}

/**
 * Prepares FortressState for serialization, converting taskIndex Maps to JSON-safe structures.
 */
export function serializeFortressState(state: FortressState): any {
  return {
    ...state,
    taskIndex: serializeTaskIndex(state.taskIndex || (state.tiles ? buildTaskIndex(state.tiles) : undefined)),
  };
}

/**
 * Save fortress state directly to browser LocalStorage
 */
export function saveFortressToStorage(state: FortressState, slotKey = SAVE_KEY_PRIMARY): boolean {
  try {
    const storage = getStorage();
    if (!storage) {
      console.warn('localStorage is not available');
      return false;
    }
    const payload = {
      version: '1.2',
      timestamp: Date.now(),
      state: serializeFortressState(state),
    };
    const serialized = JSON.stringify(payload);
    storage.setItem(slotKey, serialized);
    return true;
  } catch (err) {
    console.error('Failed to save fortress to localStorage:', err);
    return false;
  }
}

/**
 * Load fortress state from LocalStorage and rehydrate taskIndex Maps
 */
export function loadFortressFromStorage(slotKey = SAVE_KEY_PRIMARY): FortressState | null {
  try {
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(slotKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.state && parsed.state.tiles) {
      return hydrateFortressState(parsed.state as FortressState);
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
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(slotKey);
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
      state: serializeFortressState(state),
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
 * Parse an imported JSON string and validate the FortressState schema,
 * rehydrating taskIndex Maps.
 */
export function parseFortressSaveJson(jsonString: string): FortressState {
  const parsed = JSON.parse(jsonString);
  const state: FortressState = parsed.state || parsed;
  if (!state.tiles || !Array.isArray(state.tiles) || !state.dwarves) {
    throw new Error('Invalid fortress save format: missing required world layers or dwarves');
  }
  return hydrateFortressState(state);
}
