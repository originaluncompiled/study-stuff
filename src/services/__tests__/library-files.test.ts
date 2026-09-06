import { Directory, File } from 'expo-file-system';

import {
  createFolderDirectory,
  createSubfolder,
  createTextFile,
  deleteFolderDirectory,
  exportLibraryEntries,
  writeTextFile,
} from '@/services/library-files';
import type { LibraryEntry } from '@/types/library';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'export-test-batch' }));

const folderId = '10ba038e-48da-487b-96e8-8d3b99b6d18a';
const destinationUri = 'file:///mock/picked/directory';

function entry(
  kind: LibraryEntry['kind'],
  name: string,
  relativePath = name,
): LibraryEntry {
  return {
    childCount: kind === 'directory' ? 1 : null,
    kind,
    name,
    relativePath,
    size: kind === 'directory' ? null : 12,
  };
}

describe('library file export', () => {
  beforeEach(() => {
    deleteFolderDirectory(folderId);
    createFolderDirectory(folderId);

    const destination = new Directory(destinationUri);
    if (destination.exists) {
      destination.delete();
    }
    destination.create({ intermediates: true });
  });

  test('copies selected files and nested folders to device storage', async () => {
    createTextFile(folderId, '', 'Notes');
    await writeTextFile(folderId, 'Notes.txt', 'Study notes');
    createSubfolder(folderId, '', 'References');
    createTextFile(folderId, 'References', 'Source');
    await writeTextFile(folderId, 'References/Source.txt', 'Citation');

    await expect(
      exportLibraryEntries(folderId, [
        entry('text', 'Notes.txt'),
        entry('directory', 'References'),
      ]),
    ).resolves.toBe(2);

    const destination = new Directory(destinationUri);
    expect(destination.list().map((item) => item.name).sort()).toEqual([
      'Notes.txt',
      'References',
    ]);
    await expect(new File(destination, 'Notes.txt').text()).resolves.toBe('Study notes');
    await expect(new File(destination, 'References', 'Source.txt').text()).resolves.toBe(
      'Citation',
    );
  });

  test('numbers repeat exports instead of overwriting existing backups', async () => {
    createTextFile(folderId, '', 'Notes');
    await writeTextFile(folderId, 'Notes.txt', 'Latest notes');
    const selected = [entry('text', 'Notes.txt')];

    await exportLibraryEntries(folderId, selected);
    await exportLibraryEntries(folderId, selected);

    const destination = new Directory(destinationUri);
    expect(destination.list().map((item) => item.name).sort()).toEqual([
      'Notes (2).txt',
      'Notes.txt',
    ]);
    await expect(new File(destination, 'Notes (2).txt').text()).resolves.toBe('Latest notes');
  });

  test('treats closing the directory picker as a cancelled export', async () => {
    const picker = jest
      .spyOn(Directory, 'pickDirectoryAsync')
      .mockRejectedValueOnce(new Error('The file picker was cancelled by the user'));

    await expect(exportLibraryEntries(folderId, [entry('text', 'Notes.txt')])).resolves.toBe(0);
    picker.mockRestore();
  });
});
