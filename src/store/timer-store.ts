import { create } from 'zustand';

import {
  createDefaultTimerState,
  isValidRestMinutes,
  isValidStudyMinutes,
  reconcileTimerState,
} from '@/lib/timer';
import {
  readHideTimerWhileStudying,
  readNotifyWhenTimerEnds,
  writeHideTimerWhileStudying,
  writeNotifyWhenTimerEnds,
} from '@/services/timer-preference';
import {
  requestTimerNotificationPermission,
  syncTimerNotifications,
} from '@/services/timer-notifications';
import { readTimerState, writeTimerState } from '@/services/timer-state';
import type { ReconciledTimerState, TimerState } from '@/types/timer';

export type TimerStore = ReconciledTimerState & {
  hydrated: boolean;
  hydrationError: string | null;
  persistenceError: string | null;
  hideTimerWhileStudying: boolean;
  notifyWhenTimerEnds: boolean;
  notificationError: string | null;
  notificationSaving: boolean;
  preferenceError: string | null;
  preferenceSaving: boolean;
  hydrate: (nowMs?: number) => Promise<void>;
  setHideTimerWhileStudying: (hidden: boolean) => Promise<void>;
  setNotifyWhenTimerEnds: (enabled: boolean) => Promise<void>;
  setStudyMinutes: (minutes: number) => Promise<void>;
  setRestMinutes: (minutes: number) => Promise<void>;
  start: (nowMs?: number) => Promise<void>;
  pause: (nowMs?: number) => Promise<void>;
  resume: (nowMs?: number) => Promise<void>;
  reset: () => Promise<void>;
  stop: () => Promise<void>;
  skipRest: (nowMs?: number) => Promise<void>;
  reconcile: (nowMs?: number) => Promise<void>;
};

let hydrationPromise: Promise<void> | null = null;
let persistenceQueue: Promise<void> = Promise.resolve();
let notificationQueue: Promise<void> = Promise.resolve();

const defaultState = reconcileTimerState(createDefaultTimerState(), 0);

export const useTimerStore = create<TimerStore>((set, get) => ({
  ...defaultState,
  hydrated: false,
  hydrationError: null,
  persistenceError: null,
  hideTimerWhileStudying: false,
  notifyWhenTimerEnds: false,
  notificationError: null,
  notificationSaving: false,
  preferenceError: null,
  preferenceSaving: false,

  hydrate: (nowMs = Date.now()) => {
    if (get().hydrated) {
      return Promise.resolve();
    }
    if (hydrationPromise) {
      return hydrationPromise;
    }

    hydrationPromise = (async () => {
      const loaded = await readTimerState();
      let hideTimerWhileStudying = false;
      let notifyWhenTimerEnds = false;
      let preferenceError: string | null = null;
      let notificationError: string | null = null;
      try {
        hideTimerWhileStudying = await readHideTimerWhileStudying();
      } catch {
        preferenceError = 'Could not load the saved timer display preference.';
      }
      try {
        notifyWhenTimerEnds = await readNotifyWhenTimerEnds();
      } catch {
        notificationError = 'Could not load the notification preference.';
      }
      const reconciled = reconcileTimerState(loaded.state, nowMs);
      set({
        ...reconciled,
        hideTimerWhileStudying,
        notifyWhenTimerEnds,
        notificationError,
        hydrated: true,
        hydrationError: loaded.reliable ? null : 'Could not load the saved timer.',
        preferenceError,
      });

      if (loaded.repairable || !timerStatesEqual(loaded.state, reconciled)) {
        await persistTimerState(toTimerState(reconciled));
      }
      if (notifyWhenTimerEnds) {
        await queueTimerNotificationSync(reconciled, true, nowMs);
      }
    })().finally(() => {
      hydrationPromise = null;
    });

    return hydrationPromise;
  },

  setHideTimerWhileStudying: async (hidden) => {
    const current = get();
    if (current.preferenceSaving || hidden === current.hideTimerWhileStudying) {
      return;
    }

    set({ hideTimerWhileStudying: hidden, preferenceError: null, preferenceSaving: true });
    try {
      await writeHideTimerWhileStudying(hidden);
      set({ preferenceError: null, preferenceSaving: false });
    } catch {
      set({
        hideTimerWhileStudying: current.hideTimerWhileStudying,
        preferenceError: 'Could not save the timer display preference.',
        preferenceSaving: false,
      });
    }
  },

  setNotifyWhenTimerEnds: async (enabled) => {
    const current = get();
    if (current.notificationSaving || enabled === current.notifyWhenTimerEnds) {
      return;
    }

    set({ notificationError: null, notificationSaving: true });
    if (enabled) {
      let allowed: boolean;
      try {
        allowed = await requestTimerNotificationPermission();
      } catch {
        set({
          notificationError: 'Could not request notification permission.',
          notificationSaving: false,
        });
        return;
      }
      if (!allowed) {
        set({
          notificationError: 'Notifications are disabled in your device settings.',
          notificationSaving: false,
        });
        return;
      }
    }

    try {
      await writeNotifyWhenTimerEnds(enabled);
    } catch {
      set({
        notificationError: 'Could not save the notification preference.',
        notificationSaving: false,
      });
      return;
    }

    set({ notifyWhenTimerEnds: enabled, notificationSaving: false });
    await queueTimerNotificationSync(toTimerState(get()), enabled);
  },

  setStudyMinutes: (minutes) => {
    const current = get();
    if (current.status !== 'idle' || !isValidStudyMinutes(minutes) || minutes === current.studyMinutes) {
      return Promise.resolve();
    }

    const next = reconcileTimerState(
      { ...toTimerState(current), studyMinutes: minutes },
      0,
    );
    set(next);
    return persistTimerState(toTimerState(next));
  },

  setRestMinutes: (minutes) => {
    const current = get();
    if (current.status !== 'idle' || !isValidRestMinutes(minutes) || minutes === current.restMinutes) {
      return Promise.resolve();
    }

    const next = { ...toTimerState(current), restMinutes: minutes };
    set(next);
    return persistTimerState(next);
  },

  start: (nowMs = Date.now()) => {
    assertFiniteTimestamp(nowMs);
    const current = get();
    if (current.status !== 'idle' && current.status !== 'awaitingContinuation') {
      return Promise.resolve();
    }

    const phase = current.studyMinutes > 0 ? 'study' : 'rest';
    const durationMs = (phase === 'study' ? current.studyMinutes : current.restMinutes) * 60_000;
    if (durationMs === 0) {
      return Promise.resolve();
    }

    const next: ReconciledTimerState = {
      ...toTimerState(current),
      status: 'running',
      phase,
      deadlineAtMs: nowMs + durationMs,
      remainingMs: null,
      secondsRemaining: durationMs / 1000,
    };
    set(next);
    return persistTimerUpdate(next, true, nowMs);
  },

  pause: (nowMs = Date.now()) => {
    assertFiniteTimestamp(nowMs);
    const current = get();
    if (current.status !== 'running') {
      return Promise.resolve();
    }

    const reconciled = reconcileTimerState(toTimerState(current), nowMs);
    if (reconciled.status !== 'running') {
      set(reconciled);
      return persistTimerState(toTimerState(reconciled));
    }

    const phaseDurationMs =
      (reconciled.phase === 'study' ? reconciled.studyMinutes : reconciled.restMinutes) * 60_000;
    const remainingMs = Math.min(
      phaseDurationMs,
      Math.max(0, (reconciled.deadlineAtMs ?? nowMs) - nowMs),
    );
    const next: ReconciledTimerState = {
      ...reconciled,
      status: 'paused',
      deadlineAtMs: null,
      remainingMs,
      secondsRemaining: Math.ceil(remainingMs / 1000),
    };
    set(next);
    return persistTimerUpdate(next, true, nowMs);
  },

  resume: (nowMs = Date.now()) => {
    assertFiniteTimestamp(nowMs);
    const current = get();
    if (current.status !== 'paused' || current.remainingMs === null || current.remainingMs <= 0) {
      return Promise.resolve();
    }

    const next: ReconciledTimerState = {
      ...toTimerState(current),
      status: 'running',
      deadlineAtMs: nowMs + current.remainingMs,
      remainingMs: null,
      secondsRemaining: Math.ceil(current.remainingMs / 1000),
    };
    set(next);
    return persistTimerUpdate(next, true, nowMs);
  },

  reset: () => returnToIdle(set, get),

  stop: () => returnToIdle(set, get),

  skipRest: (nowMs = Date.now()) => {
    assertFiniteTimestamp(nowMs);
    const current = get();
    if (current.status === 'idle') {
      return Promise.resolve();
    }

    const reconciled = reconcileTimerState(toTimerState(current), nowMs);
    if (reconciled.phase !== 'rest') {
      if (reconciled.secondsRemaining !== current.secondsRemaining) {
        set(reconciled);
      }
      return Promise.resolve();
    }

    const next = reconcileTimerState(
      {
        ...toTimerState(reconciled),
        status: 'awaitingContinuation',
        phase: 'rest',
        deadlineAtMs: null,
        remainingMs: null,
      },
      nowMs,
    );
    set(next);
    return persistTimerUpdate(next, true, nowMs);
  },

  reconcile: (nowMs = Date.now()) => {
    const current = get();
    const persistedBefore = toTimerState(current);
    const next = reconcileTimerState(persistedBefore, nowMs);
    if (!timerStatesEqual(current, next) || current.secondsRemaining !== next.secondsRemaining) {
      set(next);
    }

    if (!timerStatesEqual(persistedBefore, next)) {
      return persistTimerState(toTimerState(next));
    }
    return Promise.resolve();
  },
}));

function returnToIdle(
  set: (state: Partial<TimerStore>) => void,
  get: () => TimerStore,
): Promise<void> {
  const current = get();
  if (current.status === 'idle' && current.phase === 'study') {
    return Promise.resolve();
  }

  const next = reconcileTimerState(
    {
      ...toTimerState(current),
      status: 'idle',
      phase: 'study',
      deadlineAtMs: null,
      remainingMs: null,
    },
    0,
  );
  set(next);
  return persistTimerUpdate(next, true);
}

function persistTimerUpdate(
  state: ReconciledTimerState,
  updateNotifications: boolean,
  nowMs = Date.now(),
): Promise<void> {
  const persistence = persistTimerState(toTimerState(state));
  if (!updateNotifications || !useTimerStore.getState().notifyWhenTimerEnds) {
    return persistence;
  }

  return Promise.all([persistence, queueTimerNotificationSync(state, true, nowMs)]).then(
    () => undefined,
  );
}

function persistTimerState(state: TimerState): Promise<void> {
  const write = persistenceQueue.then(
    () => writeTimerState(state),
    () => writeTimerState(state),
  );
  persistenceQueue = write.then(
    () => {
      useTimerStore.setState({ hydrationError: null, persistenceError: null });
    },
    (error: unknown) => {
      useTimerStore.setState({
        persistenceError: error instanceof Error ? error.message : 'Could not save the timer.',
      });
    },
  );
  return persistenceQueue;
}

function queueTimerNotificationSync(
  state: TimerState,
  enabled: boolean,
  nowMs = Date.now(),
): Promise<void> {
  const sync = notificationQueue.then(
    () => syncTimerNotifications(state, enabled, nowMs),
    () => syncTimerNotifications(state, enabled, nowMs),
  );
  notificationQueue = sync.then(
    () => {
      useTimerStore.setState({ notificationError: null });
    },
    () => {
      useTimerStore.setState({
        notificationError: 'Could not update scheduled timer notifications.',
      });
    },
  );
  return notificationQueue;
}

function toTimerState(state: TimerState): TimerState {
  return {
    studyMinutes: state.studyMinutes,
    restMinutes: state.restMinutes,
    status: state.status,
    phase: state.phase,
    deadlineAtMs: state.deadlineAtMs,
    remainingMs: state.remainingMs,
  };
}

function timerStatesEqual(left: TimerState, right: TimerState): boolean {
  return (
    left.studyMinutes === right.studyMinutes &&
    left.restMinutes === right.restMinutes &&
    left.status === right.status &&
    left.phase === right.phase &&
    left.deadlineAtMs === right.deadlineAtMs &&
    left.remainingMs === right.remainingMs
  );
}

function assertFiniteTimestamp(nowMs: number): void {
  if (!Number.isFinite(nowMs)) {
    throw new Error('Timer commands require a finite timestamp.');
  }
}
