export function normalizeRelativePath(value: string | undefined): string {
  if (!value) {
    return '';
  }

  const segments = value.split('/');
  if (
    segments.some(
      (segment) =>
        !segment || segment === '.' || segment === '..' || segment.includes('\\') || segment.includes('\0'),
    )
  ) {
    throw new Error('Invalid library path.');
  }

  return segments.join('/');
}

export function joinRelativePath(parent: string, child: string): string {
  return normalizeRelativePath(parent ? `${parent}/${child}` : child);
}

export function parentRelativePath(value: string): string {
  const normalized = normalizeRelativePath(value);
  const segments = normalized.split('/');
  segments.pop();
  return segments.join('/');
}

export function relativePathSegments(value: string | undefined): string[] {
  const normalized = normalizeRelativePath(value);
  return normalized ? normalized.split('/') : [];
}

export function validateFolderId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('Invalid folder identifier.');
  }
  return value;
}
