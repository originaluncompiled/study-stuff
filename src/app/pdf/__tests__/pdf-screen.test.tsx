import { act, fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet, View } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PdfScreen from '@/app/pdf/[folderId]';
import { colors } from '@/constants/theme';
import { createDefaultTimerState, reconcileTimerState } from '@/lib/timer';
import { useTimerStore } from '@/store/timer-store';

function mockStackScreen({ options }: { options: object }) {
  return <View {...{ options }} testID="stack-screen-options" />;
}

function mockStatusBar(props: object) {
  return <View {...props} testID="pdf-status-bar" />;
}

const mockSetPage = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: mockStackScreen },
  useLocalSearchParams: () => ({ folderId: 'folder-1', path: 'Biology.pdf' }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: mockStatusBar }));

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
    useTimerStore.setState({
      ...reconcileTimerState(createDefaultTimerState(), 0),
      hydrated: true,
      hydrationError: null,
      persistenceError: null,
    });
  });

  test('floats the active countdown below the header and opens timer controls', async () => {
    useTimerStore.setState({
      status: 'running',
      phase: 'study',
      deadlineAtMs: Date.now() + 25 * 60_000,
      remainingMs: null,
      secondsRemaining: 1500,
    });
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
    const timerPill = view.getByRole('button', {
      name: 'Study timer, 25:00 remaining. Open timer controls.',
    });
    expect(timerPill.props.className).toContain('bg-purple');
    expect(timerPill.props.className).toContain('h-11');
    expect(view.getByTestId('pdf-timer-running-icon')).toBeTruthy();
    expect(view.getByTestId('pdf-header')).toHaveStyle({ height: 85 });
    expect(view.getByTestId('pdf-timer-pill').props.className).toContain('absolute');
    expect(view.getByTestId('pdf-timer-pill')).toHaveStyle({ top: 97 });
    expect(view.getByTestId('pdf-viewport').props.style[0]).toMatchObject({
      height: Dimensions.get('window').height - 16,
      marginTop: 8,
    });

    await act(async () => {
      pdf.props.onPageChanged(2);
    });
    expect(view.queryByRole('button', { name: /Open timer controls/ })).toBeNull();
    expect(view.getByTestId('pdf-header', { includeHiddenElements: true }).props.pointerEvents).toBe(
      'none',
    );
    const hiddenTimerPill = view.getByTestId('pdf-timer-pill', { includeHiddenElements: true });
    expect(hiddenTimerPill.props.pointerEvents).toBe('none');
    await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
    expect(hiddenTimerPill).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: -85 }],
    });

    await act(async () => {
      pdf.props.onPageChanged(1);
    });

    await fireEvent.press(view.getByRole('button', { name: /Open timer controls/ }));
    expect(view.getByRole('header', { name: 'Study timer' })).toBeTruthy();
    expect(view.getByText('25:00 remaining')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Pause Timer' }));
    expect(useTimerStore.getState().status).toBe('paused');
    expect(view.getByTestId('pdf-timer-paused-icon')).toBeTruthy();
    expect(view.queryByTestId('pdf-timer-running-icon')).toBeNull();

    await fireEvent.press(
      view.getByRole('button', {
        name: /Study timer paused, .* remaining\. Open timer controls\./,
      }),
    );
    await fireEvent.press(view.getByRole('button', { name: 'Stop Timer' }));
    expect(useTimerStore.getState().status).toBe('idle');
    expect(view.queryByRole('button', { name: /Open timer controls/ })).toBeNull();
  });

  test('uses a coffee icon while the rest timer is running', async () => {
    useTimerStore.setState({
      status: 'running',
      phase: 'rest',
      deadlineAtMs: Date.now() + 5 * 60_000,
      remainingMs: null,
      secondsRemaining: 300,
    });
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 47 },
        }}>
        <PdfScreen />
      </SafeAreaProvider>,
    );

    await view.findByTestId('pdf-viewer');
    expect(view.getByTestId('pdf-timer-rest-icon')).toBeTruthy();
    expect(view.queryByTestId('pdf-timer-running-icon')).toBeNull();
  });

  test('keeps the rendered pages away from the screen edges', async () => {
    const { height, width } = Dimensions.get('window');
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 47 },
        }}>
        <PdfScreen />
      </SafeAreaProvider>,
    );

    await view.findByTestId('pdf-viewer');
    expect(view.getByTestId('pdf-viewport').props.style[0]).toMatchObject({
      height: height - 16,
      marginBottom: 8,
      marginHorizontal: 8,
      marginTop: 8,
      width: width - 16,
    });
  });

  test('hides the overlay header without resizing the PDF viewport', async () => {
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
    expect(view.getByTestId('stack-screen-options').props.options).not.toHaveProperty(
      'statusBarHidden',
    );
    expect(view.getByTestId('stack-screen-options').props.options).not.toHaveProperty(
      'statusBarStyle',
    );
    expect(view.getByTestId('pdf-status-bar').props.hidden).toBe(false);
    expect(view.getByTestId('pdf-header').props.className).toContain('absolute');
    const initialViewportLayout = view.getByTestId('pdf-viewport').props.style[0];

    await act(async () => {
      pdf.props.onPageChanged(2);
    });

    expect(view.getByTestId('stack-screen-options').props.options.headerShown).toBe(false);
    expect(view.getByTestId('pdf-status-bar').props.hidden).toBe(true);
    expect(view.getByTestId('pdf-viewport').props.style[0]).toEqual(initialViewportLayout);
    const hiddenHeader = view.getByTestId('pdf-header', { includeHiddenElements: true });
    expect(hiddenHeader.props.pointerEvents).toBe('none');
    await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
    expect(hiddenHeader).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: -85 }],
    });

    await act(async () => {
      pdf.props.onPageChanged(1);
    });
    const visibleHeader = view.getByTestId('pdf-header');
    expect(view.getByTestId('pdf-status-bar').props.hidden).toBe(false);
    expect(visibleHeader.props.pointerEvents).toBe('auto');
    await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
    expect(visibleHeader).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
    expect(view.getByTestId('pdf-viewport').props.style[0]).toEqual(initialViewportLayout);
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
    expect(view.getByTestId('pdf-page-scrubber').props.pointerEvents).toBe('box-none');
    expect(view.getByTestId('pdf-page-scrubber-progress').props.className).toContain('h-[29px]');
    expect(view.getByTestId('pdf-page-scrubber-label').props.className).toContain('bg-white/45');
    expect(view.getByTestId('pdf-page-scrubber-handle').props.className).toContain(
      'h-12 w-[76px]',
    );
    expect(view.getByTestId('pdf-page-scrubber-handle').props.className).not.toContain('border');
    expect(view.getByRole('adjustable', { name: 'Page 1 of 10' })).toBeTruthy();

    await fireEvent(view.getByTestId('pdf-viewer-container'), 'touchMove');
    await fireEvent(view.getByTestId('pdf-viewer-container'), 'touchEnd');

    await act(async () => {
      pdf.props.onPageChanged(3, 10);
    });
    expect(view.getByRole('adjustable', { name: 'Page 3 of 10' })).toBeTruthy();
    expect(view.getByText('3 / 10').props.className).not.toContain('flex-1');
    expect(StyleSheet.flatten(view.getByText('3 / 10').props.style)).toMatchObject({
      fontFamily: 'DMSans_700Bold',
      fontWeight: '700',
      textShadowColor: colors.white,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 2,
    });
    expect(view.getByText('3 / 10').props.className).toContain('text-[15px]');

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
    await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
    expect(view.getByTestId('pdf-page-scrubber-progress')).toBeTruthy();
    expect(view.getByTestId('pdf-page-scrubber-label')).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ scaleX: 0 }],
    });
    await view.unmount();
  });
});
