/**
 * Core Dwarf Fortress Simulation Engine
 * Ported & adapted from kevshakes/dwarf-fortress-simulation/simulation/ & ai/
 */

import { FortressState, DwarfEntity, Tile, FortressEvent, WorldItem, DwarfThought, DwarfMood } from '../types/simulation';
import { findPath3D } from './pathfinding';
import { buildTaskIndex, updateTileInTaskIndex } from './taskIndex';
import { cloneTilesSpine, getWritableTile } from './tileWriter';

export function runSimulationTick(
  state: FortressState,
  events: FortressEvent[],
  addEvent: (event: Omit<FortressEvent, 'id'>) => void
): FortressState {
  const nextTick = state.tick + 1;
  const sizeX = state.sizeX;
  const sizeY = state.sizeY;
  const depthZ = state.depthZ;

  // Copy-on-write: fresh spine (layer/row arrays), tile objects cloned only on write.
  const baseTiles = state.tiles;
  const tiles = cloneTilesSpine(baseTiles);
  let items = state.items.map(it => ({ ...it }));
  let dwarves = [...state.dwarves];
  let creatures = [...state.creatures];
  let wealth = state.wealth;

  // Calendar calculation: 100 ticks = 1 day; 28 days = 1 season
  const totalDays = Math.floor(nextTick / 100);
  const currentDay = (totalDays % 28) + 1;
  const seasons: ('Spring' | 'Summer' | 'Autumn' | 'Winter')[] = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const seasonIndex = Math.floor((totalDays / 28) % 4);
  const currentSeason = seasons[seasonIndex];
  const currentYear = 105 + Math.floor(totalDays / (28 * 4));

  // Season change announcement
  if (currentDay === 1 && nextTick % 100 === 0 && nextTick > 100) {
    addEvent({
      tick: nextTick,
      timeStr: `Year ${currentYear}, ${currentSeason} 1`,
      textEn: `The season has changed to ${currentSeason}. New winds blow across the mountain.`,
      textUa: `Сезон змінився на ${currentSeason === 'Spring' ? 'Весну' : currentSeason === 'Summer' ? 'Літо' : currentSeason === 'Autumn' ? 'Осінь' : 'Зиму'}. Над горою дме свіжий вітер.`,
      type: 'announcement'
    });
  }

  // Periodic migrant wave check (e.g. at tick 800 or when wealth increases)
  if (nextTick > 0 && nextTick % 900 === 0 && dwarves.length < 25) {
    const migrantCount = 2 + Math.floor(Math.random() * 2);
    const firstNames = ['Urist', 'Zon', 'Vabok', 'Iden', 'Kol', 'Meng', 'Dumat', 'Shorast'];
    const lastNames = ['Beardcleaver', 'Deepdelver', 'Gemheart', 'Ironfist', 'Mountainbrow'];
    const titles = ['Mason', 'Miner', 'Engraver', 'Brewer', 'Carpenter'];

    for (let m = 0; m < migrantCount; m++) {
      const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
      const title = titles[Math.floor(Math.random() * titles.length)];
      // Spawn near embark surface
      const surfaceZ = state.surfaceZ;
      const newDwarf: DwarfEntity = {
        id: `dwarf_migrant_${nextTick}_${m}`,
        name,
        title,
        gender: Math.random() > 0.5 ? 'male' : 'female',
        age: 30 + Math.floor(Math.random() * 60),
        x: Math.floor(sizeX / 2) + m,
        y: Math.floor(sizeY / 2),
        z: surfaceZ,
        targetPosition: null,
        path: [],
        stats: {
          strength: 10 + Math.floor(Math.random() * 5),
          agility: 10 + Math.floor(Math.random() * 5),
          intelligence: 10 + Math.floor(Math.random() * 5),
          endurance: 11 + Math.floor(Math.random() * 5)
        },
        needs: {
          hunger: 70,
          thirst: 75,
          sleep: 80,
          social: 60,
          work: 50
        },
        skills: {
          mining: { level: 2, xp: 0 },
          woodcutting: { level: 2, xp: 0 },
          carpentry: { level: 2, xp: 0 },
          masonry: { level: 3, xp: 0 },
          brewing: { level: 2, xp: 0 },
          hauling: { level: 3, xp: 0 }
        },
        inventory: [{ type: 'pickaxe', count: 1 }],
        mood: 'happy',
        happinessScore: 85,
        thoughts: [{
          id: `thought_${nextTick}_${m}`,
          textEn: 'Eager to join the flourishing fortress!',
          textUa: 'З нетерпінням приєднався до процвітаючої фортеці!',
          positive: true,
          timestamp: nextTick
        }],
        currentTask: null,
        color: '#10b981'
      };
      dwarves.push(newDwarf);
    }

    addEvent({
      tick: nextTick,
      timeStr: `Year ${currentYear}, ${currentSeason} ${currentDay}`,
      textEn: `A migrant wave of ${migrantCount} dwarves has arrived!`,
      textUa: `Хвиля мігрантів із ${migrantCount} гномів прибула до фортеці!`,
      type: 'discovery'
    });
  }

  // Stockpiles and map items scan (Total on map vs in designated stockpiles)
  let stockpileStoneCount = 0;
  let stockpileWoodCount = 0;
  let stockpileFoodCount = 0;
  let stockpileOreCount = 0;
  let stockpileAleCount = 0;

  let totalStoneCount = 0;
  let totalWoodCount = 0;
  let totalFoodCount = 0;
  let totalOreCount = 0;
  let totalAleCount = 0;

  for (const item of items) {
    const tile = tiles[item.z]?.[item.y]?.[item.x];
    const inStockpile = !!(tile && tile.stockpile !== 'none');

    if (item.type === 'stone') {
      totalStoneCount++;
      if (inStockpile) stockpileStoneCount++;
    } else if (item.type === 'wood') {
      totalWoodCount++;
      if (inStockpile) stockpileWoodCount++;
    } else if (item.type === 'food') {
      totalFoodCount++;
      if (inStockpile) stockpileFoodCount++;
    } else if (item.type === 'ore_iron' || item.type === 'ore_gold') {
      totalOreCount++;
      if (inStockpile) stockpileOreCount++;
    } else if (item.type === 'ale') {
      totalAleCount++;
      if (inStockpile) stockpileAleCount++;
    }
  }

  // Task Indexing & Target Reservation System
  const taskIndex = state.taskIndex || buildTaskIndex(tiles);
  const reservedTiles = new Set<string>();
  const activeDwarfItemClaims = new Map<string, string>(); // dwarfId -> targetItemId

  for (const d of dwarves) {
    if (d.currentTask) {
      reservedTiles.add(`${d.currentTask.targetX},${d.currentTask.targetY},${d.currentTask.targetZ}`);
      if (d.currentTask.targetItemId) {
        activeDwarfItemClaims.set(d.id, d.currentTask.targetItemId);
      }
    }
  }

  // Clear stale claimedByDwarfId on items if dwarf no longer targets it
  for (const item of items) {
    if (item.claimedByDwarfId) {
      if (activeDwarfItemClaims.get(item.claimedByDwarfId) !== item.id) {
        item.claimedByDwarfId = undefined;
      }
    }
  }

  const itemsOccupiedTiles = new Set<string>(items.map(it => `${it.x},${it.y},${it.z}`));

  // Process Each Dwarf
  dwarves = dwarves.map(dwarf => {
    // 1. Needs Decay (every tick slightly decreases needs)
    const hunger = Math.max(0, dwarf.needs.hunger - 0.04);
    const thirst = Math.max(0, dwarf.needs.thirst - 0.06);
    const sleep = Math.max(0, dwarf.needs.sleep - 0.03);
    const social = Math.max(0, dwarf.needs.social - 0.02);
    const workNeed = Math.min(100, dwarf.needs.work + 0.03);

    // Calculate mood based on needs satisfaction
    const avgNeeds = (hunger + thirst + sleep + social) / 4;
    let mood: DwarfMood = 'content';
    if (avgNeeds > 80) mood = 'ecstatic';
    else if (avgNeeds > 60) mood = 'happy';
    else if (avgNeeds > 40) mood = 'content';
    else if (avgNeeds > 20) mood = 'stressed';
    else mood = 'melancholy';

    // Apply gravity if dwarf is floating in mid-air
    let currentDwarfZ = dwarf.z;
    if (currentDwarfZ > 0 && tiles[currentDwarfZ]?.[dwarf.y]?.[dwarf.x]?.material === 'air') {
      while (currentDwarfZ > 0 && tiles[currentDwarfZ]?.[dwarf.y]?.[dwarf.x]?.material === 'air') {
        currentDwarfZ--;
      }
    }

    const updatedDwarf: DwarfEntity = {
      ...dwarf,
      z: currentDwarfZ,
      needs: {
        hunger,
        thirst,
        sleep,
        social,
        work: workNeed
      },
      skills: {
        mining: { ...dwarf.skills.mining },
        woodcutting: { ...dwarf.skills.woodcutting },
        carpentry: { ...dwarf.skills.carpentry },
        masonry: { ...dwarf.skills.masonry },
        brewing: { ...dwarf.skills.brewing },
        hauling: { ...dwarf.skills.hauling },
      },
      thoughts: dwarf.thoughts.slice(),
      mood,
      happinessScore: Math.round(avgNeeds)
    };

    // 2. Goal Decision & AI Tree (if idle or previous task completed)
    if (!updatedDwarf.currentTask) {
      // Priority 1: Critical Thirst (< 30)
      if (thirst < 30) {
        // Find drinking source: unreserved ale item
        const drinkItem = items.find(it => it.type === 'ale' && (!it.claimedByDwarfId || it.claimedByDwarfId === dwarf.id));
        if (drinkItem) {
          const path = findPath3D(dwarf.x, dwarf.y, dwarf.z, drinkItem.x, drinkItem.y, drinkItem.z, tiles, sizeX, sizeY, depthZ, true);
          if (path && path.length > 0) {
            drinkItem.claimedByDwarfId = dwarf.id;
            reservedTiles.add(`${drinkItem.x},${drinkItem.y},${drinkItem.z}`);
            updatedDwarf.currentTask = {
              type: 'drinking',
              targetX: drinkItem.x,
              targetY: drinkItem.y,
              targetZ: drinkItem.z,
              progress: 0,
              maxProgress: 15,
              descriptionEn: 'Drinking dwarven ale',
              descriptionUa: 'П’є гном’ячий ель',
              targetItemId: drinkItem.id
            };
            updatedDwarf.path = path;
            return updatedDwarf;
          }
        }
      }

      // Priority 2: Critical Hunger (< 30)
      if (hunger < 30) {
        const foodItem = items.find(it => it.type === 'food' && (!it.claimedByDwarfId || it.claimedByDwarfId === dwarf.id));
        if (foodItem) {
          const path = findPath3D(dwarf.x, dwarf.y, dwarf.z, foodItem.x, foodItem.y, foodItem.z, tiles, sizeX, sizeY, depthZ, true);
          if (path && path.length > 0) {
            foodItem.claimedByDwarfId = dwarf.id;
            reservedTiles.add(`${foodItem.x},${foodItem.y},${foodItem.z}`);
            updatedDwarf.currentTask = {
              type: 'eating',
              targetX: foodItem.x,
              targetY: foodItem.y,
              targetZ: foodItem.z,
              progress: 0,
              maxProgress: 18,
              descriptionEn: 'Eating plump helmet mushrooms',
              descriptionUa: 'Їсть гриби-товстошоломники',
              targetItemId: foodItem.id
            };
            updatedDwarf.path = path;
            return updatedDwarf;
          }
        }
      }

      // Priority 3: Critical Sleep (< 25)
      if (sleep < 25) {
        // Find an unreserved bed tile via taskIndex, or sleep where they are
        let bedPos: { x: number; y: number; z: number } | null = null;
        let minBedDist = Infinity;
        for (const coord of taskIndex.beds.values()) {
          const key = `${coord.x},${coord.y},${coord.z}`;
          if (!reservedTiles.has(key)) {
            const dist = Math.abs(coord.x - dwarf.x) + Math.abs(coord.y - dwarf.y) + Math.abs(coord.z - dwarf.z) * 2;
            if (dist < minBedDist) {
              minBedDist = dist;
              bedPos = coord;
            }
          }
        }

        const targetX = bedPos ? bedPos.x : dwarf.x;
        const targetY = bedPos ? bedPos.y : dwarf.y;
        const targetZ = bedPos ? bedPos.z : dwarf.z;

        if (bedPos) {
          reservedTiles.add(`${bedPos.x},${bedPos.y},${bedPos.z}`);
        }

        const path = findPath3D(dwarf.x, dwarf.y, dwarf.z, targetX, targetY, targetZ, tiles, sizeX, sizeY, depthZ, false);
        updatedDwarf.currentTask = {
          type: 'sleeping',
          targetX,
          targetY,
          targetZ,
          progress: 0,
          maxProgress: 40,
          descriptionEn: bedPos ? 'Sleeping in a warm bed' : 'Resting on the cavern floor',
          descriptionUa: bedPos ? 'Спить у затишному ліжку' : 'Відпочиває на кам’яній долівці'
        };
        updatedDwarf.path = path || [[dwarf.x, dwarf.y, dwarf.z]];
        return updatedDwarf;
      }

      // Priority 4: Active Fortress Designations (Mining, Tree Chopping, Building, Hauling)
      // Check for designated mining tiles using indexed coordinates
      const miningCandidates: { x: number; y: number; z: number; dist: number }[] = [];
      for (const coord of taskIndex.mining.values()) {
        const key = `${coord.x},${coord.y},${coord.z}`;
        if (!reservedTiles.has(key)) {
          const dist = Math.abs(coord.x - dwarf.x) + Math.abs(coord.y - dwarf.y) + Math.abs(coord.z - dwarf.z) * 2;
          miningCandidates.push({ ...coord, dist });
        }
      }
      miningCandidates.sort((a, b) => a.dist - b.dist);

      for (const cand of miningCandidates) {
        const path = findPath3D(
          dwarf.x, dwarf.y, dwarf.z,
          cand.x, cand.y, cand.z,
          tiles, sizeX, sizeY, depthZ, true
        );

        if (path && path.length > 0) {
          const targetTile = tiles[cand.z][cand.y][cand.x];
          reservedTiles.add(`${cand.x},${cand.y},${cand.z}`);
          updatedDwarf.currentTask = {
            type: 'mining',
            targetX: cand.x,
            targetY: cand.y,
            targetZ: cand.z,
            progress: 0,
            maxProgress: Math.max(12, Math.floor(targetTile.hardness / 3)),
            descriptionEn: `Mining ${targetTile.material.replace('ore_', '')} vein`,
            descriptionUa: `Добуває породу: ${targetTile.material}`
          };
          updatedDwarf.path = path;
          return updatedDwarf;
        }
      }

      // Check for designated tree chopping using indexed coordinates
      const treeCandidates: { x: number; y: number; z: number; dist: number }[] = [];
      for (const coord of taskIndex.chopping.values()) {
        const key = `${coord.x},${coord.y},${coord.z}`;
        if (!reservedTiles.has(key)) {
          const dist = Math.abs(coord.x - dwarf.x) + Math.abs(coord.y - dwarf.y) + Math.abs(coord.z - dwarf.z) * 2;
          treeCandidates.push({ ...coord, dist });
        }
      }
      treeCandidates.sort((a, b) => a.dist - b.dist);

      for (const cand of treeCandidates) {
        const path = findPath3D(
          dwarf.x, dwarf.y, dwarf.z,
          cand.x, cand.y, cand.z,
          tiles, sizeX, sizeY, depthZ, true
        );

        if (path && path.length > 0) {
          reservedTiles.add(`${cand.x},${cand.y},${cand.z}`);
          updatedDwarf.currentTask = {
            type: 'chopping',
            targetX: cand.x,
            targetY: cand.y,
            targetZ: cand.z,
            progress: 0,
            maxProgress: 15,
            descriptionEn: 'Felling mountain cedar tree',
            descriptionUa: 'Рубає гірський кедр'
          };
          updatedDwarf.path = path;
          return updatedDwarf;
        }
      }

      // Check for designated construction using indexed coordinates
      const buildCandidates: { x: number; y: number; z: number; type: string; dist: number }[] = [];
      for (const coord of taskIndex.building.values()) {
        const key = `${coord.x},${coord.y},${coord.z}`;
        if (!reservedTiles.has(key)) {
          const dist = Math.abs(coord.x - dwarf.x) + Math.abs(coord.y - dwarf.y) + Math.abs(coord.z - dwarf.z) * 2;
          buildCandidates.push({ ...coord, dist });
        }
      }
      buildCandidates.sort((a, b) => a.dist - b.dist);

      for (const cand of buildCandidates) {
        const path = findPath3D(
          dwarf.x, dwarf.y, dwarf.z,
          cand.x, cand.y, cand.z,
          tiles, sizeX, sizeY, depthZ, true
        );

        if (path && path.length > 0) {
          reservedTiles.add(`${cand.x},${cand.y},${cand.z}`);
          updatedDwarf.currentTask = {
            type: 'building',
            targetX: cand.x,
            targetY: cand.y,
            targetZ: cand.z,
            progress: 0,
            maxProgress: 20,
            descriptionEn: `Constructing ${cand.type.replace('build_', '')}`,
            descriptionUa: `Будує споруду: ${cand.type.replace('build_', '')}`
          };
          updatedDwarf.path = path;
          return updatedDwarf;
        }
      }

      // Check for Hauling unstockpiled items to designated stockpiles using indexed coordinates
      const unstockpiledItem = items.find(it => {
        if (it.claimedByDwarfId && it.claimedByDwarfId !== dwarf.id) return false;
        const tile = tiles[it.z]?.[it.y]?.[it.x];
        return tile && tile.stockpile === 'none';
      });

      if (unstockpiledItem) {
        let pileMap: Map<string, { x: number; y: number; z: number }> | null = null;
        if (unstockpiledItem.type === 'stone') pileMap = taskIndex.stockpiles.stone;
        else if (unstockpiledItem.type === 'wood') pileMap = taskIndex.stockpiles.wood;
        else if (unstockpiledItem.type === 'food' || unstockpiledItem.type === 'ale') pileMap = taskIndex.stockpiles.food;
        else if (unstockpiledItem.type === 'ore_iron' || unstockpiledItem.type === 'ore_gold') pileMap = taskIndex.stockpiles.ore;

        let stockpilePos: { x: number; y: number; z: number } | null = null;
        if (pileMap) {
          for (const coord of pileMap.values()) {
            const key = `${coord.x},${coord.y},${coord.z}`;
            if (!reservedTiles.has(key) && !itemsOccupiedTiles.has(key)) {
              stockpilePos = coord;
              break;
            }
          }
        }

        if (stockpilePos) {
          const pathToItem = findPath3D(
            dwarf.x, dwarf.y, dwarf.z,
            unstockpiledItem.x, unstockpiledItem.y, unstockpiledItem.z,
            tiles, sizeX, sizeY, depthZ, true
          );

          if (pathToItem && pathToItem.length > 0) {
            unstockpiledItem.claimedByDwarfId = dwarf.id;
            const pileKey = `${stockpilePos.x},${stockpilePos.y},${stockpilePos.z}`;
            reservedTiles.add(pileKey);
            itemsOccupiedTiles.add(pileKey);
            updatedDwarf.currentTask = {
              type: 'hauling',
              targetX: stockpilePos.x,
              targetY: stockpilePos.y,
              targetZ: stockpilePos.z,
              progress: 0,
              maxProgress: 10,
              descriptionEn: `Hauling ${unstockpiledItem.nameEn} to stockpile`,
              descriptionUa: `Переносить ${unstockpiledItem.nameUa} до складу`,
              targetItemId: unstockpiledItem.id
            };
            updatedDwarf.path = pathToItem;
            return updatedDwarf;
          }
        }
      }

      // Idle behavior: wander or socialize near tavern/embark
      if (Math.random() < 0.1) {
        const randDx = Math.floor(Math.random() * 3) - 1;
        const randDy = Math.floor(Math.random() * 3) - 1;
        if (randDx !== 0 || randDy !== 0) {
          const tx = Math.max(1, Math.min(sizeX - 2, dwarf.x + randDx));
          const ty = Math.max(1, Math.min(sizeY - 2, dwarf.y + randDy));
          
          // Check same level, down 1 level (slope), or up 1 level (slope)
          const candidateZs = [currentDwarfZ, currentDwarfZ - 1, currentDwarfZ + 1];
          for (const targetZ of candidateZs) {
            if (targetZ >= 0 && targetZ < depthZ) {
              const targetTile = tiles[targetZ]?.[ty]?.[tx];
              if (
                targetTile &&
                targetTile.material !== 'air' &&
                targetTile.material !== 'magma' &&
                !targetTile.material.startsWith('ore_') &&
                targetTile.material !== 'stone' &&
                targetTile.material !== 'granite' &&
                targetTile.material !== 'marble' &&
                targetTile.material !== 'obsidian' &&
                targetTile.material !== 'slade' &&
                targetTile.material !== 'adamantine' &&
                targetTile.material !== 'tree_trunk' &&
                targetTile.material !== 'tree_foliage' &&
                targetTile.material !== 'wall_constructed' &&
                !(targetTile.material === 'water' && targetTile.waterLevel >= 5)
              ) {
                updatedDwarf.x = tx;
                updatedDwarf.y = ty;
                updatedDwarf.z = targetZ;
                break;
              }
            }
          }
        }
      }

      return updatedDwarf;
    }

    // 3. Task Execution (if dwarf already has a task)
    const task = { ...updatedDwarf.currentTask };
    updatedDwarf.currentTask = task;

    // Item-targeted task validation (drinking, eating, hauling)
    // If the targeted item was consumed or picked up by another dwarf, cancel task immediately
    if ((task.type === 'drinking' || task.type === 'eating' || task.type === 'hauling') && task.targetItemId) {
      const targetItemExists = items.some(it => it.id === task.targetItemId);
      if (!targetItemExists) {
        updatedDwarf.currentTask = null;
        updatedDwarf.path = [];
        return updatedDwarf;
      }
    }

    // Movement towards task target
    if (updatedDwarf.path && updatedDwarf.path.length > 1) {
      // Pop next step from path
      const nextStep = updatedDwarf.path[1];
      updatedDwarf.x = nextStep[0];
      updatedDwarf.y = nextStep[1];
      updatedDwarf.z = nextStep[2];
      updatedDwarf.path = updatedDwarf.path.slice(1);
      return updatedDwarf;
    }

    // Arrived at destination or adjacent tile - work on task
    task.progress += 1;

    if (task.progress >= task.maxProgress) {
      // Task Complete!
      if (task.type === 'mining') {
        const targetTile = getWritableTile(tiles, baseTiles, task.targetZ, task.targetY, task.targetX);
        if (targetTile) {
          const previousMaterial = targetTile.material;
          // Clear rock tile into excavated floor
          if (previousMaterial === 'soil' || previousMaterial === 'sand') {
            targetTile.material = 'floor_dirt';
          } else {
            targetTile.material = 'floor_stone';
          }
          targetTile.hardness = 0;
          targetTile.designation = 'none';
          targetTile.isRevealed = true;
          updateTileInTaskIndex(taskIndex, task.targetX, task.targetY, task.targetZ, { designation: 'mine', stockpile: targetTile.stockpile, material: previousMaterial }, targetTile);

          // Reveal adjacent hidden tiles
          for (let dz = -1; dz <= 1; dz++) {
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const rx = task.targetX + dx;
                const ry = task.targetY + dy;
                const rz = task.targetZ + dz;
                const rt = getWritableTile(tiles, baseTiles, rz, ry, rx);
                if (rt) rt.isRevealed = true;
              }
            }
          }

          // Spawn dropped resource item
          let droppedItemType: WorldItem['type'] = 'stone';
          let itemEn = 'Granite boulder';
          let itemUa = 'Гранітний валун';

          if (previousMaterial === 'ore_iron') {
            droppedItemType = 'ore_iron';
            itemEn = 'Hematite nugget';
            itemUa = 'Самородок гематиту (залізо)';
            wealth += 35;
          } else if (previousMaterial === 'ore_gold') {
            droppedItemType = 'ore_gold';
            itemEn = 'Native gold nugget';
            itemUa = 'Самородок золота';
            wealth += 120;
            addEvent({
              tick: nextTick,
              timeStr: `Year ${currentYear}, ${currentSeason} ${currentDay}`,
              textEn: `${dwarf.name} struck Native Gold! Riches await the fortress!`,
              textUa: `${dwarf.name} натрапив на поклади самородного золота!`,
              type: 'discovery'
            });
          } else if (previousMaterial === 'adamantine') {
            droppedItemType = 'stone';
            itemEn = 'Raw adamantine spire fragment';
            itemUa = 'Фрагмент сирого адамантину';
            wealth += 500;
            addEvent({
              tick: nextTick,
              timeStr: `Year ${currentYear}, ${currentSeason} ${currentDay}`,
              textEn: `Praise the Miners! ${dwarf.name} struck Raw Adamantine in the deep earth!`,
              textUa: `Хвала шахтарям! ${dwarf.name} добув сирий адамантин у глибинах гори!`,
              type: 'discovery'
            });
          } else {
            wealth += 5;
          }

          items.push({
            id: `item_${nextTick}_${Math.random().toString(36).substring(2, 6)}`,
            type: droppedItemType,
            nameEn: itemEn,
            nameUa: itemUa,
            x: task.targetX,
            y: task.targetY,
            z: task.targetZ
          });

          // Give Mining XP
          updatedDwarf.skills.mining.xp += 15;
          if (updatedDwarf.skills.mining.xp >= 100) {
            updatedDwarf.skills.mining.level += 1;
            updatedDwarf.skills.mining.xp = 0;
          }

          // Satisfy work need and add happy thought
          updatedDwarf.needs.work = Math.min(100, updatedDwarf.needs.work + 25);
          updatedDwarf.thoughts.unshift({
            id: `thought_${nextTick}`,
            textEn: `Felt satisfaction after mining through ${previousMaterial}`,
            textUa: `Відчув гордість, пробивши шахту крізь ${previousMaterial}`,
            positive: true,
            timestamp: nextTick
          });
          if (updatedDwarf.thoughts.length > 8) updatedDwarf.thoughts.pop();
        }
      } else if (task.type === 'chopping') {
        const targetTile = getWritableTile(tiles, baseTiles, task.targetZ, task.targetY, task.targetX);
        if (targetTile) {
          const previousMaterial = targetTile.material;
          targetTile.material = 'grass';
          targetTile.hardness = 5;
          targetTile.designation = 'none';
          updateTileInTaskIndex(taskIndex, task.targetX, task.targetY, task.targetZ, { designation: 'chop', stockpile: targetTile.stockpile, material: previousMaterial }, targetTile);

          // Clear foliage above if present
          if (task.targetZ + 1 < depthZ) {
            const foliage = getWritableTile(tiles, baseTiles, task.targetZ + 1, task.targetY, task.targetX);
            if (foliage && foliage.material === 'tree_foliage') foliage.material = 'air';
          }

          // Spawn wood logs
          items.push({
            id: `item_wood_${nextTick}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'wood',
            nameEn: 'Mountain Cedar log',
            nameUa: 'Колода гірського кедру',
            x: task.targetX,
            y: task.targetY,
            z: task.targetZ
          });

          wealth += 10;
          updatedDwarf.skills.woodcutting.xp += 20;
          updatedDwarf.needs.work = Math.min(100, updatedDwarf.needs.work + 20);
        }
      } else if (task.type === 'building') {
        const targetTile = getWritableTile(tiles, baseTiles, task.targetZ, task.targetY, task.targetX);
        if (targetTile) {
          const designation = targetTile.designation;
          const previousMaterial = targetTile.material;
          if (designation === 'build_wall') {
            targetTile.material = 'wall_constructed';
            targetTile.hardness = 80;
          } else if (designation === 'build_door') {
            targetTile.material = 'door_constructed';
            targetTile.hardness = 40;
          } else if (designation === 'build_bed') {
            targetTile.material = 'bed';
            targetTile.hardness = 25;
          } else if (designation === 'build_workshop_still') {
            targetTile.material = 'workshop_still';
            targetTile.hardness = 60;
          } else if (designation === 'build_workshop_mason') {
            targetTile.material = 'workshop_mason';
            targetTile.hardness = 60;
          }
          targetTile.designation = 'none';
          updateTileInTaskIndex(taskIndex, task.targetX, task.targetY, task.targetZ, { designation, stockpile: targetTile.stockpile, material: previousMaterial }, targetTile);
          wealth += 30;
          updatedDwarf.skills.masonry.xp += 25;
          updatedDwarf.needs.work = Math.min(100, updatedDwarf.needs.work + 30);
        }
      } else if (task.type === 'hauling') {
        // Move hauled item to destination stockpile
        if (task.targetItemId) {
          const itemToMove = items.find(it => it.id === task.targetItemId);
          if (itemToMove) {
            itemToMove.x = task.targetX;
            itemToMove.y = task.targetY;
            itemToMove.z = task.targetZ;
            itemToMove.claimedByDwarfId = undefined;
          }
        }
        updatedDwarf.skills.hauling.xp += 15;
        updatedDwarf.needs.work = Math.min(100, updatedDwarf.needs.work + 15);
      } else if (task.type === 'drinking') {
        const itemIdx = task.targetItemId ? items.findIndex(it => it.id === task.targetItemId) : -1;
        if (itemIdx !== -1) {
          // Consume item from world items
          items.splice(itemIdx, 1);
          updatedDwarf.needs.thirst = 100;
          updatedDwarf.thoughts.unshift({
            id: `thought_drink_${nextTick}`,
            textEn: 'Drank a refreshing dwarven ale out of a fine goblet.',
            textUa: 'Випив чудового гном’ячого елю з кубка.',
            positive: true,
            timestamp: nextTick
          });
          if (updatedDwarf.thoughts.length > 8) updatedDwarf.thoughts.pop();
        } else {
          // Targeted item is no longer available; cancel task without satisfying thirst
          updatedDwarf.currentTask = null;
          updatedDwarf.path = [];
          return updatedDwarf;
        }
      } else if (task.type === 'eating') {
        const itemIdx = task.targetItemId ? items.findIndex(it => it.id === task.targetItemId) : -1;
        if (itemIdx !== -1) {
          // Consume item from world items
          items.splice(itemIdx, 1);
          updatedDwarf.needs.hunger = 100;
          updatedDwarf.thoughts.unshift({
            id: `thought_eat_${nextTick}`,
            textEn: 'Ate delicious plump helmet roast.',
            textUa: 'З’їв смажені гриби-товстошоломники.',
            positive: true,
            timestamp: nextTick
          });
          if (updatedDwarf.thoughts.length > 8) updatedDwarf.thoughts.pop();
        } else {
          // Targeted item is no longer available; cancel task without satisfying hunger
          updatedDwarf.currentTask = null;
          updatedDwarf.path = [];
          return updatedDwarf;
        }
      } else if (task.type === 'sleeping') {
        updatedDwarf.needs.sleep = 100;
      }

      // Reset task to idle
      updatedDwarf.currentTask = null;
      updatedDwarf.path = [];
    }

    return updatedDwarf;
  });

  // Process Creatures (War dog wandering / patrol)
  creatures = creatures.map(creature => {
    // Gravity check
    let cz = creature.z;
    if (cz > 0 && tiles[cz]?.[creature.y]?.[creature.x]?.material === 'air') {
      while (cz > 0 && tiles[cz]?.[creature.y]?.[creature.x]?.material === 'air') {
        cz--;
      }
    }

    if (Math.random() < 0.15) {
      const cdx = Math.floor(Math.random() * 3) - 1;
      const cdy = Math.floor(Math.random() * 3) - 1;
      if (cdx !== 0 || cdy !== 0) {
        const nx = Math.max(1, Math.min(sizeX - 2, creature.x + cdx));
        const ny = Math.max(1, Math.min(sizeY - 2, creature.y + cdy));
        const candidateZs = [cz, cz - 1, cz + 1];
        for (const targetZ of candidateZs) {
          if (targetZ >= 0 && targetZ < depthZ) {
            const tile = tiles[targetZ]?.[ny]?.[nx];
            if (
              tile &&
              tile.material !== 'air' &&
              tile.material !== 'magma' &&
              !tile.material.startsWith('ore_') &&
              tile.material !== 'stone' &&
              tile.material !== 'granite' &&
              tile.material !== 'marble' &&
              tile.material !== 'obsidian' &&
              tile.material !== 'slade' &&
              tile.material !== 'tree_trunk' &&
              tile.material !== 'tree_foliage' &&
              tile.material !== 'wall_constructed' &&
              !(tile.material === 'water' && tile.waterLevel >= 5)
            ) {
              return { ...creature, x: nx, y: ny, z: targetZ };
            }
          }
        }
      }
    }
    return { ...creature, z: cz };
  });

  // Fog of War: Reveal tiles in radius 4 around each dwarf
  const DWARF_VISION_RADIUS = 4;
  for (const dwarf of dwarves) {
    const minZ = Math.max(0, dwarf.z - 2);
    const maxZ = Math.min(depthZ - 1, dwarf.z + 2);
    const minY = Math.max(0, dwarf.y - DWARF_VISION_RADIUS);
    const maxY = Math.min(sizeY - 1, dwarf.y + DWARF_VISION_RADIUS);
    const minX = Math.max(0, dwarf.x - DWARF_VISION_RADIUS);
    const maxX = Math.min(sizeX - 1, dwarf.x + DWARF_VISION_RADIUS);

    for (let z = minZ; z <= maxZ; z++) {
      const dz = z - dwarf.z;
      for (let y = minY; y <= maxY; y++) {
        const dy = y - dwarf.y;
        for (let x = minX; x <= maxX; x++) {
          const dx = x - dwarf.x;
          if (dx * dx + dy * dy + dz * dz <= DWARF_VISION_RADIUS * DWARF_VISION_RADIUS) {
            const t = tiles[z]?.[y]?.[x];
            if (t && !t.isRevealed) {
              const wt = getWritableTile(tiles, baseTiles, z, y, x)!;
              wt.isRevealed = true;
            }
          }
        }
      }
    }
  }

  return {
    ...state,
    tick: nextTick,
    day: currentDay,
    season: currentSeason,
    year: currentYear,
    wealth,
    tiles,
    dwarves,
    creatures,
    items,
    taskIndex,
    stockpilesCounts: {
      stone: totalStoneCount,
      wood: totalWoodCount,
      food: totalFoodCount,
      ore: totalOreCount,
      ale: totalAleCount
    },
    stocksBreakdown: {
      totalOnMap: {
        stone: totalStoneCount,
        wood: totalWoodCount,
        food: totalFoodCount,
        ore: totalOreCount,
        ale: totalAleCount
      },
      inStockpile: {
        stone: stockpileStoneCount,
        wood: stockpileWoodCount,
        food: stockpileFoodCount,
        ore: stockpileOreCount,
        ale: stockpileAleCount
      }
    }
  };
}
