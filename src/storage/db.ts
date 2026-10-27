import { ModulationMatrix } from '../rhythm/modmatrix';

export interface SavedRecipe {
  readonly id: string;
  readonly name: string;
  readonly matrix: ModulationMatrix;
  readonly voiceMap: Record<string, string>;
}

const DB_NAME = 'atomic-rhythm';
const STORE_NAME = 'recipes';
const DB_VERSION = 1;

// In-memory fallback if IndexedDB is not available or errors out
const memoryStore = new Map<string, SavedRecipe>();

function getIndexedDB(): IDBFactory | null {
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB !== null) {
      return indexedDB;
    }
  } catch {
    // Security restriction in some file:// or sandbox setups
  }
  return null;
}

function openDatabase(): Promise<IDBDatabase> {
  const idb = getIndexedDB();
  if (!idb) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecipe(recipe: SavedRecipe): Promise<void> {
  memoryStore.set(recipe.id, recipe);
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(recipe);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // In-memory fallback saved already
  }
}

export async function loadRecipes(): Promise<SavedRecipe[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as SavedRecipe[];
        // Merge with memory store
        for (const item of results) {
          memoryStore.set(item.id, item);
        }
        resolve(Array.from(memoryStore.values()));
      };
      req.onerror = () => resolve(Array.from(memoryStore.values()));
    });
  } catch {
    return Array.from(memoryStore.values());
  }
}

export async function deleteRecipe(id: string): Promise<void> {
  memoryStore.delete(id);
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // In-memory fallback deleted
  }
}

export async function clearRecipesForTesting(): Promise<void> {
  memoryStore.clear();
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // In-memory cleared
  }
}
