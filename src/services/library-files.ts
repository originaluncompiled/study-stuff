import { randomUUID } from 'expo-crypto';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { isStudyFolderRecord } from '@/lib/folder-record';
import { compareLibraryEntries } from '@/lib/library-entry-order';
import {
  ensureUniqueName,
  getAvailableFileName,
  inferPickedFolderName,
  normalizePdfName,
  sanitizeStorageName,
  validateItemName,
} from '@/lib/names';
import { joinRelativePath, relativePathSegments, validateFolderId } from '@/lib/paths';
import type { ImportProgress, LibraryEntry, StudyFolder } from '@/types/library';

const ROOT_DIRECTORY_NAME = 'StudyStuff';
const FOLDERS_DIRECTORY_NAME = 'folders';
const STAGING_DIRECTORY_NAME = '.staging';
const TRASH_DIRECTORY_NAME = '.trash';
const METADATA_FILE_NAME = '.studystuff-folder.json';
const METADATA_TEMP_FILE_NAME = '.studystuff-folder.json.tmp';

function rootDirectory() {
  return new Directory(Paths.document, ROOT_DIRECTORY_NAME);
}

function foldersDirectory() {
  return new Directory(rootDirectory(), FOLDERS_DIRECTORY_NAME);
}

function stagingDirectory() {
  return new Directory(rootDirectory(), STAGING_DIRECTORY_NAME);
}

function trashDirectory() {
  return new Directory(rootDirectory(), TRASH_DIRECTORY_NAME);
}

export function getFolderDirectory(folderId: string): Directory {
  return new Directory(foldersDirectory(), validateFolderId(folderId));
}

export function getDirectory(folderId: string, relativePath?: string): Directory {
  return new Directory(getFolderDirectory(folderId), ...relativePathSegments(relativePath));
}

export function getPdfFile(folderId: string, relativePath: string): File {
  return new File(getFolderDirectory(folderId), ...relativePathSegments(relativePath));
}

export function ensureLibraryStorage(): void {
  rootDirectory().create({ idempotent: true, intermediates: true });
  foldersDirectory().create({ idempotent: true, intermediates: true });
  stagingDirectory().create({ idempotent: true, intermediates: true });
  trashDirectory().create({ idempotent: true, intermediates: true });
}

export function cleanStagingDirectory(): void {
  ensureLibraryStorage();
  for (const entry of stagingDirectory().list()) {
    entry.delete();
  }
}

export function createFolderDirectory(folderId: string): Directory {
  ensureLibraryStorage();
  const directory = getFolderDirectory(folderId);
  directory.create();
  return directory;
}

export function deleteFolderDirectory(folderId: string): void {
  const directory = getFolderDirectory(folderId);
  if (directory.exists) {
    directory.delete();
  }
}

export function writeFolderMetadata(folder: StudyFolder): void {
  writeMetadataToDirectory(getFolderDirectory(folder.id), folder);
}

function writeMetadataToDirectory(directory: Directory, folder: StudyFolder): void {
  const temporary = new File(directory, METADATA_TEMP_FILE_NAME);
  const metadata = new File(directory, METADATA_FILE_NAME);
  if (temporary.exists) {
    temporary.delete();
  }
  temporary.create();
  temporary.write(JSON.stringify(folder));
  temporary.moveSync(metadata, { overwrite: true });
}

export async function readFolderMetadataFromDisk(): Promise<StudyFolder[]> {
  ensureLibraryStorage();
  const folders: StudyFolder[] = [];

  for (const entry of foldersDirectory().list()) {
    if (!(entry instanceof Directory)) {
      continue;
    }
    const metadata = new File(entry, METADATA_FILE_NAME);
    const temporary = new File(entry, METADATA_TEMP_FILE_NAME);
    for (const candidate of [metadata, temporary]) {
      if (!candidate.exists) {
        continue;
      }
      try {
        const parsed: unknown = JSON.parse(await candidate.text());
        if (isStudyFolderRecord(parsed, entry.name)) {
          if (candidate.uri === temporary.uri && !metadata.exists) {
            temporary.moveSync(metadata);
          }
          folders.push(parsed);
          break;
        }
      } catch {
        // Try the other metadata copy before leaving the folder untouched.
      }
    }
  }

  return folders;
}

export function listDirectory(folderId: string, relativePath?: string): LibraryEntry[] {
  const directory = getDirectory(folderId, relativePath);
  if (!directory.exists) {
    throw new Error('This folder no longer exists.');
  }

  return directory
    .list()
    .flatMap<LibraryEntry>((entry) => {
      if (!relativePath && [METADATA_FILE_NAME, METADATA_TEMP_FILE_NAME].includes(entry.name)) {
        return [];
      }
      if (entry instanceof Directory) {
        return [
          {
            childCount: countDirectItems(entry),
            kind: 'directory',
            name: entry.name,
            relativePath: joinRelativePath(relativePath ?? '', entry.name),
            size: null,
          },
        ];
      }
      if (!isPdf(entry)) {
        return [];
      }
      return [
        {
          childCount: null,
          kind: 'pdf',
          name: entry.name,
          relativePath: joinRelativePath(relativePath ?? '', entry.name),
          size: entry.size,
        },
      ];
    })
    .sort(compareLibraryEntries);
}

export function createSubfolder(folderId: string, relativePath: string | undefined, value: string): void {
  withFolderLock(folderId, () => {
    const parent = getDirectory(folderId, relativePath);
    if (!parent.exists) {
      throw new Error('This folder no longer exists.');
    }
    const name = ensureUniqueName(
      validateItemName(value),
      parent.list().map((entry) => entry.name),
    );
    if (!relativePath && [METADATA_FILE_NAME, METADATA_TEMP_FILE_NAME].includes(name)) {
      throw new Error('That name is reserved by StudyStuff.');
    }
    new Directory(parent, name).create();
  });
}

function countDirectItems(directory: Directory): number | null {
  try {
    return directory
      .list()
      .filter((entry) => entry instanceof Directory || isPdf(entry)).length;
  } catch {
    return null;
  }
}

export async function pickAndCopyPdfs(
  folderId: string,
  relativePath?: string,
): Promise<number> {
  lockFolder(folderId);
  try {
    return await pickAndCopyPdfsUnlocked(folderId, relativePath);
  } finally {
    unlockFolder(folderId);
  }
}

async function pickAndCopyPdfsUnlocked(
  folderId: string,
  relativePath?: string,
): Promise<number> {
  const result = await File.pickFileAsync({
    multipleFiles: true,
    mimeTypes: ['application/pdf'],
  });
  if (result.canceled || !result.result) {
    return 0;
  }

  const destination = getDirectory(folderId, relativePath);
  const existingNames = new Set(destination.list().map((entry) => entry.name));
  const batch = new Directory(stagingDirectory(), randomUUID());
  batch.create();
  let copied = 0;
  const committed: File[] = [];

  try {
    for (const source of result.result) {
      if (!isPdf(source)) {
        continue;
      }
      const safeName = pdfStorageName(source, `Document ${copied + 1}.pdf`);
      const name = getAvailableFileName(safeName, existingNames);
      await source.copy(new File(batch, name));
      existingNames.add(name);
    }

    for (const staged of batch.list()) {
      if (staged instanceof File) {
        await staged.move(new File(destination, staged.name));
        committed.push(new File(destination, staged.name));
        copied += 1;
      }
    }
    return copied;
  } catch (error) {
    for (const file of committed) {
      if (file.exists) {
        file.delete();
      }
    }
    throw error;
  } finally {
    if (batch.exists) {
      batch.delete();
    }
  }
}

export async function importPickedPdfDirectory(
  folderId: string,
  onProgress: (progress: ImportProgress) => void,
  createMetadata: (suggestedName: string) => StudyFolder,
): Promise<{ folder: StudyFolder; pdfCount: number }> {
  if (Platform.OS !== 'android') {
    throw new Error('Whole-folder import is currently available on Android only.');
  }

  ensureLibraryStorage();
  const source = await Directory.pickDirectoryAsync();
  const staging = new Directory(stagingDirectory(), validateFolderId(folderId));
  staging.create();

  const progress: ImportProgress = { copiedPdfs: 0, currentName: '' };
  try {
    await copyPdfTree(source, staging, progress, onProgress, new Set(), 0);
    if (progress.copiedPdfs === 0) {
      throw new Error('No PDF files were found in that folder.');
    }

    const folder = createMetadata(inferPickedFolderName(source.name));
    writeMetadataToDirectory(staging, folder);
    await staging.move(getFolderDirectory(folderId));
    return {
      folder,
      pdfCount: progress.copiedPdfs,
    };
  } catch (error) {
    if (staging.exists) {
      staging.delete();
    }
    throw error;
  }
}

async function copyPdfTree(
  source: Directory,
  destination: Directory,
  progress: ImportProgress,
  onProgress: (progress: ImportProgress) => void,
  visited: Set<string>,
  depth: number,
): Promise<number> {
  if (visited.has(source.uri)) {
    throw new Error('The selected folder contains a directory cycle.');
  }
  visited.add(source.uri);

  let copiedHere = 0;
  const destinationNames = new Set(destination.list().map((entry) => entry.name));

  for (const entry of source.list()) {
    if (entry instanceof Directory) {
      let preferredName = sanitizeStorageName(entry.name, 'Folder');
      if (
        depth === 0 &&
        [METADATA_FILE_NAME, METADATA_TEMP_FILE_NAME].includes(preferredName)
      ) {
        preferredName = `${preferredName} folder`;
      }
      const name = getAvailableFileName(preferredName, destinationNames);
      const childDestination = new Directory(destination, name);
      childDestination.create();
      const childCount = await copyPdfTree(
        entry,
        childDestination,
        progress,
        onProgress,
        visited,
        depth + 1,
      );
      if (childCount === 0) {
        childDestination.delete();
      } else {
        destinationNames.add(name);
        copiedHere += childCount;
      }
      await yieldToUi();
      continue;
    }

    if (!isPdf(entry)) {
      continue;
    }
    const preferredName = pdfStorageName(entry, `Document ${progress.copiedPdfs + 1}.pdf`);
    const name = getAvailableFileName(preferredName, destinationNames);
    await entry.copy(new File(destination, name));
    destinationNames.add(name);
    copiedHere += 1;
    progress.copiedPdfs += 1;
    progress.currentName = name;
    onProgress({ ...progress });
  }

  return copiedHere;
}

function isPdf(file: File): boolean {
  try {
    if (
      file.type.toLocaleLowerCase().split(';')[0] === 'application/pdf' ||
      file.extension.toLocaleLowerCase() === '.pdf'
    ) {
      return true;
    }
  } catch {
    // Fall through to a minimal signature check for opaque provider URIs.
  }

  let handle: ReturnType<File['open']> | null = null;
  try {
    handle = file.open(FileMode.ReadOnly);
    const header = handle.readBytes(5);
    return (
      header[0] === 0x25 &&
      header[1] === 0x50 &&
      header[2] === 0x44 &&
      header[3] === 0x46 &&
      header[4] === 0x2d
    );
  } catch {
    return false;
  } finally {
    handle?.close();
  }
}

function pdfStorageName(file: File, fallback: string): string {
  const safeName = sanitizeStorageName(file.name, fallback);
  return safeName.toLocaleLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function renameEntry(
  folderId: string,
  relativePath: string,
  kind: LibraryEntry['kind'],
  newName: string,
): void {
  withFolderLock(folderId, () => {
    renameEntryUnlocked(folderId, relativePath, kind, newName);
  });
}

function renameEntryUnlocked(
  folderId: string,
  relativePath: string,
  kind: LibraryEntry['kind'],
  newName: string,
): void {
  const safeNewName = kind === 'pdf' ? normalizePdfName(newName) : validateItemName(newName);
  const segments = relativePathSegments(relativePath);
  const oldName = segments.pop();
  if (!oldName) {
    throw new Error('The library root cannot be renamed here.');
  }
  if (
    segments.length === 0 &&
    [METADATA_FILE_NAME, METADATA_TEMP_FILE_NAME].includes(safeNewName)
  ) {
    throw new Error('That name is reserved by StudyStuff.');
  }
  const parent = new Directory(getFolderDirectory(folderId), ...segments);
  const names = parent.list().map((entry) => entry.name);
  const duplicate = names.some(
    (name) => name.toLocaleLowerCase() === safeNewName.toLocaleLowerCase() && name !== oldName,
  );
  if (duplicate) {
    throw new Error(`“${safeNewName}” already exists here.`);
  }

  const entry =
    kind === 'directory'
      ? new Directory(parent, oldName)
      : new File(parent, oldName);
  entry.rename(safeNewName);
}

export function deleteEntry(
  folderId: string,
  relativePath: string,
  kind: LibraryEntry['kind'],
): void {
  withFolderLock(folderId, () => {
    deleteEntryUnlocked(folderId, relativePath, kind);
  });
}

function deleteEntryUnlocked(
  folderId: string,
  relativePath: string,
  kind: LibraryEntry['kind'],
): void {
  const segments = relativePathSegments(relativePath);
  if (segments.length === 0) {
    throw new Error('The library root cannot be deleted here.');
  }
  const entry =
    kind === 'directory'
      ? new Directory(getFolderDirectory(folderId), ...segments)
      : new File(getFolderDirectory(folderId), ...segments);
  entry.delete();
}

export function reconcileTrash(folders: StudyFolder[], manifestReliable: boolean): void {
  ensureLibraryStorage();
  const retainedIds = new Set(folders.map((folder) => folder.id));

  for (const entry of trashDirectory().list()) {
    if (!(entry instanceof Directory)) {
      entry.delete();
      continue;
    }
    let destination: Directory;
    try {
      destination = getFolderDirectory(entry.name);
    } catch {
      entry.delete();
      continue;
    }
    if ((!manifestReliable || retainedIds.has(entry.name)) && !destination.exists) {
      entry.moveSync(destination);
    } else {
      entry.delete();
    }
  }
}

export function stageFolderDeletion(folderId: string): void {
  const destination = new Directory(trashDirectory(), validateFolderId(folderId));
  if (destination.exists) {
    destination.delete();
  }
  getFolderDirectory(folderId).moveSync(destination);
}

export function restoreStagedFolder(folderId: string): void {
  const staged = new Directory(trashDirectory(), validateFolderId(folderId));
  if (staged.exists && !getFolderDirectory(folderId).exists) {
    staged.moveSync(getFolderDirectory(folderId));
  }
}

export function finalizeStagedFolderDeletion(folderId: string): void {
  const staged = new Directory(trashDirectory(), validateFolderId(folderId));
  if (staged.exists) {
    staged.delete();
  }
}

const lockedFolders = new Set<string>();

function lockFolder(folderId: string): void {
  validateFolderId(folderId);
  if (lockedFolders.has(folderId)) {
    throw new Error('Another change is already in progress for this folder.');
  }
  lockedFolders.add(folderId);
}

function unlockFolder(folderId: string): void {
  lockedFolders.delete(folderId);
}

function withFolderLock<T>(folderId: string, operation: () => T): T {
  lockFolder(folderId);
  try {
    return operation();
  } finally {
    unlockFolder(folderId);
  }
}
