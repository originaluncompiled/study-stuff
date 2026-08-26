import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import FolderScreen from '@/app/(tabs)/(library)/folder/[folderId]';

const mockPickAndCopyFiles = jest.fn(async (_folderId: string, _path?: string) => 2);
const mockPickAndCopyImages = jest.fn(async (_folderId: string, _path?: string) => 3);
const mockTakeAndCopyPhoto = jest.fn(async (_folderId: string, _path?: string) => 1);
const mockTouchFolder = jest.fn(async () => undefined);
const mockListDirectory = jest.fn();
const mockPush = jest.fn();
const mockDeleteEntry = jest.fn(
  (_folderId: string, _relativePath: string, _kind: string) => undefined,
);
const mockWriteFavouritePaths = jest.fn(
  async (_folderId: string, _paths: Set<string>) => undefined,
);
const mockCreateLibraryPdf = jest.fn(async (_options: unknown) => ({
  name: 'Scan.pdf',
  uri: 'file://Scan.pdf',
}));
let mockFavouritePaths = new Set<string>();
let mockStackOptions: { headerRight?: () => React.ReactNode; title?: string } | null = null;

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: { options: { headerRight?: () => React.ReactNode; title?: string } }) => {
      mockStackOptions = options;
      return options.headerRight?.() ?? null;
    },
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
  readFavouritePaths: async () => new Set(mockFavouritePaths),
  remapFavouritePaths: jest.fn(),
  removeFavouritePaths: (paths: Set<string>, removedPath: string) =>
    new Set(Array.from(paths).filter((path) => path !== removedPath)),
  writeFavouritePaths: (folderId: string, paths: Set<string>) =>
    mockWriteFavouritePaths(folderId, paths),
}));

jest.mock('@/services/library-files', () => ({
  createSubfolder: jest.fn(),
  createTextFile: jest.fn(),
  deleteEntry: (folderId: string, relativePath: string, kind: string) =>
    mockDeleteEntry(folderId, relativePath, kind),
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
    mockFavouritePaths = new Set();
    mockStackOptions = null;
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
      params: {
        folderId: 'folder-1',
        path: 'Chapter 1',
        selectedPaths: JSON.stringify(['Chapter 1/Scan.jpg']),
      },
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
    await fireEvent.press(view.getByRole('button', { name: 'Combine with other PDFs' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/(library)/pdf-composer',
      params: {
        folderId: 'folder-1',
        path: 'Chapter 1',
        selectedPaths: JSON.stringify(['Chapter 1/Notes.pdf']),
      },
    });
  });

  test('long press selects rows without changing favourite-first ordering', async () => {
    mockFavouritePaths = new Set(['Chapter 1/Notes.pdf']);
    mockListDirectory.mockReturnValue([
      {
        childCount: null,
        kind: 'image',
        name: 'Diagram.jpg',
        relativePath: 'Chapter 1/Diagram.jpg',
        size: 2048,
      },
      {
        childCount: null,
        kind: 'pdf',
        name: 'Notes.pdf',
        relativePath: 'Chapter 1/Notes.pdf',
        size: 4096,
      },
    ]);
    const view = await renderFolder();

    await flushFolderLoad();
    await fireEvent(
      view.getByRole('button', { name: 'Open Notes.pdf, Favourited' }),
      'longPress',
    );

    expect(mockStackOptions?.title).toBe('1 Selected');
    expect(
      view.getAllByRole('checkbox').map((checkbox) => checkbox.props.accessibilityLabel),
    ).toEqual(['Deselect Notes.pdf', 'Select Diagram.jpg']);
    expect(view.queryByRole('button', { name: 'Manage Notes.pdf' })).toBeNull();

    await fireEvent.press(view.getByRole('checkbox', { name: 'Select Diagram.jpg' }));
    expect(mockStackOptions?.title).toBe('2 Selected');
    await fireEvent.press(view.getByRole('button', { name: 'Selected item actions' }));
    expect(view.getByRole('button', { name: 'Favourite' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Unfavourite' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Delete' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Combine into PDF' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/(library)/pdf-composer',
      params: {
        folderId: 'folder-1',
        path: 'Chapter 1',
        selectedPaths: JSON.stringify([
          'Chapter 1/Notes.pdf',
          'Chapter 1/Diagram.jpg',
        ]),
      },
    });
  });

  test('bulk favourites and unfavourites selected items', async () => {
    mockListDirectory.mockReturnValue([
      {
        childCount: null,
        kind: 'text',
        name: 'Notes.txt',
        relativePath: 'Chapter 1/Notes.txt',
        size: 2048,
      },
    ]);
    const view = await renderFolder();

    await flushFolderLoad();
    await fireEvent(view.getByRole('button', { name: 'Open Notes.txt' }), 'longPress');
    await fireEvent.press(view.getByRole('button', { name: 'Selected item actions' }));
    await fireEvent.press(view.getByRole('button', { name: 'Favourite' }));
    await waitFor(() => expect(mockWriteFavouritePaths).toHaveBeenCalledTimes(1));
    expect(Array.from(mockWriteFavouritePaths.mock.calls[0][1])).toEqual([
      'Chapter 1/Notes.txt',
    ]);
    expect(mockStackOptions?.title).toBe('Chapter 1');

    await fireEvent(
      view.getByRole('button', { name: 'Open Notes.txt, Favourited' }),
      'longPress',
    );
    await fireEvent.press(view.getByRole('button', { name: 'Selected item actions' }));
    await fireEvent.press(view.getByRole('button', { name: 'Unfavourite' }));
    await waitFor(() => expect(mockWriteFavouritePaths).toHaveBeenCalledTimes(2));
    expect(Array.from(mockWriteFavouritePaths.mock.calls[1][1])).toEqual([]);
  });

  test('rejects incompatible PDF selections and confirms bulk deletion', async () => {
    mockListDirectory.mockReturnValue([
      {
        childCount: 2,
        kind: 'directory',
        name: 'References',
        relativePath: 'Chapter 1/References',
        size: null,
      },
    ]);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const view = await renderFolder();

    await flushFolderLoad();
    await fireEvent(
      view.getByRole('button', { name: 'Open References, 2 items' }),
      'longPress',
    );
    await fireEvent.press(view.getByRole('button', { name: 'Selected item actions' }));
    await fireEvent.press(view.getByRole('button', { name: 'Combine into PDF' }));
    expect(alertSpy).toHaveBeenCalledWith(
      'Some items cannot be combined',
      'Select only images and PDFs to create a combined PDF.',
    );
    expect(mockPush).not.toHaveBeenCalled();

    await fireEvent.press(view.getByRole('button', { name: 'Selected item actions' }));
    await fireEvent.press(view.getByRole('button', { name: 'Delete' }));
    const confirmationButtons = alertSpy.mock.calls.at(-1)?.[2];
    const destructiveAction = confirmationButtons?.find((button) => button.style === 'destructive');
    await act(async () => destructiveAction?.onPress?.());

    expect(mockDeleteEntry).toHaveBeenCalledWith(
      'folder-1',
      'Chapter 1/References',
      'directory',
    );
    alertSpy.mockRestore();
  });
});
