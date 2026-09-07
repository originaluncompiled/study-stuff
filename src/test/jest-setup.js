/* global jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  PermissionStatus: {
    DENIED: 'denied',
    GRANTED: 'granted',
    UNDETERMINED: 'undetermined',
  },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({
    canAskAgain: true,
    expires: 'never',
    granted: true,
    status: 'granted',
  })),
  requestPermissionsAsync: jest.fn(async () => ({
    canAskAgain: true,
    expires: 'never',
    granted: true,
    status: 'granted',
  })),
  scheduleNotificationAsync: jest.fn(async (request) => request.identifier),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
}));
jest.mock('expo-intent-launcher', () => ({
  ActivityAction: {
    REQUEST_SCHEDULE_EXACT_ALARM: 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
  },
  startActivityAsync: jest.fn(async () => ({ resultCode: 0 })),
}));
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
require('react-native-reanimated').setUpTests();
