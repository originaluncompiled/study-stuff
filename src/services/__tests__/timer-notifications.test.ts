import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import {
  requestTimerNotificationPermission,
  syncTimerNotifications,
} from '@/services/timer-notifications';
import type { TimerState } from '@/types/timer';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { android: { package: 'com.justoriginal.studystuff' } } },
}));

const scheduleMock = Notifications.scheduleNotificationAsync as jest.MockedFunction<
  typeof Notifications.scheduleNotificationAsync
>;
const cancelMock = Notifications.cancelScheduledNotificationAsync as jest.MockedFunction<
  typeof Notifications.cancelScheduledNotificationAsync
>;
const getPermissionsMock = Notifications.getPermissionsAsync as jest.MockedFunction<
  typeof Notifications.getPermissionsAsync
>;
const requestPermissionsMock = Notifications.requestPermissionsAsync as jest.MockedFunction<
  typeof Notifications.requestPermissionsAsync
>;
const setChannelMock = Notifications.setNotificationChannelAsync as jest.MockedFunction<
  typeof Notifications.setNotificationChannelAsync
>;
const setHandlerMock = Notifications.setNotificationHandler as jest.MockedFunction<
  typeof Notifications.setNotificationHandler
>;
const startActivityMock = IntentLauncher.startActivityAsync as jest.MockedFunction<
  typeof IntentLauncher.startActivityAsync
>;

function runningTimer(overrides: Partial<TimerState> = {}): TimerState {
  return {
    deadlineAtMs: 61_000,
    phase: 'study',
    remainingMs: null,
    restMinutes: 5,
    status: 'running',
    studyMinutes: 25,
    ...overrides,
  };
}

describe('timer notifications', () => {
  beforeEach(() => {
    cancelMock.mockClear();
    getPermissionsMock.mockClear();
    requestPermissionsMock.mockClear();
    scheduleMock.mockClear();
    setChannelMock.mockClear();
    startActivityMock.mockClear();
    scheduleMock.mockImplementation(async (request) => request.identifier ?? 'notification');
  });

  test('presents timer notifications only while the app is unfocused', async () => {
    expect(setHandlerMock).toHaveBeenCalledTimes(1);
    const handler = setHandlerMock.mock.calls[0]?.[0];
    if (!handler) {
      throw new Error('Expected the timer notification handler to be registered.');
    }

    const originalAppState = AppState.currentState;
    try {
      Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
      await expect(
        handler.handleNotification({} as Notifications.Notification),
      ).resolves.toMatchObject({
        shouldPlaySound: false,
        shouldShowBanner: false,
        shouldShowList: false,
      });

      Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
      await expect(
        handler.handleNotification({} as Notifications.Notification),
      ).resolves.toMatchObject({
        shouldPlaySound: true,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    } finally {
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        value: originalAppState,
      });
    }
  });

  test('schedules study and rest completion at their absolute deadlines', async () => {
    await syncTimerNotifications(runningTimer(), true, 1000);

    expect(cancelMock).toHaveBeenCalledTimes(2);
    expect(scheduleMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identifier: 'studystuff-study-timer-complete',
        content: expect.objectContaining({
          body: 'Go take a break for a few minutes!',
          sound: true,
          title: 'Study timer complete',
        }),
        trigger: expect.objectContaining({ date: 61_000, type: 'date' }),
      }),
    );
    expect(scheduleMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        identifier: 'studystuff-rest-timer-complete',
        content: expect.objectContaining({
          body: 'Come back to start another study timer!',
          title: 'Rest timer complete',
        }),
        trigger: expect.objectContaining({ date: 361_000, type: 'date' }),
      }),
    );
  });

  test('cancels pending notifications when disabled', async () => {
    await syncTimerNotifications(runningTimer(), false, 1000);

    expect(cancelMock).toHaveBeenCalledTimes(2);
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  test('requests permission only when it has not already been granted', async () => {
    getPermissionsMock.mockResolvedValueOnce({
      canAskAgain: true,
      expires: 'never',
      granted: false,
      status: Notifications.PermissionStatus.UNDETERMINED,
    });
    requestPermissionsMock.mockResolvedValueOnce({
      canAskAgain: true,
      expires: 'never',
      granted: true,
      status: Notifications.PermissionStatus.GRANTED,
    });

    await expect(requestTimerNotificationPermission()).resolves.toBe(true);
    expect(requestPermissionsMock).toHaveBeenCalledWith({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
  });

  test('uses the Android channel default instead of naming a custom sound', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    try {
      await requestTimerNotificationPermission();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }

    expect(setChannelMock).toHaveBeenCalledWith(
      'timer-completions-v2',
      expect.not.objectContaining({ sound: expect.anything() }),
    );
  });

  test('opens the app-specific exact alarm settings on Android 12 and later', async () => {
    const originalPlatform = Platform.OS;
    const originalVersion = Platform.Version;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    Object.defineProperty(Platform, 'Version', { configurable: true, value: 31 });

    try {
      await requestTimerNotificationPermission();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
      Object.defineProperty(Platform, 'Version', { configurable: true, value: originalVersion });
    }

    expect(startActivityMock).toHaveBeenCalledWith(
      IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM,
      { data: 'package:com.justoriginal.studystuff' },
    );
  });
});
