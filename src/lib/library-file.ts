import type { LibraryFileKind } from '@/types/library';

export type LibraryFileDescriptor = {
  extension: string;
  kind: LibraryFileKind;
};

const descriptorsByExtension: Record<string, LibraryFileDescriptor> = {
  '.pdf': { extension: '.pdf', kind: 'pdf' },
  '.txt': { extension: '.txt', kind: 'text' },
  '.jpg': { extension: '.jpg', kind: 'image' },
  '.jpeg': { extension: '.jpeg', kind: 'image' },
  '.png': { extension: '.png', kind: 'image' },
  '.apng': { extension: '.apng', kind: 'image' },
  '.gif': { extension: '.gif', kind: 'image' },
  '.webp': { extension: '.webp', kind: 'image' },
  '.avif': { extension: '.avif', kind: 'image' },
  '.heic': { extension: '.heic', kind: 'image' },
  '.heif': { extension: '.heif', kind: 'image' },
  '.svg': { extension: '.svg', kind: 'image' },
  '.ico': { extension: '.ico', kind: 'image' },
};

const descriptorsByMimeType: Record<string, LibraryFileDescriptor> = {
  'application/pdf': descriptorsByExtension['.pdf'],
  'text/plain': descriptorsByExtension['.txt'],
  'image/jpeg': descriptorsByExtension['.jpg'],
  'image/png': descriptorsByExtension['.png'],
  'image/apng': descriptorsByExtension['.apng'],
  'image/gif': descriptorsByExtension['.gif'],
  'image/webp': descriptorsByExtension['.webp'],
  'image/avif': descriptorsByExtension['.avif'],
  'image/heic': descriptorsByExtension['.heic'],
  'image/heif': descriptorsByExtension['.heif'],
  'image/svg+xml': descriptorsByExtension['.svg'],
  'image/x-icon': descriptorsByExtension['.ico'],
  'image/vnd.microsoft.icon': descriptorsByExtension['.ico'],
};

export const supportedPickerMimeTypes = Object.keys(descriptorsByMimeType);

export function classifyLibraryFile(
  extension?: string | null,
  mimeType?: string | null,
): LibraryFileDescriptor | null {
  const normalizedExtension = extension?.trim().toLocaleLowerCase();
  if (normalizedExtension && descriptorsByExtension[normalizedExtension]) {
    return descriptorsByExtension[normalizedExtension];
  }

  const normalizedMimeType = mimeType?.split(';')[0].trim().toLocaleLowerCase();
  return normalizedMimeType ? (descriptorsByMimeType[normalizedMimeType] ?? null) : null;
}

export function isSupportedExtension(extension: string): boolean {
  return Boolean(descriptorsByExtension[extension.toLocaleLowerCase()]);
}
