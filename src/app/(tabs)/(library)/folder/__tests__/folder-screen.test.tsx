import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import FolderScreen from '@/app/(tabs)/(library)/folder/[folderId]';

const mockPickAndCopyFiles = jest.fn(async (_folderId: string, _path?: string) => 2);
const mockPickAndCopyImages = jest.fn(async (_folderId: string, _path?: string) => 3);
const mockTakeAndCopyPhoto = jest.fn(async (_folderId: string, _path?: string) => 1);
const mockTouchFolder = jest.fn(async () => undefined);
const mockListDirectory = jest.fn();
const mockPush = jest.fn();
const mockCreateLibraryPdf = jest.fn(async (_options: unknown) => ({
  name: 'Scan.pdf',
  uri: 'file://Scan.pdf',
}));

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: { options: { headerRight?: () => React.ReactNode } }) =>
      options.headerRight?.() ?? null,
  },
  useLocalSearchParams: () => ({ folderId: 'folder-1', path: 'Chapter 1' }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(callback, [callback]);
  },
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
}));

jest.mock('@/services/library-favourites', () => ({
  readFavouritePaths: async () => new Set<string>(),
  remapFavouritePaths: jest.fn(),
  removeFavouritePaths: jest.fn(),
  writeFavouritePaths: jest.fn(async () => undefined),
}));

jest.mock('@/services/library-files', () => ({
  createSubfolder: jest.fn(),
  createTextFile: jest.fn(),
  deleteEntry: jest.fn(),
  getLibraryFile: (_folderId: string, path: string) => ({ uri: `file://${path}` }),
  listDirectory: () => mockListDirectory(),
  pickAndCopyFiles: (folderId: string, path?: string) => mockPickAndCopyFiles(folderId, path),
  pickAndCopyImages: (folderId: string, path?: string) => mockPickAndCopyImages(folderId, path),
  renameEntry: jest.fn(),
  takeAndCopyPhoto: (folderId: string, path?: string) => mockTakeAndCopyPhoto(folderId, path),
}));

jest.mock('@/services/pdf-files', () => ({
  createLibraryPdf: (options: unknown) => mockCreateLibraryPdf(options),
}));

jest.mock('@/store/library-store', () => ({
  useLibraryStore: (selector: (state: object) => unknown) =>
    selector({
      folders: [
        {
          color: 'purple',
          createdAt: '2026-08-25T00:00:00.000Z',
          id: 'folder-1',
          name: 'Biology',
          updatedAt: '2026-08-25T00:00:00.000Z',
        },
      ],
      touchFolder: mockTouchFolder,
    }),
}));

function renderFolder() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 34, left: 0, right: 0, top: 47 },
      }}>
      <FolderScreen />
    </SafeAreaProvider>,
  );
}

async function flushFolderLoad() {
  await act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  });
}

describe('FolderScreen imports', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockListDirectory.mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('offers multi-file, multi-image, and compact camera actions', async () => {
    const view = await renderFolder();

    await flushFolderLoad();
    await view.findByText('Nothing here yet');
    await fireEvent.press(view.getByRole('button', { name: 'Add to folder' }));

    expect(view.getByText('Add PDFs or text files from device storage.')).toBeTruthy();
    expect(view.queryByText('Add a PDF, image or text file from device storage.')).toBeNull();
    expect(view.getByRole('button', { name: /^Import file\(s\)/ })).toBeTruthy();
    const imageAction = view.getByRole('button', { name: /^Import image\(s\)/ });
    expect(imageAction.parent?.props.className).toBe('flex-1');
    const cameraAction = view.getByRole('button', { name: 'Take picture' });
    expect(cameraAction.props.className).toContain('aspect-square');
    expect(cameraAction.props.className).toContain('self-stretch');
    expect(view.getByTestId('camera-action-icon-background').props.className).toContain(
      'bg-paper-raised',
    );

    await fireEvent.press(view.getByRole('button', { name: /^Import image\(s\)/ }));
    await waitFor(() =>
      expect(mockPickAndCopyImages).toHaveBeenCalledWith('folder-1', 'Chapter 1'),
    );
    await flushFolderLoad();

    await fireEvent.press(view.getByRole('button', { name: 'Add to folder' }));
    await fireEvent.press(view.getByRole('button', { name: /^Import file\(s\)/ }));
    await waitFor(() =>
      expect(mockPickAndCopyFiles).toHaveBeenCalledWith('folder-1', 'Chapter 1'),
    );
    await flushFolderLoad();

    await fireEvent.press(view.getByRole('button', { name: 'Add to folder' }));
    await fireEvent.press(view.getByRole('button', { name: 'Take picture' }));
    await waitFor(() =>
      expect(mockTakeAndCopyPhoto).toHaveBeenCalledWith('folder-1', 'Chapter 1'),
    );
    await flushFolderLoad();
  });

  test('offers single and multi-file conversion for images', async () => {
    mockListDirectory.mockReturnValue([
      {
        childCount: null,
        kind: 'image',
        name: 'Scan.jpg',
        relativePath: 'Chapter 1/Scan.jpg',
        size: 2048,
      },
    ]);
    const view = await renderFolder();

    await flushFolderLoad();
    await fireEvent.press(view.getByRole('button', { name: 'Manage Scan.jpg' }));
    await fireEvent.press(view.getByRole('button', { name: 'Convert to PDF' }));

    expect(view.getByRole('button', { name: 'Just this image' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: /^Multiple files in this folder/ }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/(library)/pdf-composer',
      params: { folderId: 'folder-1', path: 'Chapter 1' },
    });
  });

  test('creates a PDF from one image', async () => {
    mockListDirectory.mockReturnValue([
      {
        childCount: null,
        kind: 'image',
        name: 'Scan.jpg',
        relativePath: 'Chapter 1/Scan.jpg',
        size: 2048,
      },
    ]);
    const view = await renderFolder();

    await flushFolderLoad();
    await fireEvent.press(view.getByRole('button', { name: 'Manage Scan.jpg' }));
    await fireEvent.press(view.getByRole('button', { name: 'Convert to PDF' }));
    await fireEvent.press(view.getByRole('button', { name: 'Just this image' }));
    await fireEvent.changeText(view.getByLabelText('PDF name'), 'Lecture scan');
    await fireEvent.press(view.getByRole('button', { name: 'Create PDF' }));

    await waitFor(() =>
      expect(mockCreateLibraryPdf).toHaveBeenCalledWith({
        folderId: 'folder-1',
        outputName: 'Lecture scan',
        path: 'Chapter 1',
        sources: [
          {
            kind: 'image',
            name: 'Scan.jpg',
            uri: 'file://Chapter 1/Scan.jpg',
          },
        ],
      }),
    );
  });

  test('offers PDF combining for PDF files', async () => {
    mockListDirectory.mockReturnValue([
      {
        childCount: null,
        kind: 'pdf',
        name: 'Notes.pdf',
        relativePath: 'Chapter 1/Notes.pdf',
        size: 2048,
      },
    ]);
    const view = await renderFolder();

    await flushFolderLoad();
    await fireEvent.press(view.getByRole('button', { name: 'Manage Notes.pdf' }));
    await fireEvent.press(view.getByRole('button', { name: 'Combine with other files' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/(library)/pdf-composer',
      params: { folderId: 'folder-1', path: 'Chapter 1' },
    });
  });
});
