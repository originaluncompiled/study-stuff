import {
  joinRelativePath,
  normalizeRelativePath,
  parentRelativePath,
  relativePathSegments,
  validateFolderId,
} from '@/lib/paths';

describe('library paths', () => {
  test('normalizes and joins safe relative paths', () => {
    expect(normalizeRelativePath('Semester 1/Week 2')).toBe('Semester 1/Week 2');
    expect(joinRelativePath('Semester 1', 'Week 2')).toBe('Semester 1/Week 2');
    expect(relativePathSegments('Semester 1/Week 2')).toEqual(['Semester 1', 'Week 2']);
    expect(parentRelativePath('Semester 1/Week 2')).toBe('Semester 1');
  });

  test.each(['/absolute', 'one//two', '../outside', 'one/./two', 'one\\two'])(
    'rejects unsafe path %p',
    (path) => expect(() => normalizeRelativePath(path)).toThrow('Invalid library path'),
  );

  test('accepts generated UUID folder identifiers only', () => {
    expect(validateFolderId('10ba038e-48da-487b-96e8-8d3b99b6d18a')).toContain('10ba038e');
    expect(() => validateFolderId('../other-folder')).toThrow('Invalid folder identifier');
  });
});
