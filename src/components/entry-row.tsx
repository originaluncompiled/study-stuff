import { FileText, Folder, MoreVertical } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';
import type { LibraryEntry } from '@/types/library';

export function EntryRow({
  entry,
  onMenu,
  onPress,
}: {
  entry: LibraryEntry;
  onMenu: () => void;
  onPress: () => void;
}) {
  const isDirectory = entry.kind === 'directory';
  const Icon = isDirectory ? Folder : FileText;
  const detail = isDirectory ? formatChildCount(entry.childCount) : formatFileSize(entry.size);
  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-line bg-paper-raised">
      <Pressable
        accessibilityLabel={`Open ${entry.name}${isDirectory && entry.childCount !== null ? `, ${detail}` : ''}`}
        accessibilityRole="button"
        className="min-h-[76px] flex-1 flex-row items-center px-4 py-3 active:bg-[#EEE4CF]"
        onPress={onPress}>
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
      <Pressable
        accessibilityLabel={`Manage ${entry.name}`}
        accessibilityRole="button"
        className="mr-2 h-12 w-12 items-center justify-center rounded-full active:bg-line/40"
        hitSlop={6}
        onPress={onMenu}>
        <MoreVertical color={colors.ink} size={22} />
      </Pressable>
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
