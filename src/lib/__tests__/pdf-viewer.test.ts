import { getPdfHeaderVisibility } from '@/lib/pdf-viewer';

describe('PDF viewer header', () => {
  test('hides while paging down and returns while paging up', () => {
    expect(getPdfHeaderVisibility(1, 2, true)).toBe(false);
    expect(getPdfHeaderVisibility(3, 2, false)).toBe(true);
  });

  test('keeps its current state when the page has not changed', () => {
    expect(getPdfHeaderVisibility(2, 2, false)).toBe(false);
    expect(getPdfHeaderVisibility(2, 2, true)).toBe(true);
  });
});
