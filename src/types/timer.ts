export type TimerPhase = 'study' | 'rest';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'awaitingContinuation';

export type TimerState = {
  studyMinutes: number;
  restMinutes: number;
  status: TimerStatus;
  phase: TimerPhase;
  deadlineAtMs: number | null;
  remainingMs: number | null;
};

export type ReconciledTimerState = TimerState & {
  secondsRemaining: number;
};
