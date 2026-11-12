/**
 * Map geometry, in map pixels (the image's own pixels, or a blank area
 * without an image). Kept free of Konva and Angular so it can be tested on
 * its own and computes the same on every viewer's device.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Grid {
  enabled: boolean;
  /** Cell edge in map pixels. */
  size: number;
  offsetX: number;
  offsetY: number;
}

/** The area tokens stand on when there is no map image. */
export const BLANK_MAP: Size = { width: 1600, height: 1000 };

export const DEFAULT_GRID: Grid = { enabled: true, size: 70, offsetX: 0, offsetY: 0 };

export const GRID_SIZE_LIMITS = { min: 10, max: 500 };


/** Offsets reduced into [0, size), so lines start just inside the map. */
function phase(offset: number, size: number): number {
  return ((offset % size) + size) % size;
}


/** Centre of the cell containing the point. */
export function snapToCell(point: Point, grid: Grid): Point {
  const cell = (value: number, offset: number) =>
    offset + (Math.floor((value - offset) / grid.size) + 0.5) * grid.size;
  return { x: cell(point.x, grid.offsetX), y: cell(point.y, grid.offsetY) };
}


export function clampToMap(point: Point, size: Size): Point {
  return {
    x: Math.min(Math.max(point.x, 0), size.width),
    y: Math.min(Math.max(point.y, 0), size.height),
  };
}


/** Where a dropped token lands: the cell centre with a grid, as dropped without. */
export function dropPosition(point: Point, grid: Grid, size: Size): Point {
  return clampToMap(grid.enabled ? snapToCell(point, grid) : point, size);
}


/**
 * Where the n-th combatant without a placed token stands: cell after cell
 * along the top of the map, then the next row. Every viewer computes the same
 * from the same list, so nothing needs to be stored until the GM moves it.
 */
export function stagingPosition(index: number, grid: Grid, size: Size): Point {
  const start = phase(grid.offsetX, grid.size);
  const top = phase(grid.offsetY, grid.size);
  const perRow = Math.max(1, Math.floor((size.width - start) / grid.size));
  return {
    x: start + (index % perRow + 0.5) * grid.size,
    y: top + (Math.floor(index / perRow) + 0.5) * grid.size,
  };
}


/** x positions of vertical lines and y positions of horizontal ones. */
export function gridLines(grid: Grid, size: Size): { xs: number[]; ys: number[] } {
  const lines = (offset: number, extent: number) => {
    const positions: number[] = [];
    for (let p = phase(offset, grid.size); p <= extent; p += grid.size) {
      positions.push(p);
    }
    return positions;
  };
  return { xs: lines(grid.offsetX, size.width), ys: lines(grid.offsetY, size.height) };
}


/** Scale and position that show the whole map centred in the viewport. */
export function fitToView(map: Size, view: Size, padding = 16): { scale: number; x: number; y: number } {
  const scale = Math.min(
    (view.width - 2 * padding) / map.width,
    (view.height - 2 * padding) / map.height,
  );
  const safe = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    scale: safe,
    x: (view.width - map.width * safe) / 2,
    y: (view.height - map.height * safe) / 2,
  };
}


/** New scale and position for zooming by `factor` around a screen point. */
export function zoomAt(
  current: { scale: number; x: number; y: number },
  pointer: Point,
  factor: number,
  limits = { min: 0.05, max: 8 },
): { scale: number; x: number; y: number } {
  const scale = Math.min(Math.max(current.scale * factor, limits.min), limits.max);
  const world = { x: (pointer.x - current.x) / current.scale, y: (pointer.y - current.y) / current.scale };
  return { scale, x: pointer.x - world.x * scale, y: pointer.y - world.y * scale };
}


/** Up to two letters for a token without a portrait. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
