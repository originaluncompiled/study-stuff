import type { LibraryEntry } from '@/types/library';

export function compareLibraryEntries(left: LibraryEntry, right: LibraryEntry): number {
  const leftIsDirectory = left.kind === 'directory';
  const rightIsDirectory = right.kind === 'directory';
  if (leftIsDirectory !== rightIsDirectory) {
    return leftIsDirectory ? -1 : 1;
  }
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
}

export function orderLibraryEntries(
  entries: LibraryEntry[],
  favouritePaths: ReadonlySet<string>,
): LibraryEntry[] {
  return [...entries].sort((left, right) => {
    const favouriteDifference =
      Number(favouritePaths.has(right.relativePath)) -
      Number(favouritePaths.has(left.relativePath));
    return favouriteDifference || compareLibraryEntries(left, right);
  });
}
