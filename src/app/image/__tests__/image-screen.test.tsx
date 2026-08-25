import type { ReactNode } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import ImageScreen from '@/app/image/[folderId]';

const mockGoToIndex = jest.fn();
let mockViewerProps: { initialIndex: number; ListComponent?: unknown } | null = null;
let mockZoomHandler: ((event: { scale: number }) => void) | null = null;

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ folderId: 'folder-1', path: 'Page 10.jpg' }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-image', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    Image: (props: object) => <MockView {...props} testID="gallery-image" />,
  };
});

jest.mock('react-native-gesture-image-viewer', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    GestureViewer: (props: {
      data: unknown[];
      initialIndex: number;
      renderItem: (item: unknown, index: number, state: { isActive: boolean }) => ReactNode;
    }) => {
      mockViewerProps = props;
      return (
        <MockView testID="image-viewer">
          {props.renderItem(props.data[props.initialIndex], props.initialIndex, { isActive: true })}
        </MockView>
      );
    },
    useGestureViewerController: () => ({
      goToIndex: mockGoToIndex,
      goToNext: jest.fn(),
      goToPrevious: jest.fn(),
    }),
    useGestureViewerEvent: (
      _id: string,
      _event: string,
      handler: (event: { scale: number }) => void,
    ) => {
      mockZoomHandler = handler;
    },
    useGestureViewerState: () => ({ currentIndex: 1, totalCount: 2 }),
  };
});

jest.mock('@/components/immersive-viewer-chrome', () => {
  const React = jest.requireActual('react');
  const { Text: MockText, View: MockView } = jest.requireActual('react-native');
  return {
    ImmersiveViewerChrome: (props: {
      headerVisible: boolean;
      title: string;
    }) => (
      <MockView
        accessibilityState={{ expanded: props.headerVisible }}
        testID="viewer-chrome">
        <MockText>{props.title}</MockText>
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

jest.mock('@/services/library-favourites', () => ({
  readFavouritePaths: async () => new Set<string>(),
}));

jest.mock('@/services/library-files', () => ({
  getLibraryFile: (_folderId: string, path: string) => ({ exists: true, uri: `file:///${path}` }),
  getLibraryFileKind: (file: { uri: string }) => (file.uri.endsWith('.jpg') ? 'image' : 'text'),
  listDirectory: () => [
    {
      childCount: null,
      kind: 'image',
      name: 'Page 10.jpg',
      relativePath: 'Page 10.jpg',
      size: 10,
    },
    {
      childCount: null,
      kind: 'text',
      name: 'Notes.txt',
      relativePath: 'Notes.txt',
      size: 10,
    },
    {
      childCount: null,
      kind: 'image',
      name: 'Page 2.jpg',
      relativePath: 'Page 2.jpg',
      size: 10,
    },
  ],
}));

describe('ImageScreen', () => {
  beforeEach(() => {
    mockGoToIndex.mockClear();
    mockViewerProps = null;
    mockZoomHandler = null;
  });

  test('opens the selected image within the naturally ordered sibling gallery', async () => {
    const view = await render(<ImageScreen />);

    await view.findByTestId('image-viewer');

    expect(mockViewerProps?.initialIndex).toBe(1);
    expect(mockViewerProps?.ListComponent).toBeUndefined();
    expect(view.getByText('Page 10.jpg')).toBeTruthy();
    expect(view.getByText('2 / 2')).toBeTruthy();
    expect(view.getAllByRole('button')).toHaveLength(2);
    expect(view.getByLabelText('Image 2 of 2, Page 10.jpg')).toHaveStyle({
      bottom: 8,
      left: 8,
      position: 'absolute',
      right: 8,
      top: 8,
    });

    await fireEvent.press(view.getByRole('button', { name: 'Show image 1 of 2, Page 2.jpg' }));
    expect(mockGoToIndex).toHaveBeenCalledWith(0);
  });

  test('hides the viewer chrome while an image is zoomed', async () => {
    const view = await render(<ImageScreen />);

    await view.findByTestId('image-viewer');

    await act(() => mockZoomHandler?.({ scale: 2 }));

    await waitFor(() =>
      expect(view.getByTestId('viewer-chrome').props.accessibilityState).toEqual({ expanded: false }),
    );
  });
});
