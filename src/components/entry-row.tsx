import { FileText, Folder, MoreHorizontal, Star } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';
import type { LibraryEntry } from '@/types/library';

export function EntryRow({
  entry,
  favourite,
  onMenu,
  onPress,
}: {
  entry: LibraryEntry;
  favourite: boolean;
  onMenu: () => void;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const [menuPressed, setMenuPressed] = useState(false);
  const isDirectory = entry.kind === 'directory';
  const Icon = isDirectory ? Folder : FileText;
  const detail = isDirectory ? formatChildCount(entry.childCount) : formatFileSize(entry.size);
  return (
    <View
      className="mb-3 flex-row items-stretch overflow-hidden rounded-[22px] border-2 border-ink"
      style={{ backgroundColor: pressed ? '#EEE4CF' : colors.paperRaised }}>
      <Pressable
        accessibilityLabel={`Open ${entry.name}${favourite ? ', Favourited' : ''}${isDirectory && entry.childCount !== null ? `, ${detail}` : ''}`}
        accessibilityRole="button"
        className="min-h-[80px] flex-1 flex-row items-center px-4 py-3"
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}>
        {favourite ? (
          <View accessible={false} className="mr-2 items-center justify-center">
            <Star color={colors.purple} fill={colors.purple} size={20} />
          </View>
        ) : null}
        <View className={`h-12 w-12 items-center justify-center rounded-xl ${isDirectory ? 'bg-purple' : 'bg-ink'}`}>
          <Icon color={isDirectory ? colors.paperRaised : colors.paper} size={25} />
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
            backgroundColor: menuPressed ? '#EEE4CF' : 'transparent',
            borderRadius: 22,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}>
          <MoreHorizontal color={colors.ink} size={23} />
        </Pressable>
      </View>
    </View>
  );
}

function formatChildCount(count: number | null): string {
  if (count === null) {
    return 'Folder';
  }
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) {
    return 'PDF document';
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
