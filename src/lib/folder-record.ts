import { isFolderColor } from '@/constants/theme';
import { validateItemName } from '@/lib/names';
import { validateFolderId } from '@/lib/paths';
import type { StudyFolder } from '@/types/library';

export function isStudyFolderRecord(value: unknown, expectedId?: string): value is StudyFolder {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const folder = value as Record<string, unknown>;
  if (
    typeof folder.id !== 'string' ||
    typeof folder.name !== 'string' ||
    !isFolderColor(folder.color) ||
    typeof folder.createdAt !== 'string' ||
    typeof folder.updatedAt !== 'string'
  ) {
    return false;
  }

  try {
    if (validateFolderId(folder.id) !== folder.id || validateItemName(folder.name) !== folder.name) {
      return false;
    }
  } catch {
    return false;
  }

  return (
    (!expectedId || folder.id === expectedId) &&
    Number.isFinite(Date.parse(folder.createdAt)) &&
    Number.isFinite(Date.parse(folder.updatedAt))
  );
}
