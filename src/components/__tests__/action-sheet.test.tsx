import { fireEvent, render } from '@testing-library/react-native';
import { Pencil } from 'lucide-react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActionRow, ActionSheet } from '@/components/action-sheet';

describe('ActionSheet', () => {
  test('presents labeled actions and dismisses through its UI-thread gesture', async () => {
    const onDismiss = jest.fn();
    const onRename = jest.fn();
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 47 },
        }}>
        <ActionSheet onDismiss={onDismiss} title="Biology" visible>
          <ActionRow icon={Pencil} label="Rename" onPress={onRename} />
        </ActionSheet>
      </SafeAreaProvider>,
    );

    expect(view.getByRole('header', { name: 'Biology' })).toBeTruthy();
    expect(view.getByTestId('action-sheet-modal').props.animationType).toBe('none');
    expect(view.getByTestId('action-sheet-gesture-root')).toHaveStyle({
      flex: 1,
      justifyContent: 'flex-end',
    });
    expect(
      view.getByTestId('action-sheet-backdrop', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(view.getByTestId('action-sheet-panel')).toHaveStyle({
      marginBottom: -28,
      paddingBottom: 62,
    });
    const panGesture = getByGestureTestId('action-sheet-pan');
    expect(panGesture).toBeTruthy();
    expect(view.getByTestId('action-sheet-drag-handle').props.onResponderMove).toBeUndefined();
    await fireEvent.press(view.getByRole('button', { name: /^Rename/ }));
    expect(onRename).toHaveBeenCalledTimes(1);

    fireGestureHandler(panGesture, [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 80, velocityY: 0 },
      { state: State.END, translationY: 80, velocityY: 0 },
    ]);
    await Promise.resolve();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
