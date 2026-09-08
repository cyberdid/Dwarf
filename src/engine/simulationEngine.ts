/**
 * Core Dwarf Fortress Simulation Engine
 * Ported & adapted from kevshakes/dwarf-fortress-simulation/simulation/ & ai/
 */

import { FortressState, DwarfEntity, Tile, FortressEvent, WorldItem, DwarfThought, DwarfMood } from '../types/simulation';
import { findPath3D } from './pathfinding';

export function runSimulationTick(
  state: FortressState,
  events: FortressEvent[],
  addEvent: (event: Omit<FortressEvent, 'id'>) => void
): FortressState {
  const nextTick = state.tick + 1;
  const sizeX = state.sizeX;
  const sizeY = state.sizeY;
  const depthZ = state.depthZ;

  // Clone tiles reference so we can mutate safely in the tick
  const tiles = state.tiles;
  let items = [...state.items];
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

  // Stockpiles scan
  let stockpileStoneCount = 0;
  let stockpileWoodCount = 0;
  let stockpileFoodCount = 0;
  let stockpileOreCount = 0;
  let stockpileAleCount = 0;

  for (const item of items) {
    const tile = tiles[item.z]?.[item.y]?.[item.x];
    if (tile && tile.stockpile !== 'none') {
      if (item.type === 'stone') stockpileStoneCount++;
      if (item.type === 'wood') stockpileWoodCount++;
      if (item.type === 'food') stockpileFoodCount++;
      if (item.type === 'ore_iron' || item.type === 'ore_gold') stockpileOreCount++;
      if (item.type === 'ale') stockpileAleCount++;
    }
  }

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
      mood,
      happinessScore: Math.round(avgNeeds)
    };

    // 2. Goal Decision & AI Tree (if idle or previous task completed)
    if (!updatedDwarf.currentTask) {
      // Priority 1: Critical Thirst (< 25)
      if (thirst < 30) {
        // Find drinking source: ale item or water tile
        const drinkItem = items.find(it => it.type === 'ale');
        if (drinkItem) {
          const path = findPath3D(dwarf.x, dwarf.y, dwarf.z, drinkItem.x, drinkItem.y, drinkItem.z, tiles, sizeX, sizeY, depthZ, true);
          if (path && path.length > 0) {
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

      // Priority 2: Critical Hunger (< 25)
      if (hunger < 30) {
        const foodItem = items.find(it => it.type === 'food');
        if (foodItem) {
          const path = findPath3D(dwarf.x, dwarf.y, dwarf.z, foodItem.x, foodItem.y, foodItem.z, tiles, sizeX, sizeY, depthZ, true);
          if (path && path.length > 0) {
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

      // Priority 3: Critical Sleep (< 20)
      if (sleep < 25) {
        // Find a bed tile, or sleep where they are
        let bedPos: { x: number; y: number; z: number } | null = null;
        for (let z = 0; z < depthZ && !bedPos; z++) {
          for (let y = 0; y < sizeY && !bedPos; y++) {
            for (let x = 0; x < sizeX && !bedPos; x++) {
              if (tiles[z][y][x].material === 'bed') {
                bedPos = { x, y, z };
              }
            }
          }
        }

        const targetX = bedPos ? bedPos.x : dwarf.x;
        const targetY = bedPos ? bedPos.y : dwarf.y;
        const targetZ = bedPos ? bedPos.z : dwarf.z;

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
      // Check for designated mining tiles
      let miningTarget: { x: number; y: number; z: number } | null = null;
      let minMiningDist = Infinity;

      for (let z = 0; z < depthZ; z++) {
        for (let y = 0; y < sizeY; y++) {
          for (let x = 0; x < sizeX; x++) {
            const tile = tiles[z][y][x];
            if (tile.designation === 'mine') {
              const dist = Math.abs(x - dwarf.x) + Math.abs(y - dwarf.y) + Math.abs(z - dwarf.z) * 2;
              if (dist < minMiningDist) {
                minMiningDist = dist;
                miningTarget = { x, y, z };
              }
            }
          }
        }
      }

      if (miningTarget) {
        const path = findPath3D(
          dwarf.x, dwarf.y, dwarf.z,
          miningTarget.x, miningTarget.y, miningTarget.z,
          tiles, sizeX, sizeY, depthZ, true
        );

        if (path && path.length > 0) {
          const targetTile = tiles[miningTarget.z][miningTarget.y][miningTarget.x];
          updatedDwarf.currentTask = {
            type: 'mining',
            targetX: miningTarget.x,
            targetY: miningTarget.y,
            targetZ: miningTarget.z,
            progress: 0,
            maxProgress: Math.max(12, Math.floor(targetTile.hardness / 3)),
            descriptionEn: `Mining ${targetTile.material.replace('ore_', '')} vein`,
            descriptionUa: `Добуває породу: ${targetTile.material}`
          };
          updatedDwarf.path = path;
          return updatedDwarf;
        }
      }

      // Check for designated tree chopping
      let treeTarget: { x: number; y: number; z: number } | null = null;
      let minTreeDist = Infinity;

      for (let z = 0; z < depthZ; z++) {
        for (let y = 0; y < sizeY; y++) {
          for (let x = 0; x < sizeX; x++) {
            const tile = tiles[z][y][x];
            if (tile.designation === 'chop' && tile.material === 'tree_trunk') {
              const dist = Math.abs(x - dwarf.x) + Math.abs(y - dwarf.y) + Math.abs(z - dwarf.z) * 2;
              if (dist < minTreeDist) {
                minTreeDist = dist;
                treeTarget = { x, y, z };
              }
            }
          }
        }
      }

      if (treeTarget) {
        const path = findPath3D(
          dwarf.x, dwarf.y, dwarf.z,
          treeTarget.x, treeTarget.y, treeTarget.z,
          tiles, sizeX, sizeY, depthZ, true
        );

        if (path && path.length > 0) {
          updatedDwarf.currentTask = {
            type: 'chopping',
            targetX: treeTarget.x,
            targetY: treeTarget.y,
            targetZ: treeTarget.z,
            progress: 0,
            maxProgress: 15,
            descriptionEn: 'Felling mountain cedar tree',
            descriptionUa: 'Рубає гірський кедр'
          };
          updatedDwarf.path = path;
          return updatedDwarf;
        }
      }

      // Check for designated construction (Walls, Doors, Beds, Workshops)
      let buildTarget: { x: number; y: number; z: number; type: string } | null = null;
      for (let z = 0; z < depthZ && !buildTarget; z++) {
        for (let y = 0; y < sizeY && !buildTarget; y++) {
          for (let x = 0; x < sizeX && !buildTarget; x++) {
            const tile = tiles[z][y][x];
            if (tile.designation.startsWith('build_')) {
              buildTarget = { x, y, z, type: tile.designation };
            }
          }
        }
      }

      if (buildTarget) {
        const path = findPath3D(
          dwarf.x, dwarf.y, dwarf.z,
          buildTarget.x, buildTarget.y, buildTarget.z,
          tiles, sizeX, sizeY, depthZ, true
        );

        if (path && path.length > 0) {
          updatedDwarf.currentTask = {
            type: 'building',
            targetX: buildTarget.x,
            targetY: buildTarget.y,
            targetZ: buildTarget.z,
            progress: 0,
            maxProgress: 20,
            descriptionEn: `Constructing ${buildTarget.type.replace('build_', '')}`,
            descriptionUa: `Будує споруду: ${buildTarget.type.replace('build_', '')}`
          };
          updatedDwarf.path = path;
          return updatedDwarf;
        }
      }

      // Check for Hauling unstockpiled items to designated stockpiles
      const unstockpiledItem = items.find(it => {
        const tile = tiles[it.z]?.[it.y]?.[it.x];
        return tile && tile.stockpile === 'none';
      });

      if (unstockpiledItem) {
        // Look for corresponding stockpile zone
        let stockpilePos: { x: number; y: number; z: number } | null = null;
        for (let z = 0; z < depthZ && !stockpilePos; z++) {
          for (let y = 0; y < sizeY && !stockpilePos; y++) {
            for (let x = 0; x < sizeX && !stockpilePos; x++) {
              const tile = tiles[z][y][x];
              if (
                (unstockpiledItem.type === 'stone' && tile.stockpile === 'stone') ||
                (unstockpiledItem.type === 'wood' && tile.stockpile === 'wood') ||
                ((unstockpiledItem.type === 'food' || unstockpiledItem.type === 'ale') && tile.stockpile === 'food') ||
                ((unstockpiledItem.type === 'ore_iron' || unstockpiledItem.type === 'ore_gold') && tile.stockpile === 'ore')
              ) {
                // Check if tile already has an item
                const hasItem = items.some(it => it.x === x && it.y === y && it.z === z);
                if (!hasItem) {
                  stockpilePos = { x, y, z };
                }
              }
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
    const task = updatedDwarf.currentTask;

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
        const targetTile = tiles[task.targetZ]?.[task.targetY]?.[task.targetX];
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

          // Reveal adjacent hidden tiles
          for (let dz = -1; dz <= 1; dz++) {
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const rx = task.targetX + dx;
                const ry = task.targetY + dy;
                const rz = task.targetZ + dz;
                if (tiles[rz]?.[ry]?.[rx]) {
                  tiles[rz][ry][rx].isRevealed = true;
                }
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
        const targetTile = tiles[task.targetZ]?.[task.targetY]?.[task.targetX];
        if (targetTile) {
          targetTile.material = 'grass';
          targetTile.hardness = 5;
          targetTile.designation = 'none';

          // Clear foliage above if present
          if (task.targetZ + 1 < depthZ && tiles[task.targetZ + 1][task.targetY][task.targetX].material === 'tree_foliage') {
            tiles[task.targetZ + 1][task.targetY][task.targetX].material = 'air';
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
        const targetTile = tiles[task.targetZ]?.[task.targetY]?.[task.targetX];
        if (targetTile) {
          const designation = targetTile.designation;
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
          }
        }
        updatedDwarf.skills.hauling.xp += 15;
        updatedDwarf.needs.work = Math.min(100, updatedDwarf.needs.work + 15);
      } else if (task.type === 'drinking') {
        updatedDwarf.needs.thirst = 100;
        updatedDwarf.thoughts.unshift({
          id: `thought_drink_${nextTick}`,
          textEn: 'Drank a refreshing dwarven ale out of a fine goblet.',
          textUa: 'Випив чудового гном’ячого елю з кубка.',
          positive: true,
          timestamp: nextTick
        });
        if (updatedDwarf.thoughts.length > 8) updatedDwarf.thoughts.pop();
      } else if (task.type === 'eating') {
        updatedDwarf.needs.hunger = 100;
        updatedDwarf.thoughts.unshift({
          id: `thought_eat_${nextTick}`,
          textEn: 'Ate delicious plump helmet roast.',
          textUa: 'З’їв смажені гриби-товстошоломники.',
          positive: true,
          timestamp: nextTick
        });
        if (updatedDwarf.thoughts.length > 8) updatedDwarf.thoughts.pop();
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

  return {
    ...state,
    tick: nextTick,
    day: currentDay,
    season: currentSeason,
    year: currentYear,
    wealth,
    dwarves,
    creatures,
    items,
    stockpilesCounts: {
      stone: stockpileStoneCount,
      wood: stockpileWoodCount,
      food: stockpileFoodCount,
      ore: stockpileOreCount,
      ale: stockpileAleCount
    }
  };
}
