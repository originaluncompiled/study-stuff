import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { AlertCircle, Check, Pencil } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { AppText } from '@/components/app-text';
import {
  ImmersiveViewerChrome,
  useImmersiveViewerChrome,
} from '@/components/immersive-viewer-chrome';
import { iconButtonRipple } from '@/constants/press-feedback';
import { normalizeRelativePath } from '@/lib/paths';
import { readTextFile, writeTextFile } from '@/services/library-files';
import { useLibraryStore } from '@/store/library-store';
import { useThemeColors, useThemeStore } from '@/store/theme-store';

const HEADER_SCROLL_THRESHOLD = 12;

export default function TextScreen() {
  const params = useLocalSearchParams<'/text/[folderId]'>();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const themeMode = useThemeStore((state) => state.mode);
  const touchFolder = useLibraryStore((state) => state.touchFolder);
  const rawPath = Array.isArray(params.path) ? params.path[0] : params.path;
  const rawEdit = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const [relativePath, setRelativePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Text file');
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [editing, setEditing] = useState(rawEdit === '1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const previousScrollY = useRef(0);
  const directionalScrollTravel = useRef(0);
  const pendingRemoveAction = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);
  const dirty = content !== savedContent;
  const effectiveHeaderVisible = editing || Boolean(error) || headerVisible;
  const chrome = useImmersiveViewerChrome(effectiveHeaderVisible);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const nextPath = normalizeRelativePath(rawPath);
          const text = await readTextFile(params.folderId, nextPath);
          if (!cancelled) {
            setRelativePath(nextPath);
            setFileName(nextPath.split('/').at(-1) || 'Text file');
            setContent(text);
            setSavedContent(text);
            setEditing(rawEdit === '1');
          }
        } catch (loadError) {
          if (!cancelled) {
            setError(getErrorMessage(loadError));
            setHeaderVisible(true);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [params.folderId, rawEdit, rawPath]);

  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('Discard unsaved changes?', `Your edits to ${fileName} will be lost.`, [
      { style: 'cancel', text: 'Keep editing' },
      {
        style: 'destructive',
        text: 'Discard',
        onPress: () => {
          pendingRemoveAction.current = data.action;
          setSavedContent(content);
          setDiscarding(true);
        },
      },
    ]);
  });

  useEffect(() => {
    if (!discarding || dirty || !pendingRemoveAction.current) {
      return;
    }
    navigation.dispatch(pendingRemoveAction.current);
  }, [dirty, discarding, navigation]);

  async function save() {
    if (!relativePath || saving || !dirty) {
      if (!dirty) {
        setEditing(false);
      }
      return;
    }
    setSaving(true);
    try {
      await writeTextFile(params.folderId, relativePath, content);
      setSavedContent(content);
      setEditing(false);
      setHeaderVisible(true);
      void touchFolder(params.folderId).catch(() => undefined);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (saveError) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not save text file', getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  function trackScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (editing) {
      return;
    }
    const scrollY = Math.max(event.nativeEvent.contentOffset.y, 0);
    const delta = scrollY - previousScrollY.current;
    previousScrollY.current = scrollY;
    if (delta === 0) {
      return;
    }
    if (
      directionalScrollTravel.current !== 0 &&
      Math.sign(directionalScrollTravel.current) !== Math.sign(delta)
    ) {
      directionalScrollTravel.current = delta;
    } else {
      directionalScrollTravel.current += delta;
    }
    if (Math.abs(directionalScrollTravel.current) >= HEADER_SCROLL_THRESHOLD) {
      setHeaderVisible(directionalScrollTravel.current < 0 || scrollY === 0);
      directionalScrollTravel.current = 0;
    }
  }

  const headerAction = error || loading ? null : editing ? (
    <Pressable
      accessibilityLabel="Save changes"
      accessibilityRole="button"
      accessibilityState={{ busy: saving, disabled: saving }}
      android_ripple={iconButtonRipple}
      className="h-11 w-12 items-center justify-center rounded-full active:bg-line/50"
      disabled={saving}
      onPress={() => void save()}>
      {saving ? <ActivityIndicator color={colors.purple} size="small" /> : <Check color={colors.ink} size={24} />}
    </Pressable>
  ) : (
    <Pressable
      accessibilityLabel="Edit text file"
      accessibilityRole="button"
      android_ripple={iconButtonRipple}
      className="h-11 w-12 items-center justify-center rounded-full active:bg-line/50"
      onPress={() => {
        setEditing(true);
        setHeaderVisible(true);
      }}>
      <Pencil color={colors.ink} size={21} />
    </Pressable>
  );

  return (
    <View className="flex-1 bg-paper">
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.purple} size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-7">
          <View className="h-20 w-20 items-center justify-center rounded-[26px] bg-purple">
            <AlertCircle color={colors.onPurple} size={38} />
          </View>
          <AppText variant="title" className="mt-5 text-center text-2xl">
            Could not display this text file
          </AppText>
          <AppText variant="caption" className="mt-2 text-center text-danger">
            {error}
          </AppText>
        </View>
      ) : editing ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1">
          <TextInput
            accessibilityLabel={`Edit ${fileName}`}
            className="flex-1 px-5 text-base text-ink"
            disableFullscreenUI
            multiline
            keyboardAppearance={themeMode}
            selectionColor={colors.purple}
            style={{
              fontFamily: 'DMSans_400Regular',
              paddingBottom: Math.max(chrome.insets.bottom, 20),
              paddingTop: chrome.headerHeight + 16,
              textAlignVertical: 'top',
            }}
            value={content}
            onChangeText={setContent}
          />
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          accessibilityLabel={`${fileName} contents`}
          contentContainerStyle={{
            minHeight: '100%',
            paddingBottom: Math.max(chrome.insets.bottom, 20) + 24,
            paddingHorizontal: 20,
            paddingTop: chrome.headerHeight + 20,
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScroll={trackScroll}>
          <View className="rounded-[24px] border border-line bg-paper-raised px-5 py-5">
            <AppText selectable variant="body" className="leading-7">
              {content || 'This text file is empty.'}
            </AppText>
          </View>
        </ScrollView>
      )}

      <ImmersiveViewerChrome
        chrome={chrome}
        headerVisible={effectiveHeaderVisible}
        onBack={() => router.back()}
        rightAction={headerAction}
        testIDPrefix="text"
        title={fileName}
        tone="paper"
      />
    </View>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'This text file could not be opened.';
}
