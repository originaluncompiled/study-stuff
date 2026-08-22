import { fireEvent, render } from '@testing-library/react-native';

import { FolderColorPicker } from '@/components/folder-color-picker';

describe('FolderColorPicker', () => {
  test('announces the selected colour and selects another colour', async () => {
    const onSelect = jest.fn();
    const view = await render(
      <FolderColorPicker onSelect={onSelect} selected="purple" />,
    );

    expect(
      view.getAllByRole('radio').map((option) => option.props.accessibilityLabel),
    ).toEqual([
      'Red folder colour',
      'Orange folder colour',
      'Yellow folder colour',
      'Green folder colour',
      'Teal folder colour',
      'Blue folder colour',
      'Purple folder colour',
      'Pink folder colour',
      'Black folder colour',
      'Light gray folder colour',
    ]);
    expect(view.queryByText('Purple')).toBeNull();
    expect(
      view.getByRole('radio', { name: 'Purple folder colour' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
    await fireEvent.press(view.getByRole('radio', { name: 'Green folder colour' }));
    expect(onSelect).toHaveBeenCalledWith('green');
  });
});
