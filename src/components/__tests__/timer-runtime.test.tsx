import * as Haptics from 'expo-haptics';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TimerRuntime } from '@/components/timer-runtime';
import { createDefaultTimerState, reconcileTimerState } from '@/lib/timer';
import { useTimerStore } from '@/store/timer-store';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
}));

const selectionAsyncMock = Haptics.selectionAsync as jest.MockedFunction<
  typeof Haptics.selectionAsync
>;

function renderRuntime() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 34, left: 0, right: 0, top: 47 },
      }}>
      <TimerRuntime />
    </SafeAreaProvider>,
  );
}

describe('TimerRuntime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    useTimerStore.setState({
      ...reconcileTimerState(createDefaultTimerState(), Date.now()),
      hydrated: true,
      hydrationError: null,
      persistenceError: null,
    });
    selectionAsyncMock.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('asks whether to continue after skipping rest', async () => {
    useTimerStore.setState({
      status: 'running',
      phase: 'study',
      deadlineAtMs: Date.now() + 1000,
      remainingMs: null,
      secondsRemaining: 1,
    });
    const view = await renderRuntime();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(view.getByRole('header', { name: 'Time to rest' })).toBeTruthy();
    expect(view.getByLabelText('Rest time remaining, 5:00')).toBeTruthy();
    expect(view.getByTestId('rest-timer-panel').props.className).toContain('max-w-lg');
    expect(selectionAsyncMock).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'Pause Rest Timer' }));
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(view.getByLabelText('Rest time remaining, 5:00')).toBeTruthy();
    expect(selectionAsyncMock).toHaveBeenCalledTimes(2);

    await fireEvent.press(view.getByRole('button', { name: 'Resume Rest Timer' }));
    await fireEvent.press(view.getByRole('button', { name: 'Skip Rest' }));

    expect(view.queryByTestId('rest-timer-dialog')).toBeNull();
    expect(view.getByRole('header', { name: 'Rest complete' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Continue Studying' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Stop Session' })).toBeTruthy();
    expect(useTimerStore.getState()).toMatchObject({
      status: 'awaitingContinuation',
      phase: 'rest',
    });
    expect(selectionAsyncMock).toHaveBeenCalledTimes(4);
  });

  test('uses selection feedback for study start, pause, resume, and reset', async () => {
    await renderRuntime();

    await act(async () => {
      await useTimerStore.getState().start(Date.now());
    });
    expect(selectionAsyncMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await useTimerStore.getState().pause(Date.now());
    });
    expect(selectionAsyncMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      await useTimerStore.getState().resume(Date.now());
    });
    expect(selectionAsyncMock).toHaveBeenCalledTimes(3);

    await act(async () => {
      await useTimerStore.getState().reset();
    });
    expect(selectionAsyncMock).toHaveBeenCalledTimes(4);
  });

  test('can dismiss the rest popup without ending the rest timer', async () => {
    useTimerStore.setState({
      status: 'running',
      phase: 'rest',
      deadlineAtMs: Date.now() + 5 * 60_000,
      remainingMs: null,
      secondsRemaining: 300,
    });
    const view = await renderRuntime();

    await fireEvent.press(view.getByRole('button', { name: 'Close Rest Timer' }));

    expect(view.queryByTestId('rest-timer-dialog')).toBeNull();
    expect(useTimerStore.getState()).toMatchObject({ status: 'running', phase: 'rest' });
    expect(selectionAsyncMock).not.toHaveBeenCalled();
  });

  test('asks to continue when rest ends and starts another study cycle', async () => {
    useTimerStore.setState({
      status: 'running',
      phase: 'rest',
      deadlineAtMs: Date.now() + 1000,
      remainingMs: null,
      secondsRemaining: 1,
    });
    const view = await renderRuntime();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(view.getByRole('header', { name: 'Rest complete' })).toBeTruthy();
    expect(view.queryByTestId('rest-timer-dialog')).toBeNull();
    expect(view.getByTestId('session-complete-panel').props.className).toContain('max-w-lg');
    expect(useTimerStore.getState().status).toBe('awaitingContinuation');
    expect(selectionAsyncMock).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'Continue Studying' }));

    expect(view.queryByTestId('session-complete-dialog')).toBeNull();
    expect(useTimerStore.getState()).toMatchObject({
      status: 'running',
      phase: 'study',
      secondsRemaining: 1500,
    });
    expect(selectionAsyncMock).toHaveBeenCalledTimes(2);
  });

  test('stops the session from the rest-complete prompt', async () => {
    useTimerStore.setState({
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
      secondsRemaining: 0,
    });
    const view = await renderRuntime();

    await fireEvent.press(view.getByRole('button', { name: 'Stop Session' }));

    expect(view.queryByTestId('session-complete-dialog')).toBeNull();
    expect(useTimerStore.getState()).toMatchObject({
      status: 'idle',
      phase: 'study',
      studyMinutes: 25,
      restMinutes: 5,
    });
    expect(selectionAsyncMock).toHaveBeenCalledTimes(1);
  });
});
