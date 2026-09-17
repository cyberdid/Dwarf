import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OverworldView } from '../src/components/OverworldView';
import { generateOverworld, dispatchExpedition } from '../src/engine/overworldGen';
import { generateWorld, FORTRESS_SIZE_PRESETS } from '../src/engine/worldGen';
import { OverworldState } from '../src/types/simulation';

describe('OverworldView component', () => {
  const overworld = generateOverworld(4213);
  const fortressState = generateWorld({
    sizeX: FORTRESS_SIZE_PRESETS.standard.sizeX,
    sizeY: FORTRESS_SIZE_PRESETS.standard.sizeY,
    depthZ: FORTRESS_SIZE_PRESETS.standard.depthZ,
    seed: 4213,
    biome: 'mountain',
  });

  it('renders "map" tab without throwing any TypeError and contains embark coordinates', () => {
    expect(() => {
      const html = renderToStaticMarkup(
        React.createElement(OverworldView, {
          overworld,
          onUpdateOverworld: () => {},
          fortressState,
          onEmbarkAtTile: () => {},
          onClose: () => {},
          initialTab: 'map',
        })
      );
      expect(html).toContain('overworld-view-modal');
      expect(html).toContain('overworld-map-canvas');
      expect(html).toContain(`X:${overworld.currentEmbarkCoords.x}`);
      expect(html).toContain(`Y:${overworld.currentEmbarkCoords.y}`);
    }).not.toThrow();
  });

  it('renders "expeditions" tab with empty expeditions without throwing any TypeError', () => {
    expect(() => {
      const html = renderToStaticMarkup(
        React.createElement(OverworldView, {
          overworld,
          onUpdateOverworld: () => {},
          fortressState,
          onEmbarkAtTile: () => {},
          onClose: () => {},
          initialTab: 'expeditions',
        })
      );
      expect(html).toContain('Спорядити Нову Експедицію');
      expect(html).toContain('Активні Експедиції (0)');
    }).not.toThrow();
  });

  it('renders "expeditions" tab with active expeditions properly accessing targetSiteName and dwarvesCount', () => {
    const withExpedition: OverworldState = dispatchExpedition(
      overworld,
      'trade',
      { x: 20, y: 25 },
      'Місто Золотого Колоса',
      overworld.civilizations[0]?.id || null,
      3
    );

    expect(withExpedition.expeditions.length).toBeGreaterThan(0);

    expect(() => {
      const html = renderToStaticMarkup(
        React.createElement(OverworldView, {
          overworld: withExpedition,
          onUpdateOverworld: () => {},
          fortressState,
          onEmbarkAtTile: () => {},
          onClose: () => {},
          initialTab: 'expeditions',
        })
      );
      expect(html).toContain('Місто Золотого Колоса');
      expect(html).toContain('3 гномів');
      expect(html).toContain('trade');
    }).not.toThrow();
  });

  it('renders "civilizations" tab without throwing any TypeError and displays civ relations and leaders', () => {
    expect(() => {
      const html = renderToStaticMarkup(
        React.createElement(OverworldView, {
          overworld,
          onUpdateOverworld: () => {},
          fortressState,
          onEmbarkAtTile: () => {},
          onClose: () => {},
          initialTab: 'civilizations',
        })
      );
      expect(html).toContain(overworld.civilizations[0].name);
      expect(html).toContain(overworld.civilizations[0].leader);
      expect(html).toContain(overworld.civilizations[0].relation.toUpperCase());
    }).not.toThrow();
  });

  it('renders "legends" tab without throwing any TypeError and displays chronological events', () => {
    expect(() => {
      const html = renderToStaticMarkup(
        React.createElement(OverworldView, {
          overworld,
          onUpdateOverworld: () => {},
          fortressState,
          onEmbarkAtTile: () => {},
          onClose: () => {},
          initialTab: 'legends',
        })
      );
      expect(html).toContain('Хроніки та Легенди Світу');
      expect(html).toContain(overworld.legends[0].titleEn);
    }).not.toThrow();
  });

  it('handles tiles with and without rivers and sites safely', () => {
    // Find a tile with a site and river
    let riverTileFound = false;
    let siteTileFound = false;
    for (let y = 0; y < overworld.sizeY; y++) {
      for (let x = 0; x < overworld.sizeX; x++) {
        const t = overworld.tiles[y][x];
        if (t.hasRiver) riverTileFound = true;
        if (t.site) siteTileFound = true;
      }
    }
    expect(riverTileFound).toBe(true);
    expect(siteTileFound).toBe(true);
  });
});
