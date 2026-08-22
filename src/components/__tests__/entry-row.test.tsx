import { render } from '@testing-library/react-native';

import { EntryRow } from '@/components/entry-row';
import type { LibraryEntry } from '@/types/library';

function renderEntry(entry: LibraryEntry) {
  return render(<EntryRow entry={entry} onMenu={jest.fn()} onPress={jest.fn()} />);
}

describe('EntryRow', () => {
  test.each([
    [0, '0 items'],
    [1, '1 item'],
    [2, '2 items'],
  ])('shows the direct item count for a folder', async (childCount, label) => {
    const view = await renderEntry({
      childCount,
      kind: 'directory',
      name: 'Biology',
      relativePath: 'Biology',
      size: null,
    });

    expect(view.getByText(label)).toBeTruthy();
    expect(view.getByRole('button', { name: `Open Biology, ${label}` })).toBeTruthy();
  });

  test('falls back to the folder label when the count is unavailable', async () => {
    const view = await renderEntry({
      childCount: null,
      kind: 'directory',
      name: 'Biology',
      relativePath: 'Biology',
      size: null,
    });

    expect(view.getByText('Folder')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Open Biology' })).toBeTruthy();
  });

  test('continues to show file size for PDFs', async () => {
    const view = await renderEntry({
      childCount: null,
      kind: 'pdf',
      name: 'Notes.pdf',
      relativePath: 'Notes.pdf',
      size: 2048,
    });

    expect(view.getByText('2 KB')).toBeTruthy();
  });
});
