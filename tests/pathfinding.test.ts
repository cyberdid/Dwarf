import { describe, it, expect } from 'vitest';
import { findPath3D as findPathEngine } from '../src/engine/pathfinding';
import { findPath3D as findPathSim } from '../src/simulation/pathfinding';
import { Tile, MaterialType } from '../src/types/simulation';

function makeTile(x: number, y: number, z: number, material: MaterialType): Tile {
  return {
    x,
    y,
    z,
    material,
    hardness: material === 'stone' ? 50 : 0,
    maxHardness: material === 'stone' ? 50 : 0,
    waterLevel: material === 'water' ? 7 : 0,
    stability: 100,
    isRevealed: true,
    designation: 'none',
    stockpile: 'none',
    zone: 'none',
    itemIds: []
  };
}

function createMap(
  sizeX: number,
  sizeY: number,
  depthZ: number,
  defaultMaterial: MaterialType = 'air'
): Tile[][][] {
  const tiles: Tile[][][] = [];
  for (let z = 0; z < depthZ; z++) {
    const layer: Tile[][] = [];
    for (let y = 0; y < sizeY; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < sizeX; x++) {
        row.push(makeTile(x, y, z, defaultMaterial));
      }
      layer.push(row);
    }
    tiles.push(layer);
  }
  return tiles;
}

describe('3D A* Pathfinding - Ceiling and Vertical Clearance Checks', () => {
  it('re-exports cleanly between engine and simulation paths', () => {
    expect(findPathEngine).toBe(findPathSim);
  });

  it('prevents diagonal climbs through a solid rock ceiling and pathfinds around it', () => {
    // 7x3x3 map
    // z = 0: corridor at y=1 from x=0..6 has floor_stone
    // z = 1: solid rock ceiling ('stone') at x=0..3, y=1
    //        opening ('air') at x=4, y=1
    //        upper corridor ('floor_stone') at x=4..6, y=1
    // z = 2: open air everywhere
    const sizeX = 7;
    const sizeY = 3;
    const depthZ = 3;
    const tiles = createMap(sizeX, sizeY, depthZ, 'air');

    // Build lower level (z=0)
    for (let x = 0; x < sizeX; x++) {
      tiles[0][1][x] = makeTile(x, 1, 0, 'floor_stone');
    }

    // Build solid ceiling over x=0..3 at z=1
    for (let x = 0; x <= 3; x++) {
      tiles[1][1][x] = makeTile(x, 1, 1, 'stone');
    }

    // Upper level corridor at z=1, x=4..6
    for (let x = 4; x < sizeX; x++) {
      tiles[1][1][x] = makeTile(x, 1, 1, 'floor_stone');
    }

    // Start under solid ceiling at (1, 1, 0), Target in upper corridor at (6, 1, 1)
    const path = findPathEngine(1, 1, 0, 6, 1, 1, tiles, sizeX, sizeY, depthZ, false);

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);

    // Verify start and end
    expect(path![0]).toEqual([1, 1, 0]);
    expect(path![path!.length - 1]).toEqual([6, 1, 1]);

    // Verify NO step climbs diagonally through the solid ceiling at x=0..3
    for (let i = 0; i < path!.length - 1; i++) {
      const [currX, currY, currZ] = path![i];
      const [nextX, nextY, nextZ] = path![i + 1];

      // If climbing up
      if (nextZ > currZ) {
        // The tile directly above current position MUST NOT be solid rock
        const ceilingAboveCurr = tiles[currZ + 1][currY][currX];
        expect(ceilingAboveCurr.material).not.toBe('stone');
        expect(['air', 'floor_stone']).toContain(ceilingAboveCurr.material);
      }

      // If stepping down
      if (nextZ < currZ) {
        const ceilingAboveDest = tiles[currZ][nextY][nextX];
        expect(ceilingAboveDest.material).not.toBe('stone');
      }
    }

    // Specifically, the climb to z=1 must occur at or after x=3 (stepping into x=4 where ceiling is clear)
    const climbStepIndex = path!.findIndex((coord, idx) => idx > 0 && coord[2] === 1);
    expect(climbStepIndex).toBeGreaterThan(0);
    const preClimb = path![climbStepIndex - 1];
    const postClimb = path![climbStepIndex];
    expect(postClimb[0]).toBeGreaterThanOrEqual(4);
  });

  it('returns null when path to upper level is completely blocked by solid rock ceiling', () => {
    // 6x3x3 map
    // z = 0: floor_stone everywhere at y=1
    // z = 1: solid stone ceiling everywhere at y=1 (completely covering z=0)
    // z = 2: floor_stone at (5, 1, 2)
    const sizeX = 6;
    const sizeY = 3;
    const depthZ = 3;
    const tiles = createMap(sizeX, sizeY, depthZ, 'air');

    for (let x = 0; x < sizeX; x++) {
      tiles[0][1][x] = makeTile(x, 1, 0, 'floor_stone');
      tiles[1][1][x] = makeTile(x, 1, 1, 'stone');
    }
    tiles[2][1][5] = makeTile(5, 1, 2, 'floor_stone');

    // From (1, 1, 0) trying to reach (5, 1, 2)
    const path = findPathEngine(1, 1, 0, 5, 1, 2, tiles, sizeX, sizeY, depthZ, false);
    expect(path).toBeNull();
  });

  it('prevents diagonal descents through a solid ceiling into a lower tunnel', () => {
    // Reverse test: from upper level (6, 1, 1) to lower level under ceiling (1, 1, 0)
    const sizeX = 7;
    const sizeY = 3;
    const depthZ = 3;
    const tiles = createMap(sizeX, sizeY, depthZ, 'air');

    // z=0: floor at y=1
    for (let x = 0; x < sizeX; x++) {
      tiles[0][1][x] = makeTile(x, 1, 0, 'floor_stone');
    }

    // z=1: solid ceiling at x=0..3, upper corridor at x=4..6
    for (let x = 0; x <= 3; x++) {
      tiles[1][1][x] = makeTile(x, 1, 1, 'stone');
    }
    for (let x = 4; x < sizeX; x++) {
      tiles[1][1][x] = makeTile(x, 1, 1, 'floor_stone');
    }

    const path = findPathEngine(6, 1, 1, 1, 1, 0, tiles, sizeX, sizeY, depthZ, false);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual([6, 1, 1]);
    expect(path![path!.length - 1]).toEqual([1, 1, 0]);

    // Verify that every descent step dz < 0 has clear headroom above destination
    for (let i = 0; i < path!.length - 1; i++) {
      const [currX, currY, currZ] = path![i];
      const [nextX, nextY, nextZ] = path![i + 1];

      if (nextZ < currZ) {
        // Ceiling directly above destination must NOT be stone
        const ceilingAboveDest = tiles[currZ][nextY][nextX];
        expect(ceilingAboveDest.material).not.toBe('stone');
      }
    }
  });

  it('allows natural outdoor climbing where headroom is open air', () => {
    // 5x3x3 map simulating an outdoor hill
    // z=0, x=0..1: grass
    // z=1, x=2..4: grass (hilltop)
    // z=1, x=0..1: air (open sky above lower grass)
    // z=2: air everywhere
    const sizeX = 5;
    const sizeY = 3;
    const depthZ = 3;
    const tiles = createMap(sizeX, sizeY, depthZ, 'air');

    tiles[0][1][0] = makeTile(0, 1, 0, 'grass');
    tiles[0][1][1] = makeTile(1, 1, 0, 'grass');
    // Hill foundation
    tiles[0][1][2] = makeTile(2, 1, 0, 'stone');
    tiles[0][1][3] = makeTile(3, 1, 0, 'stone');
    tiles[0][1][4] = makeTile(4, 1, 0, 'stone');

    // Hilltop surface
    tiles[1][1][2] = makeTile(2, 1, 1, 'grass');
    tiles[1][1][3] = makeTile(3, 1, 1, 'grass');
    tiles[1][1][4] = makeTile(4, 1, 1, 'grass');

    // Open sky above lower ground
    tiles[1][1][0] = makeTile(0, 1, 1, 'air');
    tiles[1][1][1] = makeTile(1, 1, 1, 'air');

    const path = findPathEngine(0, 1, 0, 4, 1, 1, tiles, sizeX, sizeY, depthZ, false);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual([0, 1, 0]);
    expect(path![path!.length - 1]).toEqual([4, 1, 1]);
  });

  it('prevents diagonal squeeze between two adjacent solid blocks on same Z', () => {
    // 3x3x1 map
    // (0, 0) and (1, 1) are floor_stone
    // (1, 0) and (0, 1) are stone (touching diagonal corner)
    const sizeX = 3;
    const sizeY = 3;
    const depthZ = 1;
    const tiles = createMap(sizeX, sizeY, depthZ, 'floor_stone');

    tiles[0][0][1] = makeTile(1, 0, 0, 'stone');
    tiles[0][1][0] = makeTile(0, 1, 0, 'stone');

    const path = findPathEngine(0, 0, 0, 1, 1, 0, tiles, sizeX, sizeY, depthZ, false);
    // Directly squeezing between (1, 0) and (0, 1) should be prevented
    if (path) {
      // Must go around via (2, 0) or (0, 2) etc., never direct diagonal step [0,0]->[1,1]
      for (let i = 0; i < path.length - 1; i++) {
        const [x1, y1] = path[i];
        const [x2, y2] = path[i + 1];
        expect(x1 === 0 && y1 === 0 && x2 === 1 && y2 === 1).toBe(false);
      }
    }
  });

  it('prevents climbing through lethal magma ceiling', () => {
    const sizeX = 4;
    const sizeY = 3;
    const depthZ = 3;
    const tiles = createMap(sizeX, sizeY, depthZ, 'air');

    tiles[0][1][1] = makeTile(1, 1, 0, 'floor_stone');
    tiles[1][1][1] = makeTile(1, 1, 1, 'magma'); // Magma above dwarf
    tiles[1][1][2] = makeTile(2, 1, 1, 'floor_stone');

    const path = findPathEngine(1, 1, 0, 2, 1, 1, tiles, sizeX, sizeY, depthZ, false);
    // Step from (1, 1, 0) to (2, 1, 1) is blocked by magma ceiling at (1, 1, 1)
    expect(path).toBeNull();
  });
});
