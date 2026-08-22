export const ACTION_SHEET_MAX_UPWARD_OFFSET = 28;

const DISMISS_DISTANCE = 56;
const DISMISS_VELOCITY = 0.7;

export function getActionSheetDragOffset(translationY: number): number {
  'worklet';
  if (translationY >= 0) {
    return translationY;
  }
  return Math.max(-ACTION_SHEET_MAX_UPWARD_OFFSET, translationY * 0.25);
}

export function shouldDismissActionSheet(translationY: number, velocityY: number): boolean {
  'worklet';
  return translationY > DISMISS_DISTANCE || (translationY > 0 && velocityY > DISMISS_VELOCITY);
}
