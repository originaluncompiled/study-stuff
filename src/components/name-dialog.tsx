import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { useThemeColors, useThemeStore } from '@/store/theme-store';

type NameDialogProps = {
  centerInTopHalf?: boolean;
  confirmLabel?: string;
  initialValue?: string;
  inputLabel?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
  submittingLabel?: string;
  title: string;
  visible: boolean;
};

export function NameDialog({
  centerInTopHalf = true,
  confirmLabel = 'Create',
  initialValue = '',
  inputLabel = 'Folder name',
  onClose,
  onSubmit,
  submittingLabel,
  title,
  visible,
}: NameDialogProps) {
  if (!visible) {
    return null;
  }

  return (
    <NameDialogContent
      centerInTopHalf={centerInTopHalf}
      confirmLabel={confirmLabel}
      initialValue={initialValue}
      inputLabel={inputLabel}
      onClose={onClose}
      onSubmit={onSubmit}
      submittingLabel={submittingLabel}
      title={title}
    />
  );
}

function NameDialogContent({
  centerInTopHalf,
  confirmLabel,
  initialValue,
  inputLabel,
  onClose,
  onSubmit,
  submittingLabel,
  title,
}: Omit<NameDialogProps, 'visible'>) {
  const colors = useThemeColors();
  const mode = useThemeStore((state) => state.mode);
  const inputRef = useRef<TextInput>(null);
  const [name, setName] = useState(initialValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [screenHeight, setScreenHeight] = useState(() => Dimensions.get('screen').height);

  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 200);
    const dimensionsSubscription = Dimensions.addEventListener('change', ({ screen }) => {
      setScreenHeight(screen.height);
    });

    return () => {
      clearTimeout(timeout);
      dimensionsSubscription.remove();
    };
  }, []);

  async function submit() {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(name);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save that name.');
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    if (!submitting) {
      onClose();
    }
  }

  return (
    <Modal animationType="fade" transparent visible onRequestClose={close}>
      <KeyboardAvoidingView
        behavior="height"
        className={
          centerInTopHalf
            ? 'flex-1 bg-black/40 px-5'
            : 'flex-1 justify-center bg-black/40 px-5'
        }>
        <Pressable accessible={false} className="absolute inset-0" onPress={close} />
        <View
          className={centerInTopHalf ? 'justify-center' : undefined}
          style={centerInTopHalf ? { height: screenHeight / 2 } : undefined}>
          <View
            accessibilityViewIsModal
            className="rounded-[28px] border-2 border-strong-line bg-paper-raised p-5"
            importantForAccessibility="yes">
            <AppText accessibilityRole="header" variant="title" className="text-2xl">
              {title}
            </AppText>
            <TextInput
              ref={inputRef}
              accessibilityLabel={inputLabel}
              autoCapitalize="sentences"
              className="mt-5 rounded-2xl border-2 border-strong-line bg-paper px-4 py-3 font-sans text-lg text-ink"
              keyboardAppearance={mode}
              maxLength={80}
              onChangeText={setName}
              onSubmitEditing={() => void submit()}
              placeholder="e.g. Biology"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              value={name}
            />
            {error ? (
              <AppText
                accessibilityLiveRegion="polite"
                variant="caption"
                className="mt-2 text-danger">
                {error}
              </AppText>
            ) : null}
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                accessibilityRole="button"
                className="min-h-12 justify-center rounded-xl px-4 active:bg-line/40"
                disabled={submitting}
                onPress={close}>
                <AppText variant="label">Cancel</AppText>
              </Pressable>
              <Pressable
                accessibilityLabel={confirmLabel ?? 'Create'}
                accessibilityRole="button"
                accessibilityState={{ busy: submitting, disabled: submitting }}
                className="min-h-12 min-w-24 items-center justify-center rounded-xl bg-purple px-5 active:bg-purple-dark"
                disabled={submitting}
                onPress={() => void submit()}>
                {submitting ? (
                  <View
                    accessibilityLiveRegion="polite"
                    className="flex-row items-center justify-center gap-2">
                    <ActivityIndicator color={colors.onPurple} />
                    {submittingLabel ? (
                      <AppText variant="label" className="text-on-purple">
                        {submittingLabel}
                      </AppText>
                    ) : null}
                  </View>
                ) : (
                  <AppText variant="label" className="text-on-purple">
                    {confirmLabel ?? 'Create'}
                  </AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
