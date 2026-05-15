/**
 * Lay out N items in an evenly-spaced grid covering ~80% of the canvas
 * width and ~70% of the height, padded so cards don't sit flush against
 * the edges. Centers each card within its grid cell.
 *
 * Identical logic runs client-side (for optimistic UI updates when the
 * teacher hits "Auto-arrange") and server-side (so the persisted values
 * match on reload).
 */
export function computeGridPositions(count: number): Array<{ x: number; y: number }> {
  if (count <= 0) return [];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const padX = 10;
  const padY = 15;
  const cellW = (100 - padX * 2) / cols;
  const cellH = (100 - padY * 2) / rows;

  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = roundTo(padX + cellW * (col + 0.5), 2);
    const y = roundTo(padY + cellH * (row + 0.5), 2);
    out.push({ x, y });
  }
  return out;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
