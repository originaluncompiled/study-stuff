export function getPdfHeaderVisibility(
  previousPage: number,
  currentPage: number,
  currentVisibility: boolean,
): boolean {
  if (currentPage > previousPage) {
    return false;
  }
  if (currentPage < previousPage) {
    return true;
  }
  return currentVisibility;
}
