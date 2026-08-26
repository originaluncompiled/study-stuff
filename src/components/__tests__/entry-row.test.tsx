import { fireEvent, render } from '@testing-library/react-native';

import { EntryRow } from '@/components/entry-row';
import type { LibraryEntry } from '@/types/library';

function renderEntry(entry: LibraryEntry, favourite = false) {
  return render(
    <EntryRow
      entry={entry}
      favourite={favourite}
      onMenu={jest.fn()}
      onPress={jest.fn()}
    />,
  );
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

  test('shows file sizes for supported files', async () => {
    const view = await renderEntry({
      childCount: null,
      kind: 'pdf',
      name: 'Notes.pdf',
      relativePath: 'Notes.pdf',
      size: 2048,
    });

    expect(view.getByText('2 KB')).toBeTruthy();
    expect(view.getByTestId('pdf-entry-icon')).toBeTruthy();
    expect(view.getByTestId('pdf-entry-pill').props.className).toContain('bg-purple p-px');
    expect(view.getByText('PDF').props).toEqual(
      expect.objectContaining({
        adjustsFontSizeToFit: true,
        ellipsizeMode: 'clip',
        maxFontSizeMultiplier: 1.25,
        minimumFontScale: 0.75,
        numberOfLines: 1,
      }),
    );
  });

  test.each([
    ['pdf', 'Notes.pdf', 'PDF document'],
    ['image', 'Diagram.png', 'Image'],
    ['text', 'Notes.txt', 'Text file'],
  ] as const)('shows the %s fallback label when size is unavailable', async (kind, name, label) => {
    const view = await renderEntry({
      childCount: null,
      kind,
      name,
      relativePath: name,
      size: null,
    });

    expect(view.getByText(label)).toBeTruthy();
  });

  test('exposes whether an entry is favourited', async () => {
    const entry: LibraryEntry = {
      childCount: null,
      kind: 'pdf',
      name: 'Notes.pdf',
      relativePath: 'Notes.pdf',
      size: 2048,
    };

    const view = await renderEntry(entry, true);

    expect(view.getByRole('button', { name: 'Open Notes.pdf, Favourited' })).toBeTruthy();
  });

  test('enters selection from a long press and replaces row actions with a checkbox', async () => {
    const entry: LibraryEntry = {
      childCount: null,
      kind: 'pdf',
      name: 'Notes.pdf',
      relativePath: 'Notes.pdf',
      size: 2048,
    };
    const onLongPress = jest.fn();
    const normalView = await render(
      <EntryRow
        entry={entry}
        favourite
        onLongPress={onLongPress}
        onMenu={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    await fireEvent(normalView.getByRole('button', { name: 'Open Notes.pdf, Favourited' }), 'longPress');
    expect(onLongPress).toHaveBeenCalled();
    await normalView.unmount();

    const selectedView = await render(
      <EntryRow
        entry={entry}
        favourite
        selected
        selecting
        onMenu={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    expect(selectedView.getByRole('checkbox', { name: 'Deselect Notes.pdf' })).toBeTruthy();
    expect(selectedView.getByTestId('selection-checkbox-Notes.pdf').props.className).toContain(
      'bg-purple',
    );
    expect(selectedView.getByTestId('selection-control-Notes.pdf')).toHaveAnimatedStyle({
      opacity: 1,
      width: 28,
    });
    expect(
      selectedView.getByTestId('entry-menu-Notes.pdf', { includeHiddenElements: true }),
    ).toHaveAnimatedStyle({ opacity: 0, width: 0 });
    expect(selectedView.queryByRole('button', { name: 'Manage Notes.pdf' })).toBeNull();
  });
});
