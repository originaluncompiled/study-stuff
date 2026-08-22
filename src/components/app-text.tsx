import type { PropsWithChildren } from 'react';
import { Text, type TextProps } from 'react-native';

type AppTextProps = PropsWithChildren<
  TextProps & {
    className?: string;
    variant?: 'body' | 'label' | 'title' | 'display' | 'caption';
  }
>;

const variants = {
  body: 'font-sans text-base text-ink',
  label: 'font-sans-medium text-base text-ink',
  title: 'font-display text-3xl text-ink',
  display: 'font-display text-5xl leading-[52px] text-ink',
  caption: 'font-sans text-sm text-muted',
} as const;

export function AppText({ className = '', variant = 'body', ...props }: AppTextProps) {
  return <Text className={`${variants[variant]} ${className}`} {...props} />;
}
