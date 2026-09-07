import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LibraryScreen from '@/app/(tabs)/(library)';

type MockGridItem =
  | { type: 'add' }
  | {
      type: 'folder';
      folder: { id: string };
    };

const mockExportLibraryFolder = jest.fn(async (_folderId: string, _folderName: string) => 1);
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Error: 'error', Success: 'success' },
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
}));

jest.mock('react-native-sortables', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: {
      Grid: ({
        data,
        keyExtractor,
        renderItem,
      }: {
        data: MockGridItem[];
        keyExtractor: (item: MockGridItem) => string;
        renderItem: (info: { index: number; item: MockGridItem }) => React.ReactNode;
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
  exportLibraryFolder: (folderId: string, folderName: string) =>
    mockExportLibraryFolder(folderId, folderName),
}));

jest.mock('@/store/library-store', () => ({
  useLibraryStore: (selector: (state: object) => unknown) =>
    selector({
      createFolder: jest.fn(),
      deleteFolder: jest.fn(),
      folders: [
        {
          color: 'purple',
          createdAt: '2026-08-25T00:00:00.000Z',
          id: 'folder-1',
          name: 'Biology',
          updatedAt: '2026-08-25T00:00:00.000Z',
        },
      ],
      hydrationError: null,
      importFolder: jest.fn(),
      renameFolder: jest.fn(),
      reorderFolders: jest.fn(),
      setFolderColor: jest.fn(),
    }),
}));

function renderLibrary() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 34, left: 0, right: 0, top: 47 },
      }}>
      <LibraryScreen />
    </SafeAreaProvider>,
  );
}

describe('LibraryScreen folder export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exports a main folder from below the colour action', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const view = await renderLibrary();

    await fireEvent.press(view.getByRole('button', { name: 'Manage Biology' }));

    const panel = view.getByTestId('action-sheet-panel');
    const sheetButtons = within(panel).getAllByRole('button');
    const exportAction = view.getByRole('button', { name: 'Export files' });
    const colorAction = view.getByRole('button', { name: 'Change colour' });
    expect(sheetButtons.indexOf(exportAction)).toBeGreaterThan(sheetButtons.indexOf(colorAction));

    await fireEvent.press(exportAction);

    await waitFor(() =>
      expect(mockExportLibraryFolder).toHaveBeenCalledWith('folder-1', 'Biology'),
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Export complete',
      '“Biology” was saved to the selected folder.',
    );
    alertSpy.mockRestore();
  });
});
