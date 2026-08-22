import { orderFolders } from '@/lib/folder-order';
import type { StudyFolder } from '@/types/library';

const folders: StudyFolder[] = [
  {
    color: 'purple',
    id: 'first',
    name: 'First',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  },
  {
    color: 'green',
    id: 'second',
    name: 'Second',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  },
];

describe('folder ordering', () => {
  test('orders folders by ID without copying unchanged order', () => {
    expect(orderFolders(folders, ['second', 'first']).map((folder) => folder.id)).toEqual([
      'second',
      'first',
    ]);
    expect(orderFolders(folders, ['first', 'second'])).toBe(folders);
  });

  test.each([
    [['first']],
    [['first', 'first']],
    [['first', 'missing']],
  ])('rejects an out-of-date order', (ids) => {
    expect(() => orderFolders(folders, ids)).toThrow('out of date');
  });
});
