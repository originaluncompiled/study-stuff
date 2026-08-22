import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { FilePlus2, FolderInput, Palette, Pencil, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Sortable, {
  type SortableGridDragEndCallback,
  type SortableGridRenderItem,
} from 'react-native-sortables';

import { ActionRow, ActionSheet } from '@/components/action-sheet';
import { AppText } from '@/components/app-text';
import { FolderColorPicker } from '@/components/folder-color-picker';
import { FolderTile } from '@/components/folder-tile';
import { ImportOverlay } from '@/components/import-overlay';
import { getLibraryTabBarHeight } from '@/components/library-tab-bar';
import { NameDialog } from '@/components/name-dialog';
import { colors } from '@/constants/theme';
import { useLibraryStore } from '@/store/library-store';
import type { FolderColor, ImportProgress, StudyFolder } from '@/types/library';

type GridItem = { type: 'add' } | { type: 'folder'; folder: StudyFolder };

const initialProgress: ImportProgress = { copiedPdfs: 0, currentName: '' };
const addItem: GridItem = { type: 'add' };

function getGridItemKey(item: GridItem): string {
  return item.type === 'add' ? 'add-folder' : item.folder.id;
}

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const folders = useLibraryStore((state) => state.folders);
  const hydrationError = useLibraryStore((state) => state.hydrationError);
  const createFolder = useLibraryStore((state) => state.createFolder);
  const importFolder = useLibraryStore((state) => state.importFolder);
  const renameFolder = useLibraryStore((state) => state.renameFolder);
  const setFolderColor = useLibraryStore((state) => state.setFolderColor);
  const reorderFolders = useLibraryStore((state) => state.reorderFolders);
  const deleteFolder = useLibraryStore((state) => state.deleteFolder);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [nameDialogVisible, setNameDialogVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<StudyFolder | null>(null);
  const [actionTarget, setActionTarget] = useState<StudyFolder | null>(null);
  const [colorTargetId, setColorTargetId] = useState<string | null>(null);
  const [changingColor, setChangingColor] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(initialProgress);

  const items: GridItem[] = [
    ...folders.map((folder) => ({ type: 'folder' as const, folder })),
    addItem,
  ];
  const colorTarget = folders.find((folder) => folder.id === colorTargetId) ?? null;

  const persistFolderOrder = useCallback(
    (orderedIds: string[]) => {
      void reorderFolders(orderedIds).catch((error) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Could not reorder folders', getErrorMessage(error));
      });
    },
    [reorderFolders],
  );

  const moveFolder = useCallback(
    (id: string, offset: -1 | 1) => {
      const orderedIds = folders.map((folder) => folder.id);
      const fromIndex = orderedIds.indexOf(id);
      const toIndex = fromIndex + offset;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= orderedIds.length) {
        return;
      }
      [orderedIds[fromIndex], orderedIds[toIndex]] = [orderedIds[toIndex], orderedIds[fromIndex]];
      void Haptics.selectionAsync();
      persistFolderOrder(orderedIds);
    },
    [folders, persistFolderOrder],
  );

  const renderGridItem = useCallback<SortableGridRenderItem<GridItem>>(
    ({ index, item }) => (
      <Sortable.Handle mode={item.type === 'add' ? 'fixed-order' : 'draggable'} style={{ width: '100%' }}>
        {item.type === 'add' ? (
          <FolderTile
            add
            onPress={() => {
              void Haptics.selectionAsync();
              setAddSheetVisible(true);
            }}
          />
        ) : (
          <FolderTile
            color={item.folder.color}
            name={item.folder.name}
            onMenu={() => setActionTarget(item.folder)}
            onMoveEarlier={index > 0 ? () => moveFolder(item.folder.id, -1) : undefined}
            onMoveLater={index < folders.length - 1 ? () => moveFolder(item.folder.id, 1) : undefined}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/(library)/folder/[folderId]',
                params: { folderId: item.folder.id },
              })
            }
          />
        )}
      </Sortable.Handle>
    ),
    [folders.length, moveFolder, router],
  );

  const handleDragEnd = useCallback<SortableGridDragEndCallback<GridItem>>(
    ({ data, fromIndex, toIndex }) => {
      if (fromIndex === toIndex) {
        return;
      }
      persistFolderOrder(
        data.flatMap((item) => (item.type === 'folder' ? [item.folder.id] : [])),
      );
    },
    [persistFolderOrder],
  );

  async function createNamedFolder(name: string) {
    await createFolder(name);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function startImport() {
    setAddSheetVisible(false);
    setImportProgress(initialProgress);
    setImporting(true);
    try {
      const folder = await importFolder(setImportProgress);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Import complete', `${folder.name} is ready in your library.`);
    } catch (error) {
      if (!isPickerCancellation(error)) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Could not import folder', getErrorMessage(error));
      }
    } finally {
      setImporting(false);
    }
  }

  async function selectFolderColor(color: FolderColor) {
    if (!colorTarget || changingColor) {
      return;
    }
    setChangingColor(true);
    try {
      await setFolderColor(colorTarget.id, color);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setColorTargetId(null);
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not change folder colour', getErrorMessage(error));
    } finally {
      setChangingColor(false);
    }
  }

  function confirmDelete(folder: StudyFolder) {
    setActionTarget(null);
    Alert.alert(
      `Delete “${folder.name}”?`,
      'This permanently removes the folder and every PDF stored inside it.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            void deleteFolder(folder.id).catch((error) =>
              Alert.alert('Could not delete folder', getErrorMessage(error)),
            );
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <Animated.ScrollView
        ref={scrollableRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: getLibraryTabBarHeight(insets.bottom) + 8,
        }}>
        <View className="mb-7 mt-5">
          <View className="mb-3 h-2 w-16 rounded-full bg-purple" />
          <AppText variant="display">Study Stuff</AppText>
          {hydrationError ? (
            <View className="mt-4 rounded-2xl border border-danger bg-paper-raised px-4 py-3">
              <AppText variant="caption" className="text-danger">
                {hydrationError}
              </AppText>
            </View>
          ) : null}
        </View>

        <Sortable.Grid
          activeItemScale={1.04}
          columnGap={16}
          columns={2}
          customHandle
          data={items}
          dragActivationDelay={250}
          inactiveItemOpacity={0.82}
          keyExtractor={getGridItemKey}
          renderItem={renderGridItem}
          rowGap={24}
          scrollableRef={scrollableRef}
          onDragEnd={handleDragEnd}
          onDragStart={() => void Haptics.selectionAsync()}
        />

        <View className="mt-5">
          <AppText variant="caption" className="text-center text-muted">
            {folders.length} {folders.length === 1 ? 'Folder' : 'Folders'}
          </AppText>
        </View>
      </Animated.ScrollView>

      <ActionSheet
        title="Add to your library"
        visible={addSheetVisible}
        onDismiss={() => setAddSheetVisible(false)}>
        <ActionRow
          description="Make a named folder, then add PDFs to it."
          icon={FilePlus2}
          label="New empty folder"
          onPress={() => {
            setAddSheetVisible(false);
            setNameDialogVisible(true);
          }}
        />
        <ActionRow
          description={
            Platform.OS === 'android'
              ? 'Copy PDFs and nested folders from device storage.'
              : 'Whole-folder import is available on Android first.'
          }
          icon={FolderInput}
          label="Import folder"
          onPress={() => void startImport()}
        />
      </ActionSheet>

      <ActionSheet
        title={actionTarget?.name ?? 'Folder options'}
        visible={Boolean(actionTarget)}
        onDismiss={() => setActionTarget(null)}>
        <ActionRow
          icon={Pencil}
          label="Rename"
          onPress={() => {
            setRenameTarget(actionTarget);
            setActionTarget(null);
          }}
        />
        <ActionRow
          icon={Palette}
          label="Change colour"
          onPress={() => {
            setColorTargetId(actionTarget?.id ?? null);
            setActionTarget(null);
          }}
        />
        <ActionRow
          destructive
          icon={Trash2}
          label="Delete"
          onPress={() => actionTarget && confirmDelete(actionTarget)}
        />
      </ActionSheet>

      <ActionSheet
        title="Change colour"
        visible={Boolean(colorTarget)}
        onDismiss={() => setColorTargetId(null)}>
        {colorTarget ? (
          <FolderColorPicker
            disabled={changingColor}
            selected={colorTarget.color}
            onSelect={(color) => void selectFolderColor(color)}
          />
        ) : null}
        {changingColor ? (
          <View
            accessibilityLiveRegion="polite"
            className="min-h-6 flex-row items-center justify-center gap-2">
            <ActivityIndicator color={colors.purple} size="small" />
            <AppText variant="caption">Saving colour...</AppText>
          </View>
        ) : null}
      </ActionSheet>

      <NameDialog
        title="Name Folder"
        visible={nameDialogVisible}
        onClose={() => setNameDialogVisible(false)}
        onSubmit={createNamedFolder}
      />
      <NameDialog
        confirmLabel="Rename"
        initialValue={renameTarget?.name}
        title="Rename Folder"
        visible={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        onSubmit={async (name) => {
          if (renameTarget) {
            await renameFolder(renameTarget.id, name);
          }
        }}
      />
      <ImportOverlay progress={importProgress} visible={importing} />
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

function isPickerCancellation(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  return (
    candidate?.code?.toLocaleLowerCase().includes('cancel') === true ||
    candidate?.message?.toLocaleLowerCase().includes('cancel') === true
  );
}
