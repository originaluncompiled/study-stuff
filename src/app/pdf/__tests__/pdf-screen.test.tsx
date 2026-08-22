import { act, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PdfScreen from '@/app/pdf/[folderId]';

function mockStackScreen({ options }: { options: object }) {
  return <View {...{ options }} testID="stack-screen-options" />;
}

function mockPdf(props: object) {
  return <View {...props} testID="pdf-viewer" />;
}

jest.mock('expo-router', () => ({
  Stack: { Screen: mockStackScreen },
  useLocalSearchParams: () => ({ folderId: 'folder-1', path: 'Biology.pdf' }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('react-native-pdf', () => ({ __esModule: true, default: mockPdf }));

jest.mock('@/services/library-files', () => ({
  getPdfFile: () => ({ exists: true, uri: 'file:///Biology.pdf' }),
}));

describe('PdfScreen', () => {
  test('animates an overlay header without resizing the PDF viewport', async () => {
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 47 },
        }}>
        <PdfScreen />
      </SafeAreaProvider>,
    );
    const pdf = await view.findByTestId('pdf-viewer');

    expect(view.getByTestId('stack-screen-options').props.options.headerShown).toBe(false);
    expect(view.getByTestId('pdf-header').props.className).toContain('absolute');
    const initialPdfStyle = pdf.props.style;

    await act(async () => {
      pdf.props.onPageChanged(2);
    });

    expect(view.getByTestId('stack-screen-options').props.options.headerShown).toBe(false);
    const hiddenHeader = view.getByTestId('pdf-header', { includeHiddenElements: true });
    expect(hiddenHeader.props.pointerEvents).toBe('none');
    await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
    expect(hiddenHeader).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: -103 }],
    });

    await act(async () => {
      pdf.props.onPageChanged(1);
    });
    const visibleHeader = view.getByTestId('pdf-header');
    expect(visibleHeader.props.pointerEvents).toBe('auto');
    await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
    expect(visibleHeader).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
    expect(view.getByTestId('pdf-viewer').props.style).toEqual(initialPdfStyle);
  });
});
