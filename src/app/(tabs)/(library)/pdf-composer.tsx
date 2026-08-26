import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, FileText, GripVertical, ImageIcon, Square } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sortable, {
  type SortableGridDragEndCallback,
  type SortableGridRenderItem,
} from 'react-native-sortables';

import { AppText } from '@/components/app-text';
import { NameDialog } from '@/components/name-dialog';
import { getLibraryFile, listDirectory } from '@/services/library-files';
import { createLibraryPdf, type PdfSourceFile } from '@/services/pdf-files';
import { useLibraryStore } from '@/store/library-store';
import { useThemeColors } from '@/store/theme-store';

function loadSources(folderId: string, path?: string): PdfSourceFile[] {
  return listDirectory(folderId, path).flatMap((entry) =>
    entry.kind === 'image' || entry.kind === 'pdf'
      ? [
          {
            kind: entry.kind,
            name: entry.name,
            uri: getLibraryFile(folderId, entry.relativePath).uri,
          },
        ]
      : [],
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'This folder could not be read.';
}

export default function PdfComposerScreen() {
  const { folderId, path } = useLocalSearchParams<{ folderId: string; path?: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const touchFolder = useLibraryStore((state) => state.touchFolder);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();
  const [initialLoad] = useState(() => {
    try {
      return { error: null, sources: loadSources(folderId, path) };
    } catch (error) {
      return { error: getErrorMessage(error), sources: [] as PdfSourceFile[] };
    }
  });
  const [sources, setSources] = useState(initialLoad.sources);
  const [selectedUris, setSelectedUris] = useState(() => new Set(sources.map((source) => source.uri)));
  const [nameDialogVisible, setNameDialogVisible] = useState(false);
  const [completed, setCompleted] = useState(0);

  const selectedCount = selectedUris.size;

  function toggleSource(uri: string) {
    void Haptics.selectionAsync();
    setSelectedUris((current) => {
      const next = new Set(current);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  }

  const moveSource = useCallback((index: number, offset: -1 | 1) => {
    setSources((current) => {
      const toIndex = index + offset;
      if (toIndex < 0 || toIndex >= current.length) {
        return current;
      }
      const reordered = [...current];
      [reordered[index], reordered[toIndex]] = [reordered[toIndex], reordered[index]];
      return reordered;
    });
    void Haptics.selectionAsync();
  }, []);

  const renderSource = useCallback<SortableGridRenderItem<PdfSourceFile>>(
    ({ index, item }) => {
      const selected = selectedUris.has(item.uri);
      const Icon = item.kind === 'pdf' ? FileText : ImageIcon;

      return (
        <View
          className={`h-[76px] flex-row items-center rounded-2xl border px-3 ${
            selected ? 'border-purple bg-paper-raised' : 'border-line bg-paper'
          }`}>
          <Pressable
            accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${item.name}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            className="h-12 w-12 items-center justify-center"
            hitSlop={4}
            onPress={() => toggleSource(item.uri)}>
            {selected ? (
              <View className="h-7 w-7 items-center justify-center rounded-lg bg-purple">
                <Check color={colors.onPurple} size={19} strokeWidth={3} />
              </View>
            ) : (
              <Square color={colors.muted} size={28} strokeWidth={1.8} />
            )}
          </Pressable>

          <View className="mr-3 h-12 w-12 overflow-hidden rounded-xl border border-line bg-paper">
            {item.kind === 'image' ? (
              <Image accessibilityIgnoresInvertColors contentFit="cover" source={{ uri: item.uri }} style={{ flex: 1 }} />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Icon color={colors.purple} size={25} strokeWidth={2.2} />
              </View>
            )}
          </View>

          <View className="min-w-0 flex-1">
            <AppText variant="label" numberOfLines={1}>
              {item.name}
            </AppText>
            <AppText variant="caption">{item.kind === 'pdf' ? 'PDF document' : 'Image'}</AppText>
          </View>

          <Sortable.Handle>
            <Pressable
              accessibilityActions={[
                { label: 'Move earlier', name: 'decrement' },
                { label: 'Move later', name: 'increment' },
              ]}
              accessibilityLabel={`Reorder ${item.name}`}
              accessibilityRole="adjustable"
              accessibilityValue={{ text: `${index + 1} of ${sources.length}` }}
              className="h-12 w-12 items-center justify-center"
              hitSlop={4}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'decrement') {
                  moveSource(index, -1);
                } else if (event.nativeEvent.actionName === 'increment') {
                  moveSource(index, 1);
                }
              }}>
              <GripVertical color={colors.ink} size={24} />
            </Pressable>
          </Sortable.Handle>
        </View>
      );
    },
    [colors.ink, colors.muted, colors.onPurple, colors.purple, moveSource, selectedUris, sources.length],
  );

  const handleDragEnd = useCallback<SortableGridDragEndCallback<PdfSourceFile>>(
    ({ data }) => setSources(data),
    [],
  );

  async function createPdf(name: string) {
    setCompleted(0);
    await createLibraryPdf({
      folderId,
      outputName: name,
      path,
      sources: sources.filter((source) => selectedUris.has(source.uri)),
      onProgress: (nextCompleted) => setCompleted(nextCompleted),
    });
    await touchFolder(folderId).catch(() => undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ title: 'Create PDF' }} />
      <Animated.ScrollView
        ref={scrollableRef}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 104,
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
        showsVerticalScrollIndicator={false}>
        <View className="mb-5">
          <AppText variant="title">Build your PDF</AppText>
          <AppText className="mt-2 max-w-xl" variant="body">
            Choose files, then drag the handles to set the page order. Each PDF stays together as one block.
          </AppText>
        </View>

        {initialLoad.error ? (
          <View className="rounded-2xl border border-danger bg-paper-raised px-5 py-4">
            <AppText variant="label" className="text-danger">
              Could not open this folder
            </AppText>
            <AppText variant="caption" className="mt-1 text-danger">
              {initialLoad.error}
            </AppText>
          </View>
        ) : sources.length > 0 ? (
          <Sortable.Grid
            activeItemScale={1.01}
            columns={1}
            customHandle
            data={sources}
            keyExtractor={(item) => item.uri}
            renderItem={renderSource}
            rowGap={12}
            scrollableRef={scrollableRef}
            onDragEnd={handleDragEnd}
            onDragStart={() => void Haptics.selectionAsync()}
          />
        ) : (
          <View className="rounded-[28px] border-2 border-strong-line bg-paper-raised p-6">
            <AppText variant="title" className="text-2xl">No files to combine</AppText>
            <AppText className="mt-2">Add an image or PDF to this folder first.</AppText>
          </View>
        )}
      </Animated.ScrollView>

      <View
        className="absolute inset-x-0 bottom-0 border-t border-line bg-paper px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <View className="mx-auto w-full max-w-xl flex-row items-center gap-4">
          <AppText variant="caption" className="flex-1">
            {selectedCount} {selectedCount === 1 ? 'file' : 'files'} selected
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: selectedCount === 0 }}
            className={`min-h-12 min-w-36 items-center justify-center rounded-2xl px-6 ${
              selectedCount > 0 ? 'bg-purple active:bg-purple-dark' : 'bg-line'
            }`}
            disabled={selectedCount === 0}
            onPress={() => setNameDialogVisible(true)}>
            <AppText variant="label" className={selectedCount > 0 ? 'text-on-purple' : 'text-muted'}>
              Create PDF
            </AppText>
          </Pressable>
        </View>
      </View>

      <NameDialog
        confirmLabel="Create PDF"
        initialValue="Combined"
        inputLabel="PDF name"
        submittingLabel={completed > 0 ? `${completed} of ${selectedCount}` : 'Building...'}
        title="Name your PDF"
        visible={nameDialogVisible}
        onClose={() => setNameDialogVisible(false)}
        onSubmit={createPdf}
      />
    </View>
  );
}
