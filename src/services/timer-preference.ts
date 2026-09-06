import AsyncStorage from '@react-native-async-storage/async-storage';

export const hideTimerWhileStudyingStorageKey = 'studystuff:hide-timer-while-studying:v1';
export const notifyWhenTimerEndsStorageKey = 'studystuff:notify-when-timer-ends:v1';

export async function readHideTimerWhileStudying(): Promise<boolean> {
  return (await AsyncStorage.getItem(hideTimerWhileStudyingStorageKey)) === 'true';
}

export async function writeHideTimerWhileStudying(hidden: boolean): Promise<void> {
  await AsyncStorage.setItem(hideTimerWhileStudyingStorageKey, String(hidden));
}

export async function readNotifyWhenTimerEnds(): Promise<boolean> {
  return (await AsyncStorage.getItem(notifyWhenTimerEndsStorageKey)) === 'true';
}

export async function writeNotifyWhenTimerEnds(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(notifyWhenTimerEndsStorageKey, String(enabled));
}
