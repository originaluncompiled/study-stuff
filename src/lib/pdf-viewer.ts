export function getPdfScrubberOffset(
  page: number,
  numberOfPages: number,
  travel: number,
): number {
  'worklet';
  if (numberOfPages <= 1 || travel <= 0) {
    return 0;
  }

  const boundedPage = Math.min(Math.max(Math.round(page), 1), numberOfPages);
  return ((boundedPage - 1) / (numberOfPages - 1)) * travel;
}

export function getPdfScrubberPage(
  offset: number,
  numberOfPages: number,
  travel: number,
): number {
  'worklet';
  if (numberOfPages <= 1 || travel <= 0) {
    return 1;
  }

  const boundedOffset = Math.min(Math.max(offset, 0), travel);
  return Math.round((boundedOffset / travel) * (numberOfPages - 1)) + 1;
}
