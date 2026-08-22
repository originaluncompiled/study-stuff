import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { colors } from '@/constants/theme';

type NameDialogProps = {
  confirmLabel?: string;
  initialValue?: string;
  inputLabel?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
  title: string;
  visible: boolean;
};

export function NameDialog({
  confirmLabel = 'Create',
  initialValue = '',
  inputLabel = 'Folder name',
  onClose,
  onSubmit,
  title,
  visible,
}: NameDialogProps) {
  if (!visible) {
    return null;
  }

  return (
    <NameDialogContent
      confirmLabel={confirmLabel}
      initialValue={initialValue}
      inputLabel={inputLabel}
      onClose={onClose}
      onSubmit={onSubmit}
      title={title}
    />
  );
}

function NameDialogContent({
  confirmLabel,
  initialValue,
  inputLabel,
  onClose,
  onSubmit,
  title,
}: Omit<NameDialogProps, 'visible'>) {
  const inputRef = useRef<TextInput>(null);
  const [name, setName] = useState(initialValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timeout);
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

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center bg-black/40 px-5">
        <Pressable accessible={false} className="absolute inset-0" onPress={onClose} />
        <View
          accessibilityViewIsModal
          className="rounded-[28px] border-2 border-ink bg-paper-raised p-5"
          importantForAccessibility="yes">
          <AppText accessibilityRole="header" variant="title" className="text-2xl">
            {title}
          </AppText>
          <TextInput
            ref={inputRef}
            accessibilityLabel={inputLabel}
            autoCapitalize="sentences"
            className="mt-5 rounded-2xl border-2 border-ink bg-paper px-4 py-3 font-sans text-lg text-ink"
            maxLength={80}
            onChangeText={setName}
            onSubmitEditing={() => void submit()}
            placeholder="e.g. Biology"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            selectTextOnFocus={Boolean(initialValue)}
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
              onPress={onClose}>
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
                <ActivityIndicator color={colors.white} />
              ) : (
                <AppText variant="label" className="text-white">
                  {confirmLabel ?? 'Create'}
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
