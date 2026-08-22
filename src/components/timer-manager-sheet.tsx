import { Pause, Play, Square } from 'lucide-react-native';
import { Alert } from 'react-native';

import { ActionRow, ActionSheet } from '@/components/action-sheet';
import { formatTimer } from '@/lib/timer';
import { useTimerStore } from '@/store/timer-store';

type TimerManagerSheetProps = {
  onDismiss: () => void;
  visible: boolean;
};

export function TimerManagerSheet({ onDismiss, visible }: TimerManagerSheetProps) {
  const phase = useTimerStore((state) => state.phase);
  const secondsRemaining = useTimerStore((state) => state.secondsRemaining);
  const status = useTimerStore((state) => state.status);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const stop = useTimerStore((state) => state.stop);
  const paused = status === 'paused';

  async function pauseOrResume() {
    await (paused ? resume() : pause());
    showPersistenceWarning();
    onDismiss();
  }

  async function stopTimer() {
    await stop();
    showPersistenceWarning();
    onDismiss();
  }

  function showPersistenceWarning() {
    if (useTimerStore.getState().persistenceError) {
      Alert.alert(
        'Timer not saved',
        'Your timer changed on this device, but the update may not survive an app restart.',
      );
    }
  }

  return (
    <ActionSheet
      description={`${formatTimer(secondsRemaining)} remaining`}
      onDismiss={onDismiss}
      title={`${phase === 'study' ? 'Study' : 'Rest'} timer`}
      visible={visible && status !== 'idle'}>
      <ActionRow
        icon={paused ? Play : Pause}
        label={paused ? 'Resume Timer' : 'Pause Timer'}
        onPress={() => void pauseOrResume()}
      />
      <ActionRow icon={Square} label="Stop Timer" onPress={() => void stopTimer()} />
    </ActionSheet>
  );
}
