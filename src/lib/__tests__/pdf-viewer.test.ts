import { getPdfScrubberOffset, getPdfScrubberPage } from '@/lib/pdf-viewer';

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
