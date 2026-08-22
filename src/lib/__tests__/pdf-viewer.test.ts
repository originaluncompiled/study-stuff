import {
  getPdfHeaderVisibility,
  getPdfScrubberOffset,
  getPdfScrubberPage,
} from '@/lib/pdf-viewer';

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

describe('PDF page scrubber', () => {
  test('maps every page across the available portrait or landscape travel', () => {
    expect(getPdfScrubberOffset(1, 11, 600)).toBe(0);
    expect(getPdfScrubberOffset(6, 11, 600)).toBe(300);
    expect(getPdfScrubberOffset(11, 11, 600)).toBe(600);

    expect(getPdfScrubberOffset(1, 11, 200)).toBe(0);
    expect(getPdfScrubberOffset(6, 11, 200)).toBe(100);
    expect(getPdfScrubberOffset(11, 11, 200)).toBe(200);
  });

  test('maps and clamps a dragged offset to a page', () => {
    expect(getPdfScrubberPage(-20, 11, 200)).toBe(1);
    expect(getPdfScrubberPage(100, 11, 200)).toBe(6);
    expect(getPdfScrubberPage(300, 11, 200)).toBe(11);
    expect(getPdfScrubberPage(100, 1, 200)).toBe(1);
  });
});
