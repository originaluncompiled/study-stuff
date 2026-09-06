import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { iconButtonRipple } from '@/constants/press-feedback';
import { useThemeColors } from '@/store/theme-store';

export function SelectAllButton({
  onPress,
  selectedCount,
  totalCount,
}: {
  onPress: () => void;
  selectedCount: number;
  totalCount: number;
}) {
  const colors = useThemeColors();
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const partiallySelected = selectedCount > 0 && !allSelected;
  const disabled = totalCount === 0;

  return (
    <Pressable
      accessibilityLabel={allSelected ? 'Unselect all' : 'Select all'}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: partiallySelected ? 'mixed' : allSelected,
        disabled,
      }}
      android_ripple={iconButtonRipple}
      className="h-11 w-11 items-center justify-center rounded-full ios:active:bg-line/50 web:active:bg-line/50"
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}>
      <View
        accessible={false}
        className={`h-6 w-6 items-center justify-center rounded-lg border-2 ${
          allSelected ? 'border-purple bg-purple' : 'border-ink bg-paper-raised'
        }`}>
        {allSelected ? (
          <Check color={colors.onPurple} size={16} strokeWidth={3} />
        ) : partiallySelected ? (
          <View className="h-0.5 w-3 rounded-full bg-ink" />
        ) : null}
      </View>
    </Pressable>
  );
}
