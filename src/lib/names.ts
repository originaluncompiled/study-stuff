export const MAX_ITEM_NAME_LENGTH = 80;
const INVALID_NAME_CHARACTERS = /[\\/\0-\x1f]/;

export function validateItemName(value: string): string {
  const name = value.trim();

  if (!name) {
    throw new Error('Enter a name.');
  }
  if (name === '.' || name === '..') {
    throw new Error('Choose a different name.');
  }
  if (name.length > MAX_ITEM_NAME_LENGTH) {
    throw new Error(`Names can be at most ${MAX_ITEM_NAME_LENGTH} characters.`);
  }
  if (INVALID_NAME_CHARACTERS.test(name)) {
    throw new Error('Names cannot contain slashes or control characters.');
  }

  return name;
}

export function ensureUniqueName(name: string, names: Iterable<string>, currentName?: string): string {
  const normalized = name.toLocaleLowerCase();
  const currentNormalized = currentName?.toLocaleLowerCase();
  const duplicate = Array.from(names).some((candidate) => {
    const candidateNormalized = candidate.toLocaleLowerCase();
    return candidateNormalized === normalized && candidateNormalized !== currentNormalized;
  });

  if (duplicate) {
    throw new Error(`“${name}” already exists here.`);
  }

  return name;
}

export function getAvailableFileName(preferredName: string, names: Iterable<string>): string {
  const existing = new Set(Array.from(names, (name) => name.toLocaleLowerCase()));
  if (!existing.has(preferredName.toLocaleLowerCase())) {
    return preferredName;
  }

  const dotIndex = preferredName.lastIndexOf('.');
  const hasExtension = dotIndex > 0;
  const base = hasExtension ? preferredName.slice(0, dotIndex) : preferredName;
  const extension = hasExtension ? preferredName.slice(dotIndex) : '';

  let index = 2;
  let candidate = `${base} (${index})${extension}`;
  while (existing.has(candidate.toLocaleLowerCase())) {
    index += 1;
    candidate = `${base} (${index})${extension}`;
  }
  return candidate;
}

export function normalizePdfName(value: string): string {
  return normalizeFileName(value, '.pdf');
}

export function normalizeFileName(value: string, extension: string): string {
  const name = validateItemName(value);
  const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
  const result = name.toLocaleLowerCase().endsWith(normalizedExtension.toLocaleLowerCase())
    ? name
    : `${name}${normalizedExtension}`;

  if (result.length > MAX_ITEM_NAME_LENGTH) {
    throw new Error(`Names can be at most ${MAX_ITEM_NAME_LENGTH} characters including the extension.`);
  }
  return result;
}

export function inferPickedFolderName(uriName: string): string {
  let decoded = uriName;
  try {
    decoded = decodeURIComponent(uriName);
  } catch {
    // Some document providers return a partially encoded identifier.
  }

  const candidate = decoded.split(/[/:]/).filter(Boolean).at(-1)?.trim();
  if (!candidate || candidate === 'tree') {
    return 'Imported folder';
  }

  return sanitizeStorageName(candidate, 'Imported folder').slice(0, MAX_ITEM_NAME_LENGTH);
}

export function sanitizeStorageName(value: string, fallback: string): string {
  const sanitized = value.replace(/[\\/\0-\x1f]/g, '_').trim();
  return (sanitized || fallback).slice(0, 180);
}
