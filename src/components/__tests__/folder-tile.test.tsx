import { fireEvent, render } from '@testing-library/react-native';

import { FolderTile } from '@/components/folder-tile';
import { colors } from '@/constants/theme';

describe('FolderTile', () => {
  test('exposes the add tile as the add-folder action', async () => {
    const onPress = jest.fn();
    const view = await render(<FolderTile add onPress={onPress} />);

    await fireEvent.press(view.getByRole('button', { name: 'Add folder' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(view.getByText('Add folder')).toBeTruthy();
  });

  test('provides separate open and manage actions', async () => {
    const onPress = jest.fn();
    const onMenu = jest.fn();
    const view = await render(
      <FolderTile color="green" name="Biology" onMenu={onMenu} onPress={onPress} />,
    );

    const openButton = view.getByRole('button', { name: 'Open Biology' });
    expect(openButton).toHaveStyle({ backgroundColor: colors.folderGreen });
    await fireEvent.press(openButton);
    await fireEvent.press(view.getByRole('button', { name: 'Manage Biology' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  test('exposes accessible reorder actions when available', async () => {
    const onMoveEarlier = jest.fn();
    const view = await render(
      <FolderTile
        color="purple"
        name="Biology"
        onMenu={jest.fn()}
        onMoveEarlier={onMoveEarlier}
        onPress={jest.fn()}
      />,
    );

    await fireEvent(
      view.getByRole('button', { name: 'Open Biology' }),
      'accessibilityAction',
      { nativeEvent: { actionName: 'moveEarlier' } },
    );
    expect(onMoveEarlier).toHaveBeenCalledTimes(1);
  });
});
