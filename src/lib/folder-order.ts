import type { StudyFolder } from '@/types/library';

export function orderFolders(folders: StudyFolder[], orderedIds: string[]): StudyFolder[] {
  if (folders.length !== orderedIds.length || new Set(orderedIds).size !== orderedIds.length) {
    throw new Error('The folder order is out of date.');
  }

  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const ordered = orderedIds.map((id) => foldersById.get(id));
  if (ordered.some((folder) => !folder)) {
    throw new Error('The folder order is out of date.');
  }
  if (folders.every((folder, index) => folder.id === orderedIds[index])) {
    return folders;
  }
  return ordered as StudyFolder[];
}
