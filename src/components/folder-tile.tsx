import { Folder, MoreHorizontal, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, folderColorValues } from '@/constants/theme';
import { useThemeColors } from '@/store/theme-store';
import type { FolderColor } from '@/types/library';

type FolderTileProps =
  | {
      add: true;
      color?: never;
      name?: never;
      onMenu?: never;
      onMoveEarlier?: never;
      onMoveLater?: never;
      onPress: () => void;
    }
  | {
      add?: false;
      color: FolderColor;
      name: string;
      onMenu: () => void;
      onMoveEarlier?: () => void;
      onMoveLater?: () => void;
      onPress: () => void;
    };

export function FolderTile(props: FolderTileProps) {
  const themeColors = useThemeColors();
  const add = props.add === true;
  const name = add ? undefined : props.name;
  const accessibilityActions = add
    ? undefined
    : [
        ...(props.onMoveEarlier ? [{ label: 'Move earlier', name: 'moveEarlier' }] : []),
        ...(props.onMoveLater ? [{ label: 'Move later', name: 'moveLater' }] : []),
      ];

  return (
    <View className="w-full">
      <View className="relative aspect-[1.2]">
        <View className="absolute inset-0 translate-x-1 translate-y-1 rounded-[26px] bg-offset-shadow" />
        <Pressable
          accessibilityActions={accessibilityActions}
          accessibilityHint={add ? undefined : 'Long press and drag to reorder.'}
          accessibilityLabel={add ? 'Add folder' : `Open ${name}`}
          accessibilityRole="button"
          className={`flex-1 items-center justify-center rounded-[26px] border-2 active:opacity-90 ${
            add ? 'border-dashed border-strong-line bg-paper-raised' : 'border-contrast-line'
          }`}
          onAccessibilityAction={(event) => {
            if (add) {
              return;
            }
            if (event.nativeEvent.actionName === 'moveEarlier') {
              props.onMoveEarlier?.();
            } else if (event.nativeEvent.actionName === 'moveLater') {
              props.onMoveLater?.();
            }
          }}
          onPress={props.onPress}
          style={add ? undefined : { backgroundColor: folderColorValues[props.color] }}>
          {add ? (
            <Plus color={themeColors.purple} size={48} strokeWidth={2.2} />
          ) : (
            <Folder color={colors.ink} fill={colors.paperRaised} size={62} strokeWidth={1.8} />
          )}
        </Pressable>
        {!add ? (
          <Pressable
            accessibilityLabel={`Manage ${name}`}
            accessibilityRole="button"
            className="absolute right-2 top-2 h-10 w-10 items-center justify-center rounded-full bg-paper-raised/90 active:bg-paper"
            hitSlop={8}
            onPress={props.onMenu}>
            <MoreHorizontal color={themeColors.ink} size={23} />
          </Pressable>
        ) : null}
      </View>
      <AppText
        className={`mt-3 px-1 text-center ${add ? 'text-purple' : 'text-ink'}`}
        numberOfLines={2}
        variant="label">
        {add ? 'Add folder' : name}
      </AppText>
    </View>
  );
}
