import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createDefaultTimerState,
  isValidRestMinutes,
  isValidStudyMinutes,
} from '@/lib/timer';
import type { TimerState } from '@/types/timer';

const TIMER_STATE_KEY = 'studystuff:timer:v1';

type TimerStateEnvelope = {
  version: 1;
  state: TimerState;
};

export type TimerStateReadResult = {
  state: TimerState;
  reliable: boolean;
  repairable: boolean;
};

export function parseTimerState(value: string | null): TimerState {
  if (!value) {
    return createDefaultTimerState();
  }

  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) {
    throw new Error('The saved timer state is invalid.');
  }
  if (parsed.version !== 1 || !('state' in parsed)) {
    throw new Error('The saved timer state uses an unsupported format.');
  }
  if (!isTimerState(parsed.state)) {
    throw new Error('The saved timer state is invalid.');
  }

  return parsed.state;
}

export async function readTimerState(): Promise<TimerStateReadResult> {
  let value: string | null;
  try {
    value = await AsyncStorage.getItem(TIMER_STATE_KEY);
  } catch {
    return { state: createDefaultTimerState(), reliable: false, repairable: false };
  }

  try {
    return { state: parseTimerState(value), reliable: true, repairable: false };
  } catch {
    return { state: createDefaultTimerState(), reliable: false, repairable: true };
  }
}

export async function writeTimerState(state: TimerState): Promise<void> {
  const envelope: TimerStateEnvelope = { version: 1, state };
  await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(envelope));
}

function isTimerState(value: unknown): value is TimerState {
  if (!isRecord(value)) {
    return false;
  }

  const { studyMinutes, restMinutes, status, phase, deadlineAtMs, remainingMs } = value;
  if (
    typeof studyMinutes !== 'number' ||
    !isValidStudyMinutes(studyMinutes) ||
    typeof restMinutes !== 'number' ||
    !isValidRestMinutes(restMinutes) ||
    (status !== 'idle' &&
      status !== 'running' &&
      status !== 'paused' &&
      status !== 'awaitingContinuation') ||
    (phase !== 'study' && phase !== 'rest')
  ) {
    return false;
  }

  if (status === 'idle') {
    return phase === 'study' && deadlineAtMs === null && remainingMs === null;
  }

  if (status === 'awaitingContinuation') {
    return phase === 'rest' && restMinutes > 0 && deadlineAtMs === null && remainingMs === null;
  }

  const phaseDurationMs = (phase === 'study' ? studyMinutes : restMinutes) * 60_000;
  if (phaseDurationMs === 0) {
    return false;
  }

  if (status === 'running') {
    return (
      typeof deadlineAtMs === 'number' &&
      Number.isFinite(deadlineAtMs) &&
      deadlineAtMs >= 0 &&
      remainingMs === null
    );
  }

  return (
    deadlineAtMs === null &&
    typeof remainingMs === 'number' &&
    Number.isFinite(remainingMs) &&
    remainingMs > 0 &&
    remainingMs <= phaseDurationMs
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
