import { classifyLibraryFile, supportedPickerMimeTypes } from '@/lib/library-file';

describe('library file classification', () => {
  test.each([
    ['.PDF', undefined, 'pdf'],
    ['.txt', undefined, 'text'],
    ['.jpeg', undefined, 'image'],
    ['.heic', undefined, 'image'],
    ['', 'image/webp', 'image'],
    ['', 'text/plain; charset=utf-8', 'text'],
  ])('classifies %p / %p as %p', (extension, mimeType, kind) => {
    expect(classifyLibraryFile(extension, mimeType)?.kind).toBe(kind);
  });

  test('prefers a recognized extension over conflicting provider metadata', () => {
    expect(classifyLibraryFile('.txt', 'image/png')).toEqual({
      extension: '.txt',
      kind: 'text',
    });
  });

  test('rejects unsupported files and keeps the picker filter explicit', () => {
    expect(classifyLibraryFile('.docx', 'application/octet-stream')).toBeNull();
    expect(supportedPickerMimeTypes).toEqual(
      expect.arrayContaining(['application/pdf', 'text/plain', 'image/jpeg', 'image/heic']),
    );
  });
});
