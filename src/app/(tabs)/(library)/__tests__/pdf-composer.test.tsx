import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PdfComposerScreen from '@/app/(tabs)/(library)/pdf-composer';

const mockBack = jest.fn();
const mockTouchFolder = jest.fn(async () => undefined);
const mockCreateLibraryPdf = jest.fn(async (_options: unknown) => ({
  name: 'Study pack.pdf',
  uri: 'file:///library/Study pack.pdf',
}));
const mockEntries = [
  {
    childCount: null,
    kind: 'image',
    name: 'Page 2.jpg',
    relativePath: 'Chapter 1/Page 2.jpg',
    size: 2048,
  },
  {
    childCount: null,
    kind: 'pdf',
    name: 'Page 10.pdf',
    relativePath: 'Chapter 1/Page 10.pdf',
    size: 4096,
  },
];

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ folderId: 'folder-1', path: 'Chapter 1' }),
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-image', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Image: (props: object) => React.createElement(View, props) };
});

jest.mock('react-native-sortables', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: {
      Grid: ({ data, keyExtractor, renderItem }: {
        data: typeof mockEntries;
        keyExtractor: (item: (typeof mockEntries)[number]) => string;
        renderItem: (info: { index: number; item: (typeof mockEntries)[number] }) => React.ReactNode;
      }) =>
        React.createElement(
          View,
          null,
          data.map((item, index) =>
            React.createElement(
              View,
              { key: keyExtractor(item) },
              renderItem({ index, item }),
            ),
          ),
        ),
      Handle: ({ children }: { children: React.ReactNode }) => children,
    },
  };
});

jest.mock('@/services/library-files', () => ({
  getLibraryFile: (_folderId: string, path: string) => ({ uri: `file://${path}` }),
  listDirectory: () => mockEntries,
}));

jest.mock('@/services/pdf-files', () => ({
  createLibraryPdf: (options: unknown) => mockCreateLibraryPdf(options),
}));

jest.mock('@/store/library-store', () => ({
  useLibraryStore: (selector: (state: object) => unknown) =>
    selector({ touchFolder: mockTouchFolder }),
}));

function renderComposer() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 34, left: 0, right: 0, top: 47 },
      }}>
      <PdfComposerScreen />
    </SafeAreaProvider>,
  );
}

describe('PdfComposerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reorders whole files and creates a PDF from the selected order', async () => {
    const view = await renderComposer();

    expect(view.queryByText('Build your PDF')).toBeNull();
    expect(view.getByTestId('pdf-composer-footer').props.style).toEqual({
      bottom: 98,
      paddingBottom: 12,
    });
    await fireEvent(
      view.getByRole('adjustable', { name: 'Reorder Page 2.jpg' }),
      'accessibilityAction',
      { nativeEvent: { actionName: 'increment' } },
    );
    await fireEvent.press(view.getByRole('button', { name: 'Create PDF' }));
    await fireEvent.changeText(view.getByLabelText('PDF name'), 'Study pack');
    await fireEvent.press(view.getAllByRole('button', { name: 'Create PDF' }).at(-1)!);

    await waitFor(() =>
      expect(mockCreateLibraryPdf).toHaveBeenCalledWith({
        folderId: 'folder-1',
        onProgress: expect.any(Function),
        outputName: 'Study pack',
        path: 'Chapter 1',
        sources: [
          {
            kind: 'pdf',
            name: 'Page 10.pdf',
            uri: 'file://Chapter 1/Page 10.pdf',
          },
          {
            kind: 'image',
            name: 'Page 2.jpg',
            uri: 'file://Chapter 1/Page 2.jpg',
          },
        ],
      }),
    );
    expect(mockTouchFolder).toHaveBeenCalledWith('folder-1');
    expect(mockBack).toHaveBeenCalled();
  });

  test('excludes unchecked files', async () => {
    const view = await renderComposer();

    await fireEvent.press(view.getByRole('checkbox', { name: 'Remove Page 10.pdf' }));
    expect(view.getByText('1 file selected')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Create PDF' }));
    await fireEvent.press(view.getAllByRole('button', { name: 'Create PDF' }).at(-1)!);

    await waitFor(() =>
      expect(mockCreateLibraryPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          sources: [
            {
              kind: 'image',
              name: 'Page 2.jpg',
              uri: 'file://Chapter 1/Page 2.jpg',
            },
          ],
        }),
      ),
    );
  });
});
