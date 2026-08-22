import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { colors, folderColorOptions } from '@/constants/theme';
import type { FolderColor } from '@/types/library';

type FolderColorPickerProps = {
  disabled?: boolean;
  onSelect: (color: FolderColor) => void;
  selected: FolderColor;
};

export function FolderColorPicker({ disabled, onSelect, selected }: FolderColorPickerProps) {
  return (
    <View className="flex-row flex-wrap justify-center gap-3 px-0.5 pb-0.5">
      {folderColorOptions.map((option) => {
        const isSelected = option.id === selected;
        const checkColor = ['blue', 'purple', 'black'].includes(option.id)
          ? colors.paperRaised
          : colors.ink;
        return (
          <Pressable
            accessibilityLabel={`${option.label} folder colour`}
            accessibilityRole="radio"
            accessibilityState={{ disabled, selected: isSelected }}
            className="h-14 w-14 items-center justify-center rounded-full active:opacity-70"
            disabled={disabled}
            key={option.id}
            onPress={() => onSelect(option.id)}>
            <View
              className="h-12 w-12 items-center justify-center rounded-full border-2 border-ink"
              style={{ backgroundColor: option.hex }}>
              {isSelected ? <Check color={checkColor} size={25} strokeWidth={3} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
