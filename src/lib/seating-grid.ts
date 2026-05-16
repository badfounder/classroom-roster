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

/**
 * Lay out an explicit `rows × cols` grid of seat slots across the canvas
 * using the same gutters as computeGridPositions. Order is top-left to
 * bottom-right, row by row.
 */
export function computeRowColPositions(
  rows: number,
  cols: number
): Array<{ x: number; y: number; label: string }> {
  if (rows <= 0 || cols <= 0) return [];
  const padX = 10;
  const padY = 15;
  const cellW = (100 - padX * 2) / cols;
  const cellH = (100 - padY * 2) / rows;
  const out: Array<{ x: number; y: number; label: string }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = roundTo(padX + cellW * (c + 0.5), 2);
      const y = roundTo(padY + cellH * (r + 0.5), 2);
      out.push({ x, y, label: `R${r + 1}·S${c + 1}` });
    }
  }
  return out;
}

/**
 * Group-work layout: a grid of tables, each surrounded by N seats. Seats
 * split between the long edges of the table (3 + 3 for six, 3 + 2 for five,
 * etc.). Optionally adds one seat at each short end when the per-table count
 * is large enough to warrant it.
 */
export function computeTablePositions(
  tables: number,
  seatsPerTable: number
): Array<{ x: number; y: number; label: string }> {
  if (tables <= 0 || seatsPerTable <= 0) return [];

  const padX = 8;
  const padY = 12;
  const cols = Math.ceil(Math.sqrt(tables));
  const rows = Math.ceil(tables / cols);
  const cellW = (100 - padX * 2) / cols;
  const cellH = (100 - padY * 2) / rows;
  // The "table" itself is a rectangle within the cell. Long axis horizontal.
  const tableW = cellW * 0.7;
  const tableH = cellH * 0.4;

  const out: Array<{ x: number; y: number; label: string }> = [];

  // Distribute seats: prefer top+bottom edges, fall back to short ends for
  // 7+ seats per table.
  const sideSeats = seatsPerTable >= 7 ? Math.min(2, seatsPerTable - 6) : 0;
  const longEdgeTotal = seatsPerTable - sideSeats;
  const topCount = Math.ceil(longEdgeTotal / 2);
  const bottomCount = longEdgeTotal - topCount;
  const leftSide = sideSeats >= 1 ? 1 : 0;
  const rightSide = sideSeats >= 2 ? 1 : 0;

  function along(centerAxis: number, length: number, count: number, idx: number): number {
    if (count === 1) return centerAxis;
    const fraction = idx / (count - 1);
    return centerAxis - length / 2 + fraction * length;
  }

  for (let t = 0; t < tables; t++) {
    const tCol = t % cols;
    const tRow = Math.floor(t / cols);
    const cellCenterX = padX + cellW * (tCol + 0.5);
    const cellCenterY = padY + cellH * (tRow + 0.5);
    let seatIdx = 0;
    for (let i = 0; i < topCount; i++) {
      out.push({
        x: roundTo(along(cellCenterX, tableW, topCount, i), 2),
        y: roundTo(cellCenterY - tableH / 2, 2),
        label: `T${t + 1}·S${++seatIdx}`,
      });
    }
    for (let i = 0; i < bottomCount; i++) {
      out.push({
        x: roundTo(along(cellCenterX, tableW, bottomCount, i), 2),
        y: roundTo(cellCenterY + tableH / 2, 2),
        label: `T${t + 1}·S${++seatIdx}`,
      });
    }
    if (leftSide) {
      out.push({
        x: roundTo(cellCenterX - tableW / 2, 2),
        y: roundTo(cellCenterY, 2),
        label: `T${t + 1}·S${++seatIdx}`,
      });
    }
    if (rightSide) {
      out.push({
        x: roundTo(cellCenterX + tableW / 2, 2),
        y: roundTo(cellCenterY, 2),
        label: `T${t + 1}·S${++seatIdx}`,
      });
    }
  }

  return out;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
