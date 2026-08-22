import {
  getActionSheetDragOffset,
  shouldDismissActionSheet,
} from '@/lib/action-sheet-motion';

describe('action sheet motion', () => {
  test('allows downward movement and resists upward movement', () => {
    expect(getActionSheetDragOffset(80)).toBe(80);
    expect(getActionSheetDragOffset(-20)).toBe(-5);
    expect(getActionSheetDragOffset(-200)).toBe(-28);
  });

  test('dismisses only after a meaningful downward drag or fling', () => {
    expect(shouldDismissActionSheet(120, 0.2)).toBe(true);
    expect(shouldDismissActionSheet(64, 0.2)).toBe(true);
    expect(shouldDismissActionSheet(20, 1)).toBe(true);
    expect(shouldDismissActionSheet(40, 0.2)).toBe(false);
    expect(shouldDismissActionSheet(-20, -1)).toBe(false);
  });
});
