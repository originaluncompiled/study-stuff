import {
  Check,
  File,
  FileText,
  Folder,
  Image as ImageIcon,
  MoreHorizontal,
  Star,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { iconButtonRipple } from '@/constants/press-feedback';
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
  const selectionProgress = useSharedValue(selecting ? 1 : 0);
  const selectedProgress = useSharedValue(selected ? 1 : 0);
  const rowScale = useSharedValue(1);
  const isDirectory = entry.kind === 'directory';
  const Icon = isDirectory
    ? Folder
    : entry.kind === 'image'
      ? ImageIcon
      : FileText;
  const detail = isDirectory
    ? formatChildCount(entry.childCount)
    : formatFileSize(entry.size, entry.kind as Exclude<LibraryEntry['kind'], 'directory'>);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      selectedProgress.get(),
      [0, 1],
      [colors.strongLine, colors.purple],
    ),
    transform: [{ scale: rowScale.get() }],
  }));
  const selectionControlAnimatedStyle = useAnimatedStyle(() => ({
    marginRight: selectionProgress.get() * 12,
    opacity: selectionProgress.get(),
    transform: [{ scale: 0.7 + selectionProgress.get() * 0.3 }],
    width: selectionProgress.get() * 28,
  }));
  const favouriteAnimatedStyle = useAnimatedStyle(() => ({
    marginRight: (1 - selectionProgress.get()) * 8,
    opacity: 1 - selectionProgress.get(),
    transform: [{ scale: 1 - selectionProgress.get() * 0.3 }],
    width: (1 - selectionProgress.get()) * 20,
  }));
  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - selectionProgress.get(),
    transform: [{ scale: 1 - selectionProgress.get() * 0.2 }],
    width: (1 - selectionProgress.get()) * 56,
  }));

  useEffect(() => {
    selectionProgress.set(
      withTiming(selecting ? 1 : 0, {
        duration: 180,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [selecting, selectionProgress]);

  useEffect(() => {
    selectedProgress.set(
      withTiming(selected ? 1 : 0, {
        duration: 160,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [selected, selectedProgress]);

  function handleLongPress() {
    rowScale.set(
      withSequence(
        withTiming(0.97, { duration: 80, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 140, reduceMotion: ReduceMotion.System }),
      ),
    );
    onLongPress?.();
  }

  return (
    <Animated.View
      className="mb-3 flex-row items-stretch overflow-hidden rounded-[22px] border-2"
      style={[
        { backgroundColor: pressed ? colors.surfacePressed : colors.paperRaised },
        rowAnimatedStyle,
      ]}
      testID={`entry-row-${entry.relativePath}`}>
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
        onLongPress={handleLongPress}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}>
        <Animated.View
          accessible={false}
          className="items-center justify-center overflow-hidden"
          style={selectionControlAnimatedStyle}
          testID={`selection-control-${entry.relativePath}`}>
          <View
            accessible={false}
            className={`h-7 w-7 items-center justify-center rounded-lg border-2 ${selected ? 'border-purple bg-purple' : 'border-ink bg-paper-raised'}`}
            testID={`selection-checkbox-${entry.relativePath}`}>
            {selected ? <Check color={colors.onPurple} size={18} strokeWidth={3} /> : null}
          </View>
        </Animated.View>
        {favourite ? (
          <Animated.View
            accessible={false}
            className="items-center justify-center overflow-hidden"
            style={favouriteAnimatedStyle}>
            <Star color={colors.purple} fill={colors.purple} size={20} />
          </Animated.View>
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
      <Animated.View
        accessibilityElementsHidden={selecting}
        className="items-center justify-center overflow-hidden"
        importantForAccessibility={selecting ? 'no-hide-descendants' : 'auto'}
        pointerEvents={selecting ? 'none' : 'auto'}
        style={menuAnimatedStyle}
        testID={`entry-menu-${entry.relativePath}`}>
        <Pressable
          accessibilityLabel={`Manage ${entry.name}`}
          accessibilityRole="button"
          android_ripple={iconButtonRipple}
          hitSlop={6}
          onPress={onMenu}
          onPressIn={() => Platform.OS !== 'android' && setMenuPressed(true)}
          onPressOut={() => Platform.OS !== 'android' && setMenuPressed(false)}
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
      </Animated.View>
    </Animated.View>
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
