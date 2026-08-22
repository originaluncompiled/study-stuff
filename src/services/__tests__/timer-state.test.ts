import AsyncStorage from '@react-native-async-storage/async-storage';

import { createDefaultTimerState } from '@/lib/timer';
import { parseTimerState, readTimerState, writeTimerState } from '@/services/timer-state';
import type { TimerState } from '@/types/timer';

const storageKey = 'studystuff:timer:v1';

function envelope(state: TimerState): string {
  return JSON.stringify({ version: 1, state });
}

describe('timer state persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('returns defaults when no timer has been persisted', () => {
    expect(parseTimerState(null)).toEqual(createDefaultTimerState());
  });

  test.each<TimerState>([
    {
      studyMinutes: 25,
      restMinutes: 5,
      status: 'running',
      phase: 'study',
      deadlineAtMs: 123_456,
      remainingMs: null,
    },
    {
      studyMinutes: 25,
      restMinutes: 5,
      status: 'paused',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: 12_345,
    },
    {
      studyMinutes: 25,
      restMinutes: 5,
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
    },
  ])('round-trips a valid $status timer', async (state) => {
    await writeTimerState(state);

    await expect(readTimerState()).resolves.toEqual({
      state,
      reliable: true,
      repairable: false,
    });
  });

  test.each([
    ['not JSON'],
    [JSON.stringify(null)],
    [JSON.stringify({ version: 2, state: createDefaultTimerState() })],
    [envelope({ ...createDefaultTimerState(), studyMinutes: 121 })],
    [envelope({ ...createDefaultTimerState(), restMinutes: 7 })],
    [envelope({ ...createDefaultTimerState(), status: 'running' })],
    [
      envelope({
        ...createDefaultTimerState(),
        status: 'paused',
        deadlineAtMs: 1000,
        remainingMs: 1000,
      }),
    ],
    [
      envelope({
        ...createDefaultTimerState(),
        status: 'running',
        deadlineAtMs: 1000,
        remainingMs: null,
        studyMinutes: 0,
      }),
    ],
    [
      envelope({
        ...createDefaultTimerState(),
        status: 'awaitingContinuation',
        phase: 'study',
      }),
    ],
    [
      envelope({
        ...createDefaultTimerState(),
        status: 'awaitingContinuation',
        phase: 'rest',
        restMinutes: 0,
      }),
    ],
    [
      envelope({
        ...createDefaultTimerState(),
        status: 'awaitingContinuation',
        phase: 'rest',
        deadlineAtMs: 1000,
      }),
    ],
    [
      envelope({
        ...createDefaultTimerState(),
        status: 'awaitingContinuation',
        phase: 'rest',
        remainingMs: 1000,
      }),
    ],
  ])('rejects malformed persisted data', (value) => {
    expect(() => parseTimerState(value)).toThrow();
  });

  test('distinguishes unreadable data from an empty timer state', async () => {
    await expect(readTimerState()).resolves.toEqual({
      state: createDefaultTimerState(),
      reliable: true,
      repairable: false,
    });

    await AsyncStorage.setItem(storageKey, 'not-json');
    await expect(readTimerState()).resolves.toEqual({
      state: createDefaultTimerState(),
      reliable: false,
      repairable: true,
    });
  });

  test('does not mark a storage read failure as safe to overwrite', async () => {
    const getItemMock = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
    getItemMock.mockRejectedValueOnce(new Error('Storage unavailable'));

    await expect(readTimerState()).resolves.toEqual({
      state: createDefaultTimerState(),
      reliable: false,
      repairable: false,
    });
  });

  test('writes a versioned envelope', async () => {
    await writeTimerState(createDefaultTimerState());

    await expect(AsyncStorage.getItem(storageKey)).resolves.toBe(
      envelope(createDefaultTimerState()),
    );
  });
});
