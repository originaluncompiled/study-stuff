import { createLibraryPdf } from '@/services/pdf-files';

const mockFileContents = new Map<string, Uint8Array>();
const mockExistingNames: string[] = [];
const mockDrawImage = jest.fn();
const mockImagePage = { drawImage: mockDrawImage };
const mockCopiedPage = { copied: true };
const mockEmbeddedImage = { embedded: true };
const mockAddPage = jest.fn((pageOrSize: unknown) =>
  Array.isArray(pageOrSize) ? mockImagePage : pageOrSize,
);
const mockEmbedJpg = jest.fn(async () => mockEmbeddedImage);
const mockCopyPages = jest.fn(async () => [mockCopiedPage]);
const mockSave = jest.fn(async () => new Uint8Array([8, 9, 10]));
const mockCreateDocument = jest.fn(async () => ({
  addPage: mockAddPage,
  copyPages: mockCopyPages,
  embedJpg: mockEmbedJpg,
  save: mockSave,
}));
const mockSourceDocument = { getPageIndices: () => [0, 1] };
const mockLoadDocument = jest.fn(async (_bytes: Uint8Array) => mockSourceDocument);
const mockRenderedRelease = jest.fn();
const mockContextRelease = jest.fn();
const mockSourceImageRelease = jest.fn();
const mockSourceImage = { release: mockSourceImageRelease };
const mockLoadImage = jest.fn(async (_uri: string) => mockSourceImage);
const mockSaveImage = jest.fn(async () => ({
  height: 480,
  uri: 'file:///cache/normalized.jpg',
  width: 640,
}));
const mockRenderImage = jest.fn(async () => ({
  release: mockRenderedRelease,
  saveAsync: mockSaveImage,
}));
const mockManipulate = jest.fn((_uri: string) => ({
  release: mockContextRelease,
  renderAsync: mockRenderImage,
}));

class MockFile {
  uri: string;

  constructor(base: string | { uri: string }, ...parts: string[]) {
    const baseUri = typeof base === 'string' ? base : base.uri;
    this.uri = parts.length > 0 ? `${baseUri.replace(/\/$/, '')}/${parts.join('/')}` : baseUri;
  }

  get exists() {
    return mockFileContents.has(this.uri);
  }

  async bytes() {
    const bytes = mockFileContents.get(this.uri);
    if (!bytes) {
      throw new Error(`Missing test file: ${this.uri}`);
    }
    return bytes;
  }

  create() {
    mockFileContents.set(this.uri, new Uint8Array());
  }

  delete() {
    mockFileContents.delete(this.uri);
  }

  async move(destination: MockFile) {
    const bytes = mockFileContents.get(this.uri);
    if (!bytes) {
      throw new Error('Missing temporary output.');
    }
    mockFileContents.set(destination.uri, bytes);
    mockFileContents.delete(this.uri);
    this.uri = destination.uri;
  }

  write(bytes: Uint8Array) {
    mockFileContents.set(this.uri, bytes);
  }
}

jest.mock('@cantoo/pdf-lib', () => ({
  PDFDocument: {
    create: () => mockCreateDocument(),
    load: (bytes: Uint8Array) => mockLoadDocument(bytes),
  },
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid' }));

jest.mock('expo-file-system', () => ({
  File: function File(base: string | { uri: string }, ...parts: string[]) {
    return new MockFile(base, ...parts);
  },
}));

jest.mock('expo-image', () => ({
  Image: { loadAsync: (uri: string) => mockLoadImage(uri) },
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (uri: string) => mockManipulate(uri) },
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('@/services/library-files', () => ({
  getDirectory: () => ({
    list: () => mockExistingNames.map((name) => ({ name })),
    uri: 'file:///library',
  }),
}));

describe('createLibraryPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileContents.clear();
    mockExistingNames.splice(0);
    mockFileContents.set('file:///cache/normalized.jpg', new Uint8Array([1, 2, 3]));
    mockFileContents.set('file:///library/source.pdf', new Uint8Array([4, 5, 6]));
  });

  test('adds image-sized pages and preserves PDF page blocks in source order', async () => {
    mockExistingNames.push('Combined.pdf', 'Combined (2).pdf');
    const onProgress = jest.fn();

    const result = await createLibraryPdf({
      folderId: '03f6be86-2a4b-4e70-9ff3-e5ae59526336',
      outputName: 'Combined',
      path: 'Chapter 1',
      sources: [
        { kind: 'image', name: 'Scan.jpg', uri: 'file:///library/Scan.jpg' },
        { kind: 'pdf', name: 'source.pdf', uri: 'file:///library/source.pdf' },
      ],
      onProgress,
    });

    expect(mockSaveImage).toHaveBeenCalledWith({ compress: 0.7, format: 'jpeg' });
    expect(mockLoadImage).toHaveBeenCalledWith('file:///library/Scan.jpg');
    expect(mockManipulate).toHaveBeenCalledWith(mockSourceImage);
    expect(mockEmbedJpg).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    expect(mockAddPage.mock.calls).toEqual([[[640, 480]], [mockCopiedPage]]);
    expect(mockDrawImage).toHaveBeenCalledWith(mockEmbeddedImage, {
      height: 480,
      width: 640,
      x: 0,
      y: 0,
    });
    expect(mockLoadDocument).toHaveBeenCalledWith(new Uint8Array([4, 5, 6]));
    expect(mockCopyPages).toHaveBeenCalledWith(mockSourceDocument, [0, 1]);
    expect(onProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
    expect(result).toEqual({
      name: 'Combined (3).pdf',
      uri: 'file:///library/Combined (3).pdf',
    });
    expect(mockFileContents.get(result.uri)).toEqual(new Uint8Array([8, 9, 10]));
    expect(mockFileContents.has('file:///library/.pdf-test-uuid.tmp')).toBe(false);
    expect(mockFileContents.has('file:///cache/normalized.jpg')).toBe(false);
    expect(mockRenderedRelease).toHaveBeenCalled();
    expect(mockContextRelease).toHaveBeenCalled();
    expect(mockSourceImageRelease).toHaveBeenCalled();
  });

  test('rejects an empty selection before creating a document', async () => {
    await expect(
      createLibraryPdf({
        folderId: '03f6be86-2a4b-4e70-9ff3-e5ae59526336',
        outputName: 'Combined',
        sources: [],
      }),
    ).rejects.toThrow('Choose at least one file.');
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  test('removes the temporary output if saving fails', async () => {
    mockSave.mockRejectedValueOnce(new Error('Could not save'));

    await expect(
      createLibraryPdf({
        folderId: '03f6be86-2a4b-4e70-9ff3-e5ae59526336',
        outputName: 'Combined',
        sources: [{ kind: 'pdf', name: 'source.pdf', uri: 'file:///library/source.pdf' }],
      }),
    ).rejects.toThrow('Could not save');
    expect(mockFileContents.has('file:///library/.pdf-test-uuid.tmp')).toBe(false);
    expect(mockFileContents.has('file:///library/Combined.pdf')).toBe(false);
  });
});
