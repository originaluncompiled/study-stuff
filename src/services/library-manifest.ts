import AsyncStorage from '@react-native-async-storage/async-storage';

import { isStudyFolderRecord } from '@/lib/folder-record';
import type { StudyFolder } from '@/types/library';

const MANIFEST_KEY = 'studystuff:library:v1';

type Manifest = {
  version: 1;
  folders: StudyFolder[];
};

export function parseManifest(value: string | null): StudyFolder[] {
  if (!value) {
    return [];
  }

  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('The saved library index is invalid.');
  }
  const manifest = parsed as Partial<Manifest>;
  if (manifest.version !== 1 || !Array.isArray(manifest.folders)) {
    throw new Error('The saved library index uses an unsupported format.');
  }

  const seen = new Set<string>();
  return manifest.folders.filter((folder) => {
    if (!isStudyFolderRecord(folder) || seen.has(folder.id)) {
      return false;
    }
    seen.add(folder.id);
    return true;
  });
}

export async function readManifest(): Promise<{ folders: StudyFolder[]; reliable: boolean }> {
  try {
    return { folders: parseManifest(await AsyncStorage.getItem(MANIFEST_KEY)), reliable: true };
  } catch {
    return { folders: [], reliable: false };
  }
}

export async function writeManifest(folders: StudyFolder[]): Promise<void> {
  const manifest: Manifest = { version: 1, folders };
  await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
}
