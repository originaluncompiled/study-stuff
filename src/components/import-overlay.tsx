import { ActivityIndicator, Modal, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';
import type { ImportProgress } from '@/types/library';

export function ImportOverlay({ progress, visible }: { progress: ImportProgress; visible: boolean }) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={() => undefined}>
      <View className="flex-1 items-center justify-center bg-black/45 px-6">
        <View
          accessibilityViewIsModal
          className="w-full max-w-sm items-center rounded-[28px] border-2 border-ink bg-paper-raised px-6 py-7"
          importantForAccessibility="yes">
          <ActivityIndicator color={colors.purple} size="large" />
          <AppText variant="title" className="mt-5 text-2xl">
            Importing folder
          </AppText>
          <AppText
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            accessibilityValue={{ text: `${progress.copiedFiles} files copied` }}
            variant="label"
            className="mt-2 text-purple">
            {progress.copiedFiles} {progress.copiedFiles === 1 ? 'file' : 'files'} copied
          </AppText>
          <AppText variant="caption" className="mt-2 text-center" numberOfLines={2}>
            {progress.currentName || 'Scanning nested folders…'}
          </AppText>
          <AppText variant="caption" className="mt-5 text-center">
            Keep StudyStuff open until the import finishes.
          </AppText>
        </View>
      </View>
    </Modal>
  );
}
