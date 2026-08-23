import AsyncStorage from '@react-native-async-storage/async-storage';

import { createDefaultTimerState, reconcileTimerState } from '@/lib/timer';
import { parseTimerState, writeTimerState } from '@/services/timer-state';
import { useTimerStore } from '@/store/timer-store';

const storageKey = 'studystuff:timer:v1';
const getItemMock = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const setItemMock = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

async function persistedState() {
  return parseTimerState(await AsyncStorage.getItem(storageKey));
}

describe('timer store', () => {
  beforeEach(async () => {
    getItemMock.mockImplementation(async (key) => {
      const values = await AsyncStorage.multiGet([key]);
      return values[0]?.[1] ?? null;
    });
    setItemMock.mockImplementation(async (key, value) => {
      await AsyncStorage.multiSet([[key, value]]);
    });
    getItemMock.mockClear();
    setItemMock.mockClear();
    await AsyncStorage.clear();
    useTimerStore.setState({
      ...reconcileTimerState(createDefaultTimerState(), 0),
      hydrated: false,
      hydrationError: null,
      persistenceError: null,
    });
  });

  test('persists duration changes and rejects invalid values', async () => {
    await useTimerStore.getState().setStudyMinutes(120);
    await useTimerStore.getState().setRestMinutes(30);
    await useTimerStore.getState().setStudyMinutes(121);
    await useTimerStore.getState().setRestMinutes(7);

    expect(useTimerStore.getState().studyMinutes).toBe(120);
    expect(useTimerStore.getState().restMinutes).toBe(30);
    await expect(persistedState()).resolves.toMatchObject({ studyMinutes: 120, restMinutes: 30 });
  });

  test('locks both durations while running and paused', async () => {
    await useTimerStore.getState().start(1000);
    await useTimerStore.getState().setStudyMinutes(30);
    await useTimerStore.getState().setRestMinutes(10);
    expect(useTimerStore.getState()).toMatchObject({ studyMinutes: 25, restMinutes: 5 });

    await useTimerStore.getState().pause(2000);
    await useTimerStore.getState().setStudyMinutes(30);
    await useTimerStore.getState().setRestMinutes(10);
    expect(useTimerStore.getState()).toMatchObject({
      studyMinutes: 25,
      restMinutes: 5,
      status: 'paused',
    });
  });

  test('persists an absolute running deadline and resumes exact paused milliseconds', async () => {
    await useTimerStore.getState().start(1000);
    expect(await persistedState()).toMatchObject({
      status: 'running',
      deadlineAtMs: 1_501_000,
      remainingMs: null,
    });

    await useTimerStore.getState().pause(2500);
    expect(await persistedState()).toMatchObject({
      status: 'paused',
      deadlineAtMs: null,
      remainingMs: 1_498_500,
    });

    await useTimerStore.getState().resume(10_000);
    expect(useTimerStore.getState()).toMatchObject({
      status: 'running',
      deadlineAtMs: 1_508_500,
      secondsRemaining: 1499,
    });
  });

  test('keeps paused persistence valid after the wall clock moves backward', async () => {
    await useTimerStore.getState().start(1000);
    await useTimerStore.getState().pause(0);

    expect(await persistedState()).toMatchObject({
      status: 'paused',
      remainingMs: 1_500_000,
    });
  });

  test('hydrates a running timer after restart from its deadline', async () => {
    await writeTimerState({
      studyMinutes: 25,
      restMinutes: 5,
      status: 'running',
      phase: 'study',
      deadlineAtMs: 10_000,
      remainingMs: null,
    });

    await useTimerStore.getState().hydrate(4000);

    expect(useTimerStore.getState()).toMatchObject({
      hydrated: true,
      hydrationError: null,
      status: 'running',
      phase: 'study',
      deadlineAtMs: 10_000,
      secondsRemaining: 6,
    });
  });

  test('hydrates paused time unchanged even after wall-clock time passes', async () => {
    await writeTimerState({
      studyMinutes: 25,
      restMinutes: 5,
      status: 'paused',
      phase: 'study',
      deadlineAtMs: null,
      remainingMs: 12_345,
    });

    await useTimerStore.getState().hydrate(999_999);

    expect(useTimerStore.getState()).toMatchObject({
      status: 'paused',
      remainingMs: 12_345,
      secondsRemaining: 13,
    });
  });

  test('hydrates an overshot study into rest using the original deadline', async () => {
    await writeTimerState({
      studyMinutes: 25,
      restMinutes: 5,
      status: 'running',
      phase: 'study',
      deadlineAtMs: 100_000,
      remainingMs: null,
    });

    await useTimerStore.getState().hydrate(101_500);

    expect(useTimerStore.getState()).toMatchObject({
      status: 'running',
      phase: 'rest',
      deadlineAtMs: 400_000,
      secondsRemaining: 299,
    });
    await expect(persistedState()).resolves.toMatchObject({
      phase: 'rest',
      deadlineAtMs: 400_000,
    });
  });

  test('hydrates elapsed study and rest into awaiting continuation and persists it', async () => {
    await writeTimerState({
      studyMinutes: 25,
      restMinutes: 5,
      status: 'running',
      phase: 'study',
      deadlineAtMs: 100_000,
      remainingMs: null,
    });

    await useTimerStore.getState().hydrate(400_000);

    expect(useTimerStore.getState()).toMatchObject({
      status: 'awaitingContinuation',
      phase: 'rest',
      studyMinutes: 25,
      restMinutes: 5,
      deadlineAtMs: null,
      remainingMs: null,
      secondsRemaining: 0,
    });
    await expect(persistedState()).resolves.toMatchObject({
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
    });
  });

  test('starts with rest when study is zero and does nothing when both are zero', async () => {
    await useTimerStore.getState().setStudyMinutes(0);
    await useTimerStore.getState().start(1000);
    expect(useTimerStore.getState()).toMatchObject({
      status: 'running',
      phase: 'rest',
      deadlineAtMs: 301_000,
    });

    await useTimerStore.getState().stop();
    await useTimerStore.getState().setRestMinutes(0);
    await useTimerStore.getState().start(2000);
    expect(useTimerStore.getState()).toMatchObject({
      status: 'idle',
      secondsRemaining: 0,
    });
  });

  test('directly started rest naturally awaits continuation', async () => {
    await useTimerStore.getState().setStudyMinutes(0);
    await useTimerStore.getState().start(1000);
    await useTimerStore.getState().reconcile(301_000);

    expect(useTimerStore.getState()).toMatchObject({
      studyMinutes: 0,
      restMinutes: 5,
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
      secondsRemaining: 0,
    });
  });

  test('starts a fresh cycle from awaiting continuation with preserved durations', async () => {
    useTimerStore.setState({
      studyMinutes: 5,
      restMinutes: 10,
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
      secondsRemaining: 0,
    });

    await useTimerStore.getState().start(1000);

    expect(useTimerStore.getState()).toMatchObject({
      studyMinutes: 5,
      restMinutes: 10,
      status: 'running',
      phase: 'study',
      deadlineAtMs: 301_000,
      remainingMs: null,
      secondsRemaining: 300,
    });
    await expect(persistedState()).resolves.toMatchObject({
      studyMinutes: 5,
      restMinutes: 10,
      status: 'running',
      phase: 'study',
      deadlineAtMs: 301_000,
    });
  });

  test('starts a fresh rest from awaiting continuation when study is zero', async () => {
    useTimerStore.setState({
      studyMinutes: 0,
      restMinutes: 10,
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
      secondsRemaining: 0,
    });

    await useTimerStore.getState().start(1000);

    expect(useTimerStore.getState()).toMatchObject({
      studyMinutes: 0,
      restMinutes: 10,
      status: 'running',
      phase: 'rest',
      deadlineAtMs: 601_000,
      secondsRemaining: 600,
    });
  });

  test.each(['stop', 'reset'] as const)(
    '%s returns awaiting continuation to idle with preserved durations',
    async (command) => {
      useTimerStore.setState({
        studyMinutes: 5,
        restMinutes: 10,
        status: 'awaitingContinuation',
        phase: 'rest',
        deadlineAtMs: null,
        remainingMs: null,
        secondsRemaining: 0,
      });

      await useTimerStore.getState()[command]();

      expect(useTimerStore.getState()).toMatchObject({
        studyMinutes: 5,
        restMinutes: 10,
        status: 'idle',
        phase: 'study',
        deadlineAtMs: null,
        remainingMs: null,
        secondsRemaining: 300,
      });
    },
  );

  test('locks duration changes while awaiting continuation', async () => {
    useTimerStore.setState({
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
      secondsRemaining: 0,
    });

    await useTimerStore.getState().setStudyMinutes(30);
    await useTimerStore.getState().setRestMinutes(10);

    expect(useTimerStore.getState()).toMatchObject({ studyMinutes: 25, restMinutes: 5 });
  });

  test('natural completion, reset, stop, and skipping rest preserve durations', async () => {
    await useTimerStore.getState().setStudyMinutes(5);
    await useTimerStore.getState().setRestMinutes(10);
    await useTimerStore.getState().start(0);
    await useTimerStore.getState().reconcile(5 * 60_000);
    expect(useTimerStore.getState().phase).toBe('rest');

    await useTimerStore.getState().skipRest(5 * 60_000);
    expect(useTimerStore.getState()).toMatchObject({
      status: 'awaitingContinuation',
      phase: 'rest',
      studyMinutes: 5,
      restMinutes: 10,
    });
    await expect(persistedState()).resolves.toMatchObject({
      status: 'awaitingContinuation',
      phase: 'rest',
    });

    await useTimerStore.getState().start(0);
    await useTimerStore.getState().reset();
    await useTimerStore.getState().start(0);
    await useTimerStore.getState().stop();
    expect(useTimerStore.getState()).toMatchObject({
      status: 'idle',
      studyMinutes: 5,
      restMinutes: 10,
    });

    await useTimerStore.getState().start(0);
    await useTimerStore.getState().reconcile(15 * 60_000);
    expect(useTimerStore.getState()).toMatchObject({
      status: 'awaitingContinuation',
      phase: 'rest',
      studyMinutes: 5,
      restMinutes: 10,
    });

    await useTimerStore.getState().skipRest(15 * 60_000);
    expect(useTimerStore.getState()).toMatchObject({
      status: 'awaitingContinuation',
      phase: 'rest',
      studyMinutes: 5,
      restMinutes: 10,
    });
  });

  test('does not persist ordinary display ticks', async () => {
    await useTimerStore.getState().start(0);
    expect(setItemMock).toHaveBeenCalledTimes(1);

    await useTimerStore.getState().reconcile(1000);
    await useTimerStore.getState().reconcile(2000);
    expect(setItemMock).toHaveBeenCalledTimes(1);

    await useTimerStore.getState().reconcile(25 * 60_000);
    expect(setItemMock).toHaveBeenCalledTimes(2);
  });

  test('serializes rapid writes so the latest state wins', async () => {
    let releaseFirstWrite: (() => void) | undefined;
    const firstWriteBlocked = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    let writes = 0;
    let activeWrites = 0;
    let maximumActiveWrites = 0;
    setItemMock.mockImplementation(async (key, value) => {
      writes += 1;
      activeWrites += 1;
      maximumActiveWrites = Math.max(maximumActiveWrites, activeWrites);
      if (writes === 1) {
        await firstWriteBlocked;
      }
      await AsyncStorage.multiSet([[key, value]]);
      activeWrites -= 1;
    });

    const first = useTimerStore.getState().setStudyMinutes(30);
    const latest = useTimerStore.getState().setStudyMinutes(35);
    await Promise.resolve();
    expect(writes).toBe(1);

    releaseFirstWrite?.();
    await Promise.all([first, latest]);

    expect(maximumActiveWrites).toBe(1);
    await expect(persistedState()).resolves.toMatchObject({ studyMinutes: 35 });
  });

  test('reports storage failures without rolling back in-memory commands', async () => {
    setItemMock.mockRejectedValueOnce(new Error('Storage unavailable'));

    await useTimerStore.getState().setStudyMinutes(30);

    expect(useTimerStore.getState()).toMatchObject({
      studyMinutes: 30,
      persistenceError: 'Storage unavailable',
    });

    await useTimerStore.getState().setStudyMinutes(35);
    expect(useTimerStore.getState()).toMatchObject({
      studyMinutes: 35,
      persistenceError: null,
    });
  });

  test('reports hydration failures and remains usable with defaults', async () => {
    getItemMock.mockRejectedValueOnce(new Error('Storage unavailable'));

    await useTimerStore.getState().hydrate(0);

    expect(useTimerStore.getState()).toMatchObject({
      hydrated: true,
      hydrationError: 'Could not load the saved timer.',
      studyMinutes: 25,
      restMinutes: 5,
    });
    await useTimerStore.getState().start(0);
    expect(useTimerStore.getState().status).toBe('running');
    expect(useTimerStore.getState().hydrationError).toBeNull();
  });

  test('replaces corrupt persisted data with a valid default state', async () => {
    await AsyncStorage.setItem(storageKey, 'not-json');

    await useTimerStore.getState().hydrate(0);

    expect(useTimerStore.getState()).toMatchObject({
      hydrated: true,
      hydrationError: null,
      studyMinutes: 25,
      restMinutes: 5,
    });
    await expect(persistedState()).resolves.toEqual(createDefaultTimerState());
  });
});
