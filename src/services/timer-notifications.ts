import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { colors } from '@/constants/theme';
import type { TimerState } from '@/types/timer';

const TIMER_NOTIFICATION_CHANNEL_ID = 'timer-completions-v2';
const STUDY_COMPLETE_NOTIFICATION_ID = 'studystuff-study-timer-complete';
const REST_COMPLETE_NOTIFICATION_ID = 'studystuff-rest-timer-complete';

export async function requestTimerNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  await ensureTimerNotificationChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (allowsNotifications(existing)) {
    return true;
  }
  if (!existing.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return allowsNotifications(requested);
}

export async function syncTimerNotifications(
  state: TimerState,
  enabled: boolean,
  nowMs = Date.now(),
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(STUDY_COMPLETE_NOTIFICATION_ID),
    Notifications.cancelScheduledNotificationAsync(REST_COMPLETE_NOTIFICATION_ID),
  ]);
  if (!enabled || state.status !== 'running' || state.deadlineAtMs === null) {
    return;
  }

  await ensureTimerNotificationChannel();
  const requests: Promise<string>[] = [];

  if (state.phase === 'study') {
    if (state.deadlineAtMs > nowMs) {
      requests.push(scheduleTimerNotification('study', state.deadlineAtMs));
    }

    const restDeadlineAtMs = state.deadlineAtMs + state.restMinutes * 60_000;
    if (state.restMinutes > 0 && restDeadlineAtMs > nowMs) {
      requests.push(scheduleTimerNotification('rest', restDeadlineAtMs));
    }
  } else if (state.deadlineAtMs > nowMs) {
    requests.push(scheduleTimerNotification('rest', state.deadlineAtMs));
  }

  await Promise.all(requests);
}

function scheduleTimerNotification(phase: 'study' | 'rest', deadlineAtMs: number) {
  const studyComplete = phase === 'study';
  return Notifications.scheduleNotificationAsync({
    identifier: studyComplete
      ? STUDY_COMPLETE_NOTIFICATION_ID
      : REST_COMPLETE_NOTIFICATION_ID,
    content: {
      body: studyComplete ? 'Time to rest.' : 'Ready for another study session?',
      color: colors.purple,
      data: { phase, type: 'timerComplete' },
      sound: true,
      title: studyComplete ? 'Study timer complete' : 'Rest timer complete',
    },
    trigger: {
      channelId: TIMER_NOTIFICATION_CHANNEL_ID,
      date: deadlineAtMs,
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  });
}

async function ensureTimerNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(TIMER_NOTIFICATION_CHANNEL_ID, {
    importance: Notifications.AndroidImportance.HIGH,
    name: 'Timer completions',
    vibrationPattern: [0, 250, 250, 250],
  });
}

function allowsNotifications(status: Notifications.NotificationPermissionsStatus): boolean {
  return (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}
