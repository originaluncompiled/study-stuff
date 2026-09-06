import * as Haptics from 'expo-haptics';
import { Bell, EyeOff, Moon } from 'lucide-react-native';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { getMainTabBarHeight } from '@/components/main-tab-bar';
import { useThemeColors, useThemeStore } from '@/store/theme-store';
import { useTimerStore } from '@/store/timer-store';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const mode = useThemeStore((state) => state.mode);
  const error = useThemeStore((state) => state.error);
  const saving = useThemeStore((state) => state.saving);
  const setMode = useThemeStore((state) => state.setMode);
  const hideTimerWhileStudying = useTimerStore((state) => state.hideTimerWhileStudying);
  const timerPreferenceError = useTimerStore((state) => state.preferenceError);
  const timerPreferenceSaving = useTimerStore((state) => state.preferenceSaving);
  const setHideTimerWhileStudying = useTimerStore((state) => state.setHideTimerWhileStudying);
  const notifyWhenTimerEnds = useTimerStore((state) => state.notifyWhenTimerEnds);
  const notificationError = useTimerStore((state) => state.notificationError);
  const notificationSaving = useTimerStore((state) => state.notificationSaving);
  const setNotifyWhenTimerEnds = useTimerStore((state) => state.setNotifyWhenTimerEnds);
  const darkMode = mode === 'dark';

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: getMainTabBarHeight(insets.bottom) + 16,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}>
        <View className="pt-5">
          <View className="mb-3 h-2 w-16 rounded-full bg-purple" />
          <AppText variant="display">Settings</AppText>
        </View>

        <View className="mt-10 w-full max-w-xl self-center">
          <AppText className="text-2xl" variant="title">
            Appearance
          </AppText>
          <View className="mt-3 min-h-20 flex-row items-center rounded-[22px] border-2 border-strong-line bg-paper-raised px-4 py-3">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-ink">
              <Moon color={colors.paper} size={23} strokeWidth={2.2} />
            </View>
            <View className="ml-4 flex-1 pr-3">
              <AppText variant="label">Dark mode</AppText>
            </View>
            <Switch
              accessibilityLabel="Dark mode"
              accessibilityRole="switch"
              accessibilityState={{ busy: saving, checked: darkMode, disabled: saving }}
              disabled={saving}
              ios_backgroundColor={colors.line}
              thumbColor={darkMode ? colors.offWhite : colors.paperRaised}
              trackColor={{ false: colors.muted, true: colors.purple }}
              value={darkMode}
              onValueChange={(enabled) =>
                updateSetting(() => void setMode(enabled ? 'dark' : 'light'))
              }
            />
          </View>
          {error ? (
            <AppText
              accessibilityLiveRegion="polite"
              className="mt-3"
              style={{ color: colors.danger }}
              variant="caption">
              {error}
            </AppText>
          ) : null}
        </View>

        <View className="mt-8 w-full max-w-xl self-center">
          <AppText className="text-2xl" variant="title">
            Timer
          </AppText>
          <View className="mt-3 min-h-20 flex-row items-center rounded-[22px] border-2 border-strong-line bg-paper-raised px-4 py-3">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-ink">
              <EyeOff color={colors.paper} size={23} strokeWidth={2.2} />
            </View>
            <View className="ml-4 flex-1 pr-3">
              <AppText variant="label">Hide timer while studying</AppText>
            </View>
            <Switch
              accessibilityHint="Hides the countdown in viewer pills during study time."
              accessibilityLabel="Hide timer while studying"
              accessibilityRole="switch"
              accessibilityState={{
                busy: timerPreferenceSaving,
                checked: hideTimerWhileStudying,
                disabled: timerPreferenceSaving,
              }}
              disabled={timerPreferenceSaving}
              ios_backgroundColor={colors.line}
              thumbColor={hideTimerWhileStudying ? colors.offWhite : colors.paperRaised}
              trackColor={{ false: colors.muted, true: colors.purple }}
              value={hideTimerWhileStudying}
              onValueChange={(hidden) =>
                updateSetting(() => void setHideTimerWhileStudying(hidden))
              }
            />
          </View>
          {timerPreferenceError ? (
            <AppText
              accessibilityLiveRegion="polite"
              className="mt-3"
              style={{ color: colors.danger }}
              variant="caption">
              {timerPreferenceError}
            </AppText>
          ) : null}
        </View>

        <View className="mt-8 w-full max-w-xl self-center">
          <AppText className="text-2xl" variant="title">
            Notifications
          </AppText>
          <View className="mt-3 min-h-20 flex-row items-center rounded-[22px] border-2 border-strong-line bg-paper-raised px-4 py-3">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-ink">
              <Bell color={colors.paper} size={23} strokeWidth={2.2} />
            </View>
            <View className="ml-4 flex-1 pr-3">
              <AppText variant="label">Notify when timer reaches 0</AppText>
            </View>
            <Switch
              accessibilityLabel="Notify when timer reaches 0"
              accessibilityRole="switch"
              accessibilityState={{
                busy: notificationSaving,
                checked: notifyWhenTimerEnds,
                disabled: notificationSaving,
              }}
              disabled={notificationSaving}
              ios_backgroundColor={colors.line}
              thumbColor={notifyWhenTimerEnds ? colors.offWhite : colors.paperRaised}
              trackColor={{ false: colors.muted, true: colors.purple }}
              value={notifyWhenTimerEnds}
              onValueChange={(enabled) =>
                updateSetting(() => void setNotifyWhenTimerEnds(enabled))
              }
            />
          </View>
          {notificationError ? (
            <AppText
              accessibilityLiveRegion="polite"
              className="mt-3"
              style={{ color: colors.danger }}
              variant="caption">
              {notificationError}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function updateSetting(update: () => void): void {
  void Haptics.selectionAsync();
  update();
}
