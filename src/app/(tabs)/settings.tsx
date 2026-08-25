import { Moon } from 'lucide-react-native';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { getMainTabBarHeight } from '@/components/main-tab-bar';
import { useThemeColors, useThemeStore } from '@/store/theme-store';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const mode = useThemeStore((state) => state.mode);
  const error = useThemeStore((state) => state.error);
  const saving = useThemeStore((state) => state.saving);
  const setMode = useThemeStore((state) => state.setMode);
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
              onValueChange={(enabled) => void setMode(enabled ? 'dark' : 'light')}
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
      </ScrollView>
    </SafeAreaView>
  );
}
