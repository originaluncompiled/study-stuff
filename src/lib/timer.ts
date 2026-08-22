import type { ReconciledTimerState, TimerState } from '@/types/timer';

export const TIMER_DURATION_STEP = 5;
export const MIN_TIMER_MINUTES = 0;
export const MAX_STUDY_MINUTES = 120;
export const MAX_REST_MINUTES = 30;
export const DEFAULT_STUDY_MINUTES = 25;
export const DEFAULT_REST_MINUTES = 5;

const MILLISECONDS_PER_MINUTE = 60_000;

export function isValidStudyMinutes(minutes: number): boolean {
  return isValidDuration(minutes, MAX_STUDY_MINUTES);
}

export function isValidRestMinutes(minutes: number): boolean {
  return isValidDuration(minutes, MAX_REST_MINUTES);
}

export function createDefaultTimerState(): TimerState {
  return {
    studyMinutes: DEFAULT_STUDY_MINUTES,
    restMinutes: DEFAULT_REST_MINUTES,
    status: 'idle',
    phase: 'study',
    deadlineAtMs: null,
    remainingMs: null,
  };
}

export function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function reconcileTimerState(state: TimerState, nowMs: number): ReconciledTimerState {
  if (!Number.isFinite(nowMs)) {
    throw new Error('Timer reconciliation requires a finite timestamp.');
  }

  if (state.status === 'idle') {
    return withSeconds(toIdleState(state), state.studyMinutes * 60);
  }

  if (state.status === 'awaitingContinuation') {
    return withSeconds(state, 0);
  }

  if (state.status === 'paused') {
    return withSeconds(
      state,
      millisecondsToSeconds(
        Math.min(state.remainingMs ?? 0, getPhaseDurationMs(state)),
      ),
    );
  }

  const deadlineAtMs = state.deadlineAtMs ?? nowMs;
  if (nowMs < deadlineAtMs) {
    return withSeconds(
      state,
      millisecondsToSeconds(Math.min(deadlineAtMs - nowMs, getPhaseDurationMs(state))),
    );
  }

  if (state.phase === 'study' && state.restMinutes > 0) {
    const restDeadlineAtMs = deadlineAtMs + state.restMinutes * MILLISECONDS_PER_MINUTE;
    if (nowMs < restDeadlineAtMs) {
      return withSeconds(
        {
          ...state,
          phase: 'rest',
          deadlineAtMs: restDeadlineAtMs,
        },
        millisecondsToSeconds(restDeadlineAtMs - nowMs),
      );
    }

    return withSeconds(toAwaitingContinuationState(state), 0);
  }

  if (state.phase === 'rest') {
    return withSeconds(toAwaitingContinuationState(state), 0);
  }

  return withSeconds(toIdleState(state), state.studyMinutes * 60);
}

function getPhaseDurationMs(state: TimerState): number {
  return (state.phase === 'study' ? state.studyMinutes : state.restMinutes) * MILLISECONDS_PER_MINUTE;
}

function isValidDuration(minutes: number, maximum: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= MIN_TIMER_MINUTES &&
    minutes <= maximum &&
    minutes % TIMER_DURATION_STEP === 0
  );
}

function millisecondsToSeconds(milliseconds: number): number {
  return Math.max(0, Math.ceil(milliseconds / 1000));
}

function toIdleState(state: TimerState): TimerState {
  return {
    studyMinutes: state.studyMinutes,
    restMinutes: state.restMinutes,
    status: 'idle',
    phase: 'study',
    deadlineAtMs: null,
    remainingMs: null,
  };
}

function toAwaitingContinuationState(state: TimerState): TimerState {
  return {
    studyMinutes: state.studyMinutes,
    restMinutes: state.restMinutes,
    status: 'awaitingContinuation',
    phase: 'rest',
    deadlineAtMs: null,
    remainingMs: null,
  };
}

function withSeconds(state: TimerState, secondsRemaining: number): ReconciledTimerState {
  return {
    studyMinutes: state.studyMinutes,
    restMinutes: state.restMinutes,
    status: state.status,
    phase: state.phase,
    deadlineAtMs: state.deadlineAtMs,
    remainingMs: state.remainingMs,
    secondsRemaining,
  };
}
