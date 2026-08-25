import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import { defaultFolderColor, isFolderColor } from '@/constants/theme';
import { orderFolders } from '@/lib/folder-order';
import { MAX_ITEM_NAME_LENGTH, ensureUniqueName, validateItemName } from '@/lib/names';
import {
  cleanStagingDirectory,
  createFolderDirectory,
  deleteFolderDirectory,
  ensureLibraryStorage,
  getFolderDirectory,
  importPickedDirectory,
  readFolderMetadataFromDisk,
  reconcileTrash,
  restoreStagedFolder,
  stageFolderDeletion,
  finalizeStagedFolderDeletion,
  writeFolderMetadata,
} from '@/services/library-files';
import { readManifest, writeManifest } from '@/services/library-manifest';
import type { FolderColor, ImportProgress, StudyFolder } from '@/types/library';

type LibraryStore = {
  folders: StudyFolder[];
  hydrated: boolean;
  hydrationError: string | null;
  hydrate: () => Promise<void>;
  createFolder: (name: string) => Promise<StudyFolder>;
  importFolder: (onProgress: (progress: ImportProgress) => void) => Promise<StudyFolder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  setFolderColor: (id: string, color: FolderColor) => Promise<void>;
  reorderFolders: (orderedIds: string[]) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  touchFolder: (id: string) => Promise<void>;
};

let hydrationPromise: Promise<void> | null = null;
let mutationQueue: Promise<void> = Promise.resolve();

function serializeMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  folders: [],
  hydrated: false,
  hydrationError: null,

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    if (hydrationPromise) {
      return hydrationPromise;
    }

    hydrationPromise = (async () => {
      try {
        ensureLibraryStorage();
        cleanStagingDirectory();
        const manifest = await readManifest();
        const manifestFolders = manifest.folders;
        reconcileTrash(manifestFolders, manifest.reliable);
        const diskFolders = await readFolderMetadataFromDisk();
        const diskById = new Map(diskFolders.map((folder) => [folder.id, folder]));
        const ordered = manifestFolders.flatMap((folder) => {
          const diskFolder = diskById.get(folder.id);
          if (!diskFolder || !getFolderDirectory(folder.id).exists) {
            return [];
          }
          diskById.delete(folder.id);
          return [diskFolder];
        });
        const recovered = Array.from(diskById.values()).sort((left, right) =>
          left.createdAt.localeCompare(right.createdAt),
        );
        const folders = [...ordered, ...recovered];
        await writeManifest(folders);
        set({ folders, hydrated: true, hydrationError: null });
      } catch (error) {
        set({
          folders: [],
          hydrated: true,
          hydrationError: error instanceof Error ? error.message : 'Could not load the library.',
        });
      } finally {
        hydrationPromise = null;
      }
    })();

    return hydrationPromise;
  },

  createFolder: (value) => serializeMutation(async () => {
    const folders = get().folders;
    const name = ensureUniqueName(validateItemName(value), folders.map((folder) => folder.name));
    const now = new Date().toISOString();
    const folder: StudyFolder = {
      color: defaultFolderColor,
      id: randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
    };

    createFolderDirectory(folder.id);
    try {
      writeFolderMetadata(folder);
      const next = [...folders, folder];
      await writeManifest(next);
      set({ folders: next });
      return folder;
    } catch (error) {
      deleteFolderDirectory(folder.id);
      throw error;
    }
  }),

  importFolder: (onProgress) => serializeMutation(async () => {
    const folders = get().folders;
    const id = randomUUID();
    const imported = await importPickedDirectory(id, onProgress, (suggestedName) => {
      const name = uniqueImportedName(suggestedName, folders.map((folder) => folder.name));
      const now = new Date().toISOString();
      return { color: defaultFolderColor, id, name, createdAt: now, updatedAt: now };
    });
    const folder = imported.folder;

    try {
      const next = [...folders, folder];
      await writeManifest(next);
      set({ folders: next });
      return folder;
    } catch (error) {
      deleteFolderDirectory(id);
      throw error;
    }
  }),

  renameFolder: (id, value) => serializeMutation(async () => {
    const folders = get().folders;
    const current = folders.find((folder) => folder.id === id);
    if (!current) {
      throw new Error('That folder no longer exists.');
    }
    const name = ensureUniqueName(
      validateItemName(value),
      folders.map((folder) => folder.name),
      current.name,
    );
    const updated = { ...current, name, updatedAt: new Date().toISOString() };
    const next = folders.map((folder) => (folder.id === id ? updated : folder));

    writeFolderMetadata(updated);
    try {
      await writeManifest(next);
      set({ folders: next });
    } catch (error) {
      writeFolderMetadata(current);
      throw error;
    }
  }),

  setFolderColor: (id, color) => serializeMutation(async () => {
    if (!isFolderColor(color)) {
      throw new Error('Choose a supported folder colour.');
    }
    const folders = get().folders;
    const current = folders.find((folder) => folder.id === id);
    if (!current) {
      throw new Error('That folder no longer exists.');
    }
    if (current.color === color) {
      return;
    }
    const updated = { ...current, color, updatedAt: new Date().toISOString() };
    const next = folders.map((folder) => (folder.id === id ? updated : folder));

    writeFolderMetadata(updated);
    try {
      await writeManifest(next);
      set({ folders: next });
    } catch (error) {
      writeFolderMetadata(current);
      throw error;
    }
  }),

  reorderFolders: (orderedIds) => serializeMutation(async () => {
    const folders = get().folders;
    const next = orderFolders(folders, orderedIds);
    if (next === folders) {
      return;
    }
    set({ folders: next });
    try {
      await writeManifest(next);
    } catch (error) {
      set({ folders });
      throw error;
    }
  }),

  deleteFolder: (id) => serializeMutation(async () => {
    const folders = get().folders;
    const next = folders.filter((folder) => folder.id !== id);
    if (next.length === folders.length) {
      return;
    }

    stageFolderDeletion(id);
    try {
      await writeManifest(next);
      set({ folders: next });
      try {
        finalizeStagedFolderDeletion(id);
      } catch {
        // The committed deletion is cleaned from trash during the next hydration.
      }
    } catch (error) {
      restoreStagedFolder(id);
      throw error;
    }
  }),

  touchFolder: (id) => serializeMutation(async () => {
    const folders = get().folders;
    const current = folders.find((folder) => folder.id === id);
    if (!current) {
      return;
    }
    const updated = { ...current, updatedAt: new Date().toISOString() };
    const next = folders.map((folder) => (folder.id === id ? updated : folder));
    writeFolderMetadata(updated);
    await writeManifest(next);
    set({ folders: next });
  }),
}));

function uniqueImportedName(preferredName: string, existingNames: Iterable<string>): string {
  const base = validateItemName(preferredName);
  const existing = new Set(Array.from(existingNames, (name) => name.toLocaleLowerCase()));
  if (!existing.has(base.toLocaleLowerCase())) {
    return base;
  }

  let index = 2;
  let suffix = ` (${index})`;
  let candidate = `${base.slice(0, MAX_ITEM_NAME_LENGTH - suffix.length)}${suffix}`;
  while (existing.has(candidate.toLocaleLowerCase())) {
    index += 1;
    suffix = ` (${index})`;
    candidate = `${base.slice(0, MAX_ITEM_NAME_LENGTH - suffix.length)}${suffix}`;
  }
  return candidate;
}
