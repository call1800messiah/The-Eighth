import {
  BLANK_MAP,
  clampToMap,
  dropPosition,
  fitToView,
  gridLines,
  initials,
  snapToCell,
  stagingPosition,
  zoomAt,
} from './geometry';

const grid = { enabled: true, size: 50, offsetX: 10, offsetY: 20 };

describe('combat map geometry', () => {
  it('snaps to the centre of the cell, honouring the offset', () => {
    expect(snapToCell({ x: 12, y: 21 }, grid)).toEqual({ x: 35, y: 45 });
    expect(snapToCell({ x: 59.9, y: 69.9 }, grid)).toEqual({ x: 35, y: 45 });
    expect(snapToCell({ x: 60, y: 70 }, grid)).toEqual({ x: 85, y: 95 });
    expect(snapToCell({ x: 5, y: 5 }, grid)).toEqual({ x: -15, y: -5 });
  });

  it('keeps drops on the map and only snaps with the grid on', () => {
    const size = { width: 200, height: 100 };
    expect(dropPosition({ x: 61, y: 71 }, grid, size)).toEqual({ x: 85, y: 95 });
    expect(dropPosition({ x: 61, y: 71 }, { ...grid, enabled: false }, size)).toEqual({ x: 61, y: 71 });
    expect(dropPosition({ x: 500, y: -3 }, { ...grid, enabled: false }, size)).toEqual({ x: 200, y: 0 });
    expect(clampToMap({ x: -1, y: 101 }, size)).toEqual({ x: 0, y: 100 });
  });

  it('lines tokens up along the top, wrapping into the next row', () => {
    const size = { width: 170, height: 500 };   // three cells after the 10px offset
    expect(stagingPosition(0, grid, size)).toEqual({ x: 35, y: 45 });
    expect(stagingPosition(2, grid, size)).toEqual({ x: 135, y: 45 });
    expect(stagingPosition(3, grid, size)).toEqual({ x: 35, y: 95 });
  });

  it('starts staging inside the map for large or negative offsets', () => {
    expect(stagingPosition(0, { ...grid, offsetX: -40, offsetY: 120 }, BLANK_MAP)).toEqual({ x: 35, y: 45 });
  });

  it('draws grid lines across the whole map', () => {
    const { xs, ys } = gridLines(grid, { width: 120, height: 75 });
    expect(xs).toEqual([10, 60, 110]);
    expect(ys).toEqual([20, 70]);
  });

  it('fits the map into the view, centred', () => {
    const fit = fitToView({ width: 1000, height: 500 }, { width: 532, height: 532 });
    expect(fit.scale).toBeCloseTo(0.5);
    expect(fit.x).toBeCloseTo(16);
    expect(fit.y).toBeCloseTo(141);
    expect(fitToView({ width: 100, height: 100 }, { width: 0, height: 0 }).scale).toBe(1);
  });

  it('zooms around the pointer and within limits', () => {
    const zoomed = zoomAt({ scale: 1, x: 0, y: 0 }, { x: 100, y: 50 }, 2);
    expect(zoomed).toEqual({ scale: 2, x: -100, y: -50 });
    expect(zoomAt({ scale: 7, x: 0, y: 0 }, { x: 0, y: 0 }, 2).scale).toBe(8);
  });

  it('makes initials', () => {
    expect(initials('Alrik von Gareth')).toBe('AG');
    expect(initials('ork')).toBe('OR');
    expect(initials('  ')).toBe('?');
  });
});
