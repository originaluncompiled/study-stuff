import { LibraryBig } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';

export function getLibraryTabBarHeight(bottomInset: number): number {
  return 64 + Math.max(bottomInset, 12);
}

export function LibraryTabBar({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 items-center px-6 pt-2"
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <Pressable
        accessibilityLabel="Library"
        accessibilityRole="tab"
        accessibilityState={{ selected: true }}
        className="min-h-14 w-44 flex-row items-center justify-center gap-2 rounded-full bg-ink px-6 active:opacity-90"
        onPress={onPress}>
        <LibraryBig color={colors.purple} size={22} strokeWidth={2.4} />
        <AppText variant="label" className="text-paper">
          Library
        </AppText>
      </Pressable>
    </View>
  );
}
