import {
  ensureUniqueName,
  getAvailableFileName,
  inferPickedFolderName,
  normalizePdfName,
  validateItemName,
} from '@/lib/names';

describe('library names', () => {
  test('trims valid display names', () => {
    expect(validateItemName('  Biology  ')).toBe('Biology');
  });

  test.each(['', '   ', '.', '..', 'a/b', 'a\\b'])('rejects unsafe name %p', (name) => {
    expect(() => validateItemName(name)).toThrow();
  });

  test('detects duplicates without regard to case', () => {
    expect(() => ensureUniqueName('biology', ['Biology'])).toThrow('already exists');
    expect(ensureUniqueName('BIOLOGY', ['Biology'], 'Biology')).toBe('BIOLOGY');
  });

  test('numbers duplicate PDF filenames before the extension', () => {
    expect(getAvailableFileName('Notes.pdf', ['Notes.pdf', 'Notes (2).pdf'])).toBe(
      'Notes (3).pdf',
    );
  });

  test('adds a PDF extension when needed', () => {
    expect(normalizePdfName('Chapter 4')).toBe('Chapter 4.pdf');
    expect(normalizePdfName('Chapter 4.PDF')).toBe('Chapter 4.PDF');
  });

  test('extracts a useful Android tree name', () => {
    expect(inferPickedFolderName('primary%3ADocuments%2FChemistry')).toBe('Chemistry');
    expect(inferPickedFolderName('primary%3ADocuments%2FBad%0AName')).toBe('Bad_Name');
  });
});
