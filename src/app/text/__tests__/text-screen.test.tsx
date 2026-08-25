import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import TextScreen from '@/app/text/[folderId]';

const mockDispatch = jest.fn();
const mockTouchFolder = jest.fn();
const mockWriteTextFile = jest.fn(async (_path: string, _content: string) => undefined);
let mockPreventRemove: ((event: { data: { action: { type: string } } }) => void) | null = null;

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ folderId: 'folder-1', path: 'Notes.txt' }),
  useNavigation: () => ({ dispatch: mockDispatch }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (_preventRemove: boolean, callback: typeof mockPreventRemove) => {
    mockPreventRemove = callback;
  },
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Error: 'error', Success: 'success' },
  notificationAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@/components/immersive-viewer-chrome', () => {
  const React = jest.requireActual('react');
  const { Text: MockText, View: MockView } = jest.requireActual('react-native');
  return {
    ImmersiveViewerChrome: (props: {
      rightAction?: ReactNode;
      title: string;
    }) => (
      <MockView testID="viewer-chrome">
        <MockText>{props.title}</MockText>
        {props.rightAction}
      </MockView>
    ),
    useImmersiveViewerChrome: () => {
      const [headerVisible, setHeaderVisible] = React.useState(true);
      return {
        headerHeight: 56,
        headerTranslateStyle: {},
        headerVisible,
        immersiveBackgroundStyle: {},
        insets: { bottom: 0, left: 0, right: 0, top: 0 },
        setHeaderVisible,
        toggleHeader: () => setHeaderVisible((visible: boolean) => !visible),
      };
    },
  };
});

jest.mock('@/services/library-files', () => ({
  readTextFile: async () => 'Original note',
  writeTextFile: (_folderId: string, path: string, content: string) =>
    mockWriteTextFile(path, content),
}));

jest.mock('@/store/library-store', () => ({
  useLibraryStore: (selector: (state: { touchFolder: typeof mockTouchFolder }) => unknown) =>
    selector({ touchFolder: mockTouchFolder }),
}));

describe('TextScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreventRemove = null;
  });

  test('edits and saves plain text explicitly', async () => {
    const view = await render(<TextScreen />);

    await view.findByText('Original note');
    await fireEvent.press(view.getByRole('button', { name: 'Edit text file' }));
    await fireEvent.changeText(view.getByLabelText('Edit Notes.txt'), 'Updated note');
    await fireEvent.press(view.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(mockWriteTextFile).toHaveBeenCalledWith('Notes.txt', 'Updated note'),
    );
    expect(mockTouchFolder).toHaveBeenCalledWith('folder-1');
    expect(view.getByText('Updated note')).toBeTruthy();
  });

  test('requires confirmation before discarding unsaved edits', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const view = await render(<TextScreen />);

    await view.findByText('Original note');
    await fireEvent.press(view.getByRole('button', { name: 'Edit text file' }));
    await fireEvent.changeText(view.getByLabelText('Edit Notes.txt'), 'Unsaved note');

    await act(() => mockPreventRemove?.({ data: { action: { type: 'GO_BACK' } } }));

    expect(alert).toHaveBeenCalledWith(
      'Discard unsaved changes?',
      'Your edits to Notes.txt will be lost.',
      expect.any(Array),
    );

    const buttons = alert.mock.calls[0]?.[2];
    const discard = buttons?.find((button) => button.text === 'Discard');
    await act(() => discard?.onPress?.());

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' }));
  });
});
