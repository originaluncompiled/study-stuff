import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, Platform, StyleSheet } from 'react-native';

import { NameDialog } from '@/components/name-dialog';

describe('NameDialog', () => {
  test('does not automatically select an existing name', async () => {
    const view = await render(
      <NameDialog
        initialValue="Biology"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        title="Rename Folder"
        visible
      />,
    );

    expect(view.getByLabelText('Folder name').props.selectTextOnFocus).not.toBe(true);
  });

  test('centers the dialog within the height remaining above the keyboard', async () => {
    const view = await render(
      <NameDialog
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        title="Name Folder"
        visible
      />,
    );
    const [keyboardView] = view.container.queryAll(
      (node) => node.props.className === 'flex-1 justify-center bg-black/40 px-5',
    );

    await fireEvent(keyboardView, 'layout', {
      nativeEvent: { layout: { height: 800, width: 400, x: 0, y: 0 } },
      persist: jest.fn(),
    });
    await act(async () => {
      (
        Keyboard as unknown as {
          _emitter: { emit: (eventName: string, event: object) => void };
        }
      )._emitter.emit(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', {
        duration: 250,
        easing: 'keyboard',
        endCoordinates: { height: 300, screenX: 0, screenY: 500, width: 400 },
      });
    });

    expect(StyleSheet.flatten(keyboardView.props.style)).toMatchObject({
      flex: 0,
      height: 500,
    });
  });
});
