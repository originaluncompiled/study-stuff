import {
  createDefaultTimerState,
  formatTimer,
  isValidRestMinutes,
  isValidStudyMinutes,
  reconcileTimerState,
} from '@/lib/timer';
import type { TimerState } from '@/types/timer';

function runningState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    studyMinutes: 25,
    restMinutes: 5,
    status: 'running',
    phase: 'study',
    deadlineAtMs: 100_000,
    remainingMs: null,
    ...overrides,
  };
}

describe('timer domain', () => {
  test('formats countdown seconds', () => {
    expect(formatTimer(1500)).toBe('25:00');
    expect(formatTimer(59)).toBe('0:59');
    expect(formatTimer(-1)).toBe('0:00');
  });

  test('uses the expected defaults', () => {
    expect(createDefaultTimerState()).toEqual({
      studyMinutes: 25,
      restMinutes: 5,
      status: 'idle',
      phase: 'study',
      deadlineAtMs: null,
      remainingMs: null,
    });
  });

  test.each([
    [0, true],
    [5, true],
    [120, true],
    [-5, false],
    [1, false],
    [121, false],
    [5.5, false],
  ])('validates study duration %s', (minutes, expected) => {
    expect(isValidStudyMinutes(minutes)).toBe(expected);
  });

  test.each([
    [0, true],
    [5, true],
    [30, true],
    [-5, false],
    [1, false],
    [35, false],
    [Number.NaN, false],
  ])('validates rest duration %s', (minutes, expected) => {
    expect(isValidRestMinutes(minutes)).toBe(expected);
  });

  test('derives running display seconds without changing its deadline', () => {
    expect(reconcileTimerState(runningState(), 40_001)).toEqual({
      ...runningState(),
      secondsRemaining: 60,
    });
  });

  test('caps remaining time after the wall clock moves backward', () => {
    expect(reconcileTimerState(runningState(), -2_000_000).secondsRemaining).toBe(1500);
  });

  test('anchors rest to the original study deadline after an overshoot', () => {
    expect(reconcileTimerState(runningState(), 101_500)).toEqual({
      ...runningState(),
      phase: 'rest',
      deadlineAtMs: 400_000,
      secondsRemaining: 299,
    });
  });

  test('awaits continuation when study and rest have both elapsed', () => {
    expect(reconcileTimerState(runningState(), 400_000)).toEqual({
      studyMinutes: 25,
      restMinutes: 5,
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
      secondsRemaining: 0,
    });
  });

  test('completes study immediately when rest is zero', () => {
    const result = reconcileTimerState(runningState({ restMinutes: 0 }), 100_000);

    expect(result.status).toBe('idle');
    expect(result.secondsRemaining).toBe(1500);
  });

  test('supports a zero study duration by reconciling a running rest phase', () => {
    const state = runningState({
      studyMinutes: 0,
      phase: 'rest',
      deadlineAtMs: 300_000,
    });

    expect(reconcileTimerState(state, 0).secondsRemaining).toBe(300);
    expect(reconcileTimerState(state, 300_000)).toMatchObject({
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
      secondsRemaining: 0,
    });
  });

  test('keeps an awaiting continuation state stable at zero', () => {
    const state: TimerState = {
      studyMinutes: 25,
      restMinutes: 5,
      status: 'awaitingContinuation',
      phase: 'rest',
      deadlineAtMs: null,
      remainingMs: null,
    };

    expect(reconcileTimerState(state, 999_999)).toEqual({ ...state, secondsRemaining: 0 });
  });

  test('keeps exact paused time independent of wall-clock time', () => {
    const state = runningState({
      status: 'paused',
      deadlineAtMs: null,
      remainingMs: 12_345,
    });

    expect(reconcileTimerState(state, 999_999)).toEqual({ ...state, secondsRemaining: 13 });
  });
});
