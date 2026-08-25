import { orderLibraryEntries } from '@/lib/library-entry-order';
import type { LibraryEntry } from '@/types/library';

function entry(name: string, kind: LibraryEntry['kind']): LibraryEntry {
  return {
    childCount: kind === 'directory' ? 0 : null,
    kind,
    name,
    relativePath: name,
    size: null,
  };
}

describe('orderLibraryEntries', () => {
  test('pins favourites while keeping the normal folder-first alphabetical order in each group', () => {
    const entries = [
      entry('Week 10.pdf', 'pdf'),
      entry('Zoology', 'directory'),
      entry('Week 2.pdf', 'pdf'),
      entry('Biology', 'directory'),
    ];

    const ordered = orderLibraryEntries(
      entries,
      new Set(['Week 10.pdf', 'Week 2.pdf', 'Zoology']),
    );

    expect(ordered.map((item) => item.name)).toEqual([
      'Zoology',
      'Week 2.pdf',
      'Week 10.pdf',
      'Biology',
    ]);
  });

  test('does not mutate the source list', () => {
    const entries = [entry('Zoology', 'directory'), entry('Biology', 'directory')];

    orderLibraryEntries(entries, new Set(['Zoology']));

    expect(entries.map((item) => item.name)).toEqual(['Zoology', 'Biology']);
  });

  test('sorts mixed file kinds together after directories', () => {
    const entries = [
      entry('Notes.txt', 'text'),
      entry('Page 10.jpg', 'image'),
      entry('Chapter.pdf', 'pdf'),
      entry('Folder', 'directory'),
      entry('Page 2.jpg', 'image'),
    ];

    expect(orderLibraryEntries(entries, new Set()).map((item) => item.name)).toEqual([
      'Folder',
      'Chapter.pdf',
      'Notes.txt',
      'Page 2.jpg',
      'Page 10.jpg',
    ]);
  });
});
