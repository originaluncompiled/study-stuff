import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseManifest, readManifest } from '@/services/library-manifest';

describe('library manifest', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('parses a versioned manifest and filters malformed records', () => {
    const value = JSON.stringify({
      version: 1,
      folders: [
        {
          color: 'green',
          id: '10ba038e-48da-487b-96e8-8d3b99b6d18a',
          name: 'Biology',
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
        },
        {
          color: 'toString',
          id: '8df645dd-f044-4a85-9a46-a73c3b80eeb4',
          name: 'Invalid',
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
        },
      ],
    });

    expect(parseManifest(value)).toHaveLength(1);
    expect(parseManifest(value)[0].name).toBe('Biology');
    expect(parseManifest(value)[0].color).toBe('green');
  });

  test('rejects records without a supported colour', () => {
    const value = JSON.stringify({
      version: 1,
      folders: [
        {
          id: '10ba038e-48da-487b-96e8-8d3b99b6d18a',
          name: 'Biology',
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
        },
      ],
    });

    expect(parseManifest(value)).toEqual([]);
  });

  test('returns an empty library when nothing has been persisted', () => {
    expect(parseManifest(null)).toEqual([]);
  });

  test('rejects unsupported manifest versions', () => {
    expect(() => parseManifest('{"version":2,"folders":[]}')).toThrow('unsupported format');
  });

  test('distinguishes an empty manifest from an unreadable one', async () => {
    await expect(readManifest()).resolves.toEqual({ folders: [], reliable: true });

    await AsyncStorage.setItem('studystuff:library:v1', 'not-json');
    await expect(readManifest()).resolves.toEqual({ folders: [], reliable: false });
  });
});
