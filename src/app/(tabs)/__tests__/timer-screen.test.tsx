import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TimerScreen from '@/app/(tabs)/timer';
import { TimerRuntime } from '@/components/timer-runtime';
import { createDefaultTimerState, reconcileTimerState } from '@/lib/timer';
import { useTimerStore } from '@/store/timer-store';

function renderTimer() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 34, left: 0, right: 0, top: 47 },
      }}>
      <TimerRuntime showDialogs={false} />
      <TimerScreen />
    </SafeAreaProvider>,
  );
}

describe('TimerScreen', () => {
  beforeEach(() => {
    useTimerStore.setState({
      ...reconcileTimerState(createDefaultTimerState(), 0),
      hydrated: true,
      hydrationError: null,
      persistenceError: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('changes durations in five-minute steps and enforces their limits', async () => {
    const view = await renderTimer();

    for (let press = 0; press < 19; press += 1) {
      await fireEvent.press(view.getByRole('button', { name: 'Increase Study Time' }));
    }
    expect(view.getByText('120:00')).toBeTruthy();
    expect(
      view.getByRole('button', { name: 'Increase Study Time' }).props.accessibilityState,
    ).toEqual({ disabled: true });

    for (let press = 0; press < 5; press += 1) {
      await fireEvent.press(view.getByRole('button', { name: 'Increase Rest Time' }));
    }
    expect(view.getByText('30m')).toBeTruthy();
    expect(
      view.getByRole('button', { name: 'Increase Rest Time' }).props.accessibilityState,
    ).toEqual({ disabled: true });

    for (let press = 0; press < 24; press += 1) {
      await fireEvent.press(view.getByRole('button', { name: 'Decrease Study Time' }));
    }
    for (let press = 0; press < 6; press += 1) {
      await fireEvent.press(view.getByRole('button', { name: 'Decrease Rest Time' }));
    }

    expect(view.getByText('0:00')).toBeTruthy();
    expect(view.getByText('0m')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Start Timer' }).props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  test('counts down and supports pause and resume', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const view = await renderTimer();

    expect(view.queryByText('Studying')).toBeNull();
    expect(view.getByText('5m')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Start Timer' }));
    expect(view.getByText('Studying')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Pause Timer' })).toBeTruthy();
    expect(view.queryByText('5m')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(view.getByText('24:59')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Pause Timer' }));
    expect(view.queryByText('5m')).toBeNull();
    expect(
      view.getByRole('button', { name: 'Increase Study Time' }).props.accessibilityState,
    ).toEqual({ disabled: true });
    expect(
      view.getByRole('button', { name: 'Increase Rest Time' }).props.accessibilityState,
    ).toEqual({ disabled: true });
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(view.getByText('24:59')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Resume Timer' }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(view.getByText('24:58')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Reset Timer' }));
    expect(view.getByText('25:00')).toBeTruthy();
    expect(view.queryByText('Studying')).toBeNull();
    expect(view.getByText('5m')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Start Timer' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Reset Timer' })).toBeNull();
    expect(
      view.getByRole('button', { name: 'Increase Study Time' }).props.accessibilityState,
    ).toEqual({ disabled: false });

    await view.unmount();
  });

  test('matches the colored action border to its shadow without changing the reset border', async () => {
    const view = await renderTimer();

    expect(view.getByTestId('study-clock-ring').props.className).toContain(
      'border-contrast-line',
    );
    expect(view.getByRole('button', { name: 'Start Timer' }).props.className).toContain(
      'border-offset-shadow',
    );

    await fireEvent.press(view.getByRole('button', { name: 'Start Timer' }));

    expect(view.getByRole('button', { name: 'Reset Timer' }).props.className).toContain(
      'border-strong-line',
    );
  });

  test('moves from study to rest and waits for a continuation choice', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-22T12:00:00Z'));
    const view = await renderTimer();

    for (let press = 0; press < 4; press += 1) {
      await fireEvent.press(view.getByRole('button', { name: 'Decrease Study Time' }));
    }
    await fireEvent.press(view.getByRole('button', { name: 'Start Timer' }));

    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(view.getByText('Resting')).toBeTruthy();
    expect(view.queryByText('5m')).toBeNull();
    expect(view.getByLabelText('Rest time remaining, 5:00')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(view.getByLabelText('Rest time remaining, 0:00')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Continue Timer' })).toBeTruthy();
    expect(view.queryByText('Resting')).toBeNull();
    expect(useTimerStore.getState().status).toBe('awaitingContinuation');

    await view.unmount();
  });
});
