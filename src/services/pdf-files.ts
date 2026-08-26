import { PDFDocument } from '@cantoo/pdf-lib';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

import { getAvailableFileName, normalizePdfName } from '@/lib/names';
import { getDirectory } from '@/services/library-files';

export type PdfSourceFile = {
  kind: 'image' | 'pdf';
  name: string;
  uri: string;
};

type CreatePdfOptions = {
  folderId: string;
  outputName: string;
  path?: string;
  sources: PdfSourceFile[];
  onProgress?: (completed: number, total: number) => void;
};

type CreatedPdf = {
  name: string;
  uri: string;
};

async function appendImage(document: PDFDocument, source: PdfSourceFile) {
  const sourceImage = await Image.loadAsync(source.uri);
  let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
  let renderedImage: ImageRef | undefined;
  let normalizedFile: File | undefined;

  try {
    context = ImageManipulator.manipulate(sourceImage);
    renderedImage = await context.renderAsync();
    const normalized = await renderedImage.saveAsync({
      compress: 0.7,
      format: SaveFormat.JPEG,
    });
    normalizedFile = new File(normalized.uri);

    const embeddedImage = await document.embedJpg(await normalizedFile.bytes());
    const page = document.addPage([normalized.width, normalized.height]);
    page.drawImage(embeddedImage, {
      height: normalized.height,
      width: normalized.width,
      x: 0,
      y: 0,
    });
  } finally {
    if (normalizedFile?.exists) {
      normalizedFile.delete();
    }
    renderedImage?.release();
    context?.release();
    sourceImage.release();
  }
}

async function appendPdf(document: PDFDocument, source: PdfSourceFile) {
  const sourceDocument = await PDFDocument.load(await new File(source.uri).bytes());
  const pages = await document.copyPages(sourceDocument, sourceDocument.getPageIndices());
  pages.forEach((page) => document.addPage(page));
}

export async function createLibraryPdf({
  folderId,
  outputName,
  path,
  sources,
  onProgress,
}: CreatePdfOptions): Promise<CreatedPdf> {
  if (sources.length === 0) {
    throw new Error('Choose at least one file.');
  }

  const directory = getDirectory(folderId, path);
  const name = getAvailableFileName(
    normalizePdfName(outputName),
    directory.list().map((entry) => entry.name),
  );
  const output = new File(directory, name);
  const temporary = new File(directory, `.pdf-${randomUUID()}.tmp`);
  const document = await PDFDocument.create();

  for (const [index, source] of sources.entries()) {
    if (source.kind === 'image') {
      await appendImage(document, source);
    } else {
      await appendPdf(document, source);
    }
    onProgress?.(index + 1, sources.length);
  }

  try {
    temporary.create();
    temporary.write(await document.save());
    await temporary.move(output);
  } catch (error) {
    if (temporary.exists) {
      temporary.delete();
    }
    throw error;
  }

  return { name, uri: output.uri };
}
