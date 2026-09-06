import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  requestTimerNotificationPermission,
  syncTimerNotifications,
} from '@/services/timer-notifications';
import type { TimerState } from '@/types/timer';

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
    scheduleMock.mockImplementation(async (request) => request.identifier ?? 'notification');
  });

  test('does not opt into showing notifications while the app is active', () => {
    expect(setHandlerMock).not.toHaveBeenCalled();
  });

  test('schedules study and rest completion at their absolute deadlines', async () => {
    await syncTimerNotifications(runningTimer(), true, 1000);

    expect(cancelMock).toHaveBeenCalledTimes(2);
    expect(scheduleMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identifier: 'studystuff-study-timer-complete',
        content: expect.objectContaining({ sound: true, title: 'Study timer complete' }),
        trigger: expect.objectContaining({ date: 61_000, type: 'date' }),
      }),
    );
    expect(scheduleMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        identifier: 'studystuff-rest-timer-complete',
        content: expect.objectContaining({ title: 'Rest timer complete' }),
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
});
