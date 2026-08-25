import { randomUUID } from 'expo-crypto';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { isStudyFolderRecord } from '@/lib/folder-record';
import {
  classifyLibraryFile,
  type LibraryFileDescriptor,
  supportedFilePickerMimeTypes,
} from '@/lib/library-file';
import { compareLibraryEntries } from '@/lib/library-entry-order';
import {
  ensureUniqueName,
  getAvailableFileName,
  inferPickedFolderName,
  normalizeFileName,
  sanitizeStorageName,
  validateItemName,
} from '@/lib/names';
import { joinRelativePath, relativePathSegments, validateFolderId } from '@/lib/paths';
import type {
  ImportProgress,
  LibraryEntry,
  LibraryFileKind,
  StudyFolder,
} from '@/types/library';

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

export function getLibraryFile(folderId: string, relativePath: string): File {
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
      const descriptor = getLibraryFileDescriptor(entry);
      if (!descriptor) {
        return [];
      }
      return [
        {
          childCount: null,
          kind: descriptor.kind,
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
      .filter((entry) => entry instanceof Directory || Boolean(getLibraryFileDescriptor(entry)))
      .length;
  } catch {
    return null;
  }
}

export async function pickAndCopyFiles(
  folderId: string,
  relativePath?: string,
): Promise<number> {
  lockFolder(folderId);
  try {
    const result = await File.pickFileAsync({
      multipleFiles: true,
      mimeTypes: supportedFilePickerMimeTypes,
    });
    if (result.canceled || !result.result) {
      return 0;
    }
    return await copyFilesUnlocked(
      folderId,
      relativePath,
      result.result.map((file) => ({ file })),
    );
  } finally {
    unlockFolder(folderId);
  }
}

export async function pickAndCopyImages(
  folderId: string,
  relativePath?: string,
): Promise<number> {
  lockFolder(folderId);
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 1,
      selectionLimit: 0,
    });
    if (result.canceled || !result.assets.length) {
      return 0;
    }

    return await copyFilesUnlocked(
      folderId,
      relativePath,
      result.assets.map((asset) => ({
        file: new File(asset.uri),
        mimeType: asset.mimeType,
        preferredName: asset.fileName,
      })),
    );
  } finally {
    unlockFolder(folderId);
  }
}

export async function takeAndCopyPhoto(
  folderId: string,
  relativePath?: string,
): Promise<number> {
  lockFolder(folderId);
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error(
        permission.canAskAgain
          ? 'Camera permission is needed to take a picture.'
          : 'Camera access is disabled. Enable it in your device settings to take a picture.',
      );
    }

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.back,
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) {
      return 0;
    }

    const asset = result.assets[0];
    return await copyFilesUnlocked(folderId, relativePath, [
      {
        file: new File(asset.uri),
        mimeType: asset.mimeType,
        preferredName: asset.fileName,
      },
    ]);
  } finally {
    unlockFolder(folderId);
  }
}

type CopySource = {
  file: File;
  mimeType?: string | null;
  preferredName?: string | null;
};

async function copyFilesUnlocked(
  folderId: string,
  relativePath: string | undefined,
  sources: CopySource[],
): Promise<number> {
  const destination = getDirectory(folderId, relativePath);
  if (!destination.exists) {
    throw new Error('This folder no longer exists.');
  }
  const existingNames = new Set(destination.list().map((entry) => entry.name));
  const batch = new Directory(stagingDirectory(), randomUUID());
  batch.create();
  let copied = 0;
  const committed: File[] = [];

  try {
    for (const source of sources) {
      const descriptor = getLibraryFileDescriptor(source.file, source.mimeType);
      if (!descriptor) {
        continue;
      }
      const safeName = libraryFileStorageName(
        source.file,
        descriptor,
        getFallbackFileName(descriptor, copied + 1),
        source.preferredName,
      );
      const name = getAvailableFileName(safeName, existingNames);
      await source.file.copy(new File(batch, name));
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

export async function importPickedDirectory(
  folderId: string,
  onProgress: (progress: ImportProgress) => void,
  createMetadata: (suggestedName: string) => StudyFolder,
): Promise<{ fileCount: number; folder: StudyFolder }> {
  if (Platform.OS !== 'android') {
    throw new Error('Whole-folder import is currently available on Android only.');
  }

  ensureLibraryStorage();
  const source = await Directory.pickDirectoryAsync();
  const staging = new Directory(stagingDirectory(), validateFolderId(folderId));
  staging.create();

  const progress: ImportProgress = { copiedFiles: 0, currentName: '' };
  try {
    await copyFileTree(source, staging, progress, onProgress, new Set(), 0);
    if (progress.copiedFiles === 0) {
      throw new Error('No supported files were found in that folder.');
    }

    const folder = createMetadata(inferPickedFolderName(source.name));
    writeMetadataToDirectory(staging, folder);
    await staging.move(getFolderDirectory(folderId));
    return {
      fileCount: progress.copiedFiles,
      folder,
    };
  } catch (error) {
    if (staging.exists) {
      staging.delete();
    }
    throw error;
  }
}

async function copyFileTree(
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
      const childCount = await copyFileTree(
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

    const descriptor = getLibraryFileDescriptor(entry);
    if (!descriptor) {
      continue;
    }
    const preferredName = libraryFileStorageName(
      entry,
      descriptor,
      getFallbackFileName(descriptor, progress.copiedFiles + 1),
    );
    const name = getAvailableFileName(preferredName, destinationNames);
    await entry.copy(new File(destination, name));
    destinationNames.add(name);
    copiedHere += 1;
    progress.copiedFiles += 1;
    progress.currentName = name;
    onProgress({ ...progress });
  }

  return copiedHere;
}

export function getLibraryFileKind(file: File): LibraryFileKind | null {
  return getLibraryFileDescriptor(file)?.kind ?? null;
}

function getLibraryFileDescriptor(
  file: File,
  mimeType?: string | null,
): LibraryFileDescriptor | null {
  try {
    const descriptor = classifyLibraryFile(file.extension, mimeType ?? file.type);
    if (descriptor) {
      return descriptor;
    }
  } catch {
    // Fall through to a small signature check for opaque provider URIs.
  }

  let handle: ReturnType<File['open']> | null = null;
  try {
    handle = file.open(FileMode.ReadOnly);
    return classifyFileSignature(handle.readBytes(12));
  } catch {
    return null;
  } finally {
    handle?.close();
  }
}

function classifyFileSignature(header: Uint8Array): LibraryFileDescriptor | null {
  if (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  ) {
    return { extension: '.pdf', kind: 'pdf' };
  }
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { extension: '.jpg', kind: 'image' };
  }
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return { extension: '.png', kind: 'image' };
  }
  const signature = String.fromCharCode(...header);
  if (signature.startsWith('GIF87a') || signature.startsWith('GIF89a')) {
    return { extension: '.gif', kind: 'image' };
  }
  if (signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP') {
    return { extension: '.webp', kind: 'image' };
  }
  if (header[0] === 0 && header[1] === 0 && header[2] === 1 && header[3] === 0) {
    return { extension: '.ico', kind: 'image' };
  }
  if (signature.slice(4, 8) === 'ftyp') {
    const brand = signature.slice(8, 12);
    if (brand === 'avif' || brand === 'avis') {
      return { extension: '.avif', kind: 'image' };
    }
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
      return { extension: '.heic', kind: 'image' };
    }
  }
  return null;
}

function libraryFileStorageName(
  file: File,
  descriptor: LibraryFileDescriptor,
  fallback: string,
  preferredName?: string | null,
): string {
  const safeName = sanitizeStorageName(preferredName || file.name, fallback);
  const namedDescriptor = classifyLibraryFile(fileExtension(safeName));
  return namedDescriptor?.kind === descriptor.kind ? safeName : `${safeName}${descriptor.extension}`;
}

function getFallbackFileName(descriptor: LibraryFileDescriptor, index: number): string {
  const label = descriptor.kind === 'pdf' ? 'Document' : descriptor.kind === 'image' ? 'Image' : 'Text';
  return `${label} ${index}${descriptor.extension}`;
}

function fileExtension(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(dotIndex) : '';
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function createTextFile(
  folderId: string,
  relativePath: string | undefined,
  value: string,
): string {
  return withFolderLock(folderId, () => {
    const parent = getDirectory(folderId, relativePath);
    if (!parent.exists) {
      throw new Error('This folder no longer exists.');
    }
    const name = ensureUniqueName(
      normalizeFileName(value, '.txt'),
      parent.list().map((entry) => entry.name),
    );
    const file = new File(parent, name);
    file.create();
    file.write('');
    return joinRelativePath(relativePath ?? '', name);
  });
}

export async function readTextFile(folderId: string, relativePath: string): Promise<string> {
  const file = getLibraryFile(folderId, relativePath);
  if (!file.exists) {
    throw new Error('This text file is no longer stored on the device.');
  }
  if (getLibraryFileKind(file) !== 'text') {
    throw new Error('This is not a supported text file.');
  }
  return await file.text();
}

export async function writeTextFile(
  folderId: string,
  relativePath: string,
  content: string,
): Promise<void> {
  withFolderLock(folderId, () => {
    const file = getLibraryFile(folderId, relativePath);
    if (!file.exists) {
      throw new Error('This text file is no longer stored on the device.');
    }
    if (getLibraryFileKind(file) !== 'text') {
      throw new Error('This is not a supported text file.');
    }
    file.write(content);
  });
}

export function renameEntry(
  folderId: string,
  relativePath: string,
  kind: LibraryEntry['kind'],
  newName: string,
): string {
  return withFolderLock(folderId, () => {
    return renameEntryUnlocked(folderId, relativePath, kind, newName);
  });
}

function renameEntryUnlocked(
  folderId: string,
  relativePath: string,
  kind: LibraryEntry['kind'],
  newName: string,
): string {
  const segments = relativePathSegments(relativePath);
  const oldName = segments.pop();
  if (!oldName) {
    throw new Error('The library root cannot be renamed here.');
  }
  const parent = new Directory(getFolderDirectory(folderId), ...segments);
  const currentFile = kind === 'directory' ? null : new File(parent, oldName);
  const descriptor = currentFile ? getLibraryFileDescriptor(currentFile) : null;
  if (kind !== 'directory' && descriptor?.kind !== kind) {
    throw new Error('This file type could not be verified.');
  }
  const safeNewName =
    kind === 'directory'
      ? validateItemName(newName)
      : normalizeFileName(newName, descriptor?.extension ?? fileExtension(oldName));
  if (
    segments.length === 0 &&
    [METADATA_FILE_NAME, METADATA_TEMP_FILE_NAME].includes(safeNewName)
  ) {
    throw new Error('That name is reserved by StudyStuff.');
  }
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
  return safeNewName;
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
