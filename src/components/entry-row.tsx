import {
  Check,
  File,
  FileText,
  Folder,
  Image as ImageIcon,
  MoreHorizontal,
  Star,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useThemeColors } from '@/store/theme-store';
import type { LibraryEntry } from '@/types/library';

export function EntryRow({
  entry,
  favourite,
  onLongPress,
  onMenu,
  onPress,
  selected = false,
  selecting = false,
}: {
  entry: LibraryEntry;
  favourite: boolean;
  onLongPress?: () => void;
  onMenu: () => void;
  onPress: () => void;
  selected?: boolean;
  selecting?: boolean;
}) {
  const colors = useThemeColors();
  const [pressed, setPressed] = useState(false);
  const [menuPressed, setMenuPressed] = useState(false);
  const isDirectory = entry.kind === 'directory';
  const Icon = isDirectory
    ? Folder
    : entry.kind === 'image'
      ? ImageIcon
      : FileText;
  const detail = isDirectory
    ? formatChildCount(entry.childCount)
    : formatFileSize(entry.size, entry.kind as Exclude<LibraryEntry['kind'], 'directory'>);
  return (
    <View
      className={`mb-3 flex-row items-stretch overflow-hidden rounded-[22px] border-2 ${selecting && selected ? 'border-purple' : 'border-strong-line'}`}
      style={{ backgroundColor: pressed ? colors.surfacePressed : colors.paperRaised }}>
      <Pressable
        accessibilityHint={selecting ? undefined : 'Long press to select'}
        accessibilityLabel={
          selecting
            ? `${selected ? 'Deselect' : 'Select'} ${entry.name}`
            : `Open ${entry.name}${favourite ? ', Favourited' : ''}${isDirectory && entry.childCount !== null ? `, ${detail}` : ''}`
        }
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        className="min-h-[80px] flex-1 flex-row items-center px-4 py-3"
        onLongPress={onLongPress}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}>
        {selecting ? (
          <View
            accessible={false}
            className={`mr-3 h-7 w-7 items-center justify-center rounded-lg border-2 ${selected ? 'border-purple bg-purple' : 'border-ink bg-paper-raised'}`}
            testID={`selection-checkbox-${entry.relativePath}`}>
            {selected ? <Check color={colors.onPurple} size={18} strokeWidth={3} /> : null}
          </View>
        ) : favourite ? (
          <View accessible={false} className="mr-2 items-center justify-center">
            <Star color={colors.purple} fill={colors.purple} size={20} />
          </View>
        ) : null}
        <View className={`h-12 w-12 items-center justify-center rounded-xl ${isDirectory ? 'bg-purple' : 'bg-ink'}`}>
          {entry.kind === 'pdf' ? (
            <View className="h-8 w-8 items-center justify-center">
              <File color={colors.paper} size={30} testID="pdf-entry-icon" />
              <View
                className="absolute bottom-0 left-0 right-0 items-center justify-center overflow-hidden rounded-full bg-purple p-px"
                testID="pdf-entry-pill">
                <AppText
                  adjustsFontSizeToFit
                  ellipsizeMode="clip"
                  maxFontSizeMultiplier={1.25}
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  variant="label"
                  className="w-full text-center text-[10px] leading-3 text-on-purple">
                  PDF
                </AppText>
              </View>
            </View>
          ) : (
            <Icon color={isDirectory ? colors.onPurple : colors.paper} size={25} />
          )}
        </View>
        <View className="ml-4 flex-1">
          <AppText variant="label" numberOfLines={2}>
            {entry.name}
          </AppText>
          <AppText variant="caption" className="mt-0.5">
            {detail}
          </AppText>
        </View>
      </Pressable>
      {!selecting ? (
        <View className="w-14 items-center justify-center">
          <Pressable
            accessibilityLabel={`Manage ${entry.name}`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={onMenu}
            onPressIn={() => setMenuPressed(true)}
            onPressOut={() => setMenuPressed(false)}
            style={{
              alignItems: 'center',
              backgroundColor: menuPressed ? colors.surfacePressed : 'transparent',
              borderRadius: 22,
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}>
            <MoreHorizontal color={colors.ink} size={23} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function formatChildCount(count: number | null): string {
  if (count === null) {
    return 'Folder';
  }
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

function formatFileSize(bytes: number | null, kind: Exclude<LibraryEntry['kind'], 'directory'>): string {
  if (bytes === null || bytes <= 0) {
    return kind === 'pdf' ? 'PDF document' : kind === 'image' ? 'Image' : 'Text file';
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
