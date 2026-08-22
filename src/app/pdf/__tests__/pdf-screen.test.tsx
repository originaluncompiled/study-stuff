import { act, fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PdfScreen from '@/app/pdf/[folderId]';

function mockStackScreen({ options }: { options: object }) {
  return <View {...{ options }} testID="stack-screen-options" />;
}

const mockSetPage = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: mockStackScreen },
  useLocalSearchParams: () => ({ folderId: 'folder-1', path: 'Biology.pdf' }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('react-native-pdf', () => {
  const React = jest.requireActual('react');
  const { View: MockView } = jest.requireActual('react-native');
  const MockPdf = React.forwardRef((props: object, ref: object) => {
    React.useImperativeHandle(ref, () => ({ setPage: mockSetPage }));
    return <MockView {...props} testID="pdf-viewer" />;
  });
  MockPdf.displayName = 'MockPdf';
  return {
    __esModule: true,
    default: MockPdf,
  };
});

jest.mock('@/services/library-files', () => ({
  getPdfFile: () => ({ exists: true, uri: 'file:///Biology.pdf' }),
}));

describe('PdfScreen', () => {
  beforeEach(() => {
    mockSetPage.mockClear();
  });

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

  test('shows an idle-hiding page scrubber that jumps to the dragged page', async () => {
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

    await act(async () => {
      pdf.props.onLoadComplete(10);
    });
    expect(
      view.getByTestId('pdf-page-scrubber', { includeHiddenElements: true }).props.pointerEvents,
    ).toBe('none');

    await fireEvent(view.getByTestId('pdf-viewer-container'), 'touchMove');
    expect(view.getByRole('adjustable', { name: 'Page 1 of 10' })).toBeTruthy();
    await fireEvent(view.getByTestId('pdf-viewer-container'), 'touchEnd');

    await act(async () => {
      pdf.props.onPageChanged(3, 10);
    });
    expect(view.getByRole('adjustable', { name: 'Page 3 of 10' })).toBeTruthy();
    expect(view.getByText('3 / 10')).toBeTruthy();

    const panGesture = getByGestureTestId('pdf-page-scrubber-pan');
    await act(async () => {
      fireGestureHandler(panGesture, [
        { state: State.BEGAN, translationY: 0 },
        { state: State.ACTIVE, translationY: 10_000 },
        { state: State.ACTIVE, translationY: 10_000 },
        { state: State.END, translationY: 10_000 },
      ]);
    });
    expect(mockSetPage).toHaveBeenCalledWith(10);
    expect(view.getByText('10 / 10')).toBeTruthy();

    await act(() => new Promise((resolve) => setTimeout(resolve, 1300)));
    expect(
      view.getByTestId('pdf-page-scrubber', { includeHiddenElements: true }).props.pointerEvents,
    ).toBe('none');
    await view.unmount();
  });
});
