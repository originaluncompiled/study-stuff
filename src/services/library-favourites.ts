import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeRelativePath, validateFolderId } from '@/lib/paths';

const FAVOURITES_KEY_PREFIX = 'studystuff:library-favourites:';

export async function readFavouritePaths(folderId: string): Promise<Set<string>> {
  const value = await AsyncStorage.getItem(storageKey(folderId));
  if (!value) {
    return new Set();
  }

  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every(isFavouritePath)) {
    throw new Error('The saved favourites are invalid.');
  }
  return new Set(parsed);
}

export async function writeFavouritePaths(
  folderId: string,
  paths: ReadonlySet<string>,
): Promise<void> {
  const values = Array.from(paths);
  if (!values.every(isFavouritePath)) {
    throw new Error('The favourites contain an invalid path.');
  }
  await AsyncStorage.setItem(storageKey(folderId), JSON.stringify(values.sort()));
}

export function remapFavouritePaths(
  paths: ReadonlySet<string>,
  oldPath: string,
  newPath: string,
): Set<string> {
  const oldPrefix = `${oldPath}/`;
  return new Set(
    Array.from(paths, (path) =>
      path === oldPath || path.startsWith(oldPrefix) ? `${newPath}${path.slice(oldPath.length)}` : path,
    ),
  );
}

export function removeFavouritePaths(
  paths: ReadonlySet<string>,
  removedPath: string,
): Set<string> {
  const removedPrefix = `${removedPath}/`;
  return new Set(
    Array.from(paths).filter(
      (path) => path !== removedPath && !path.startsWith(removedPrefix),
    ),
  );
}

function storageKey(folderId: string): string {
  return `${FAVOURITES_KEY_PREFIX}${validateFolderId(folderId)}`;
}

function isFavouritePath(value: unknown): value is string {
  if (typeof value !== 'string' || !value) {
    return false;
  }
  try {
    return normalizeRelativePath(value) === value;
  } catch {
    return false;
  }
}
