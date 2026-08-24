import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  readFavouritePaths,
  remapFavouritePaths,
  removeFavouritePaths,
  writeFavouritePaths,
} from '@/services/library-favourites';

const folderId = '9d69db61-d249-4d42-a0d4-e1f897469243';

describe('library favourites', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('starts with no favourites', async () => {
    await expect(readFavouritePaths(folderId)).resolves.toEqual(new Set());
  });

  test('persists favourite paths for a subject folder', async () => {
    await writeFavouritePaths(folderId, new Set(['Notes.pdf', 'Term 1/Week 2.pdf']));

    await expect(readFavouritePaths(folderId)).resolves.toEqual(
      new Set(['Notes.pdf', 'Term 1/Week 2.pdf']),
    );
  });

  test('remaps a renamed folder and its favourited descendants', () => {
    const paths = new Set(['Term 1', 'Term 1/Notes.pdf', 'Other.pdf']);

    expect(remapFavouritePaths(paths, 'Term 1', 'Semester 1')).toEqual(
      new Set(['Semester 1', 'Semester 1/Notes.pdf', 'Other.pdf']),
    );
  });

  test('removes a deleted folder and its favourited descendants', () => {
    const paths = new Set(['Term 1', 'Term 1/Notes.pdf', 'Other.pdf']);

    expect(removeFavouritePaths(paths, 'Term 1')).toEqual(new Set(['Other.pdf']));
  });
});
