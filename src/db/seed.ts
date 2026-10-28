/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, Shelf } from './db';

export async function initializeDefaultShelves() {
  const existingShelves = await db.shelves.count();
  if (existingShelves === 0) {
    const defaultShelves: Shelf[] = [
      { id: 'A1', shelfCode: 'A1', areaCode: 'Area A', description: 'Top Shelf', positionX: 15, positionY: 20, width: 15, height: 12, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'A2-L', shelfCode: 'A2-L', areaCode: 'Area A', description: 'Middle Left', positionX: 15, positionY: 35, width: 15, height: 12, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'A2-C', shelfCode: 'A2-C', areaCode: 'Area A', description: 'Middle Center', positionX: 35, positionY: 35, width: 15, height: 12, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'A2-R', shelfCode: 'A2-R', areaCode: 'Area A', description: 'Middle Right', positionX: 55, positionY: 35, width: 15, height: 12, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'A3-L', shelfCode: 'A3-L', areaCode: 'Area A', description: 'Lower Left', positionX: 15, positionY: 50, width: 15, height: 12, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'A3-C', shelfCode: 'A3-C', areaCode: 'Area A', description: 'Lower Center', positionX: 35, positionY: 50, width: 15, height: 12, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'A3-R', shelfCode: 'A3-R', areaCode: 'Area A', description: 'Lower Right', positionX: 55, positionY: 50, width: 15, height: 12, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'A4-L', shelfCode: 'A4-L', areaCode: 'Area A', description: 'Bottom Left', positionX: 15, positionY: 65, width: 15, height: 12, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'A4-R', shelfCode: 'A4-R', areaCode: 'Area A', description: 'Blocked', positionX: 35, positionY: 65, width: 15, height: 12, isAvailable: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

      { id: 'B1', shelfCode: 'B1', areaCode: 'Area B', description: 'B1', positionX: 20, positionY: 20, width: 15, height: 16, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'B2', shelfCode: 'B2', areaCode: 'Area B', description: 'B2', positionX: 45, positionY: 20, width: 15, height: 16, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'B3', shelfCode: 'B3', areaCode: 'Area B', description: 'B3', positionX: 70, positionY: 20, width: 15, height: 16, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'B4', shelfCode: 'B4', areaCode: 'Area B', description: 'B4', positionX: 20, positionY: 45, width: 15, height: 16, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'B5', shelfCode: 'B5', areaCode: 'Area B', description: 'B5', positionX: 45, positionY: 45, width: 15, height: 16, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'B6', shelfCode: 'B6', areaCode: 'Area B', description: 'B6', positionX: 70, positionY: 45, width: 15, height: 16, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'B7', shelfCode: 'B7', areaCode: 'Area B', description: 'B7', positionX: 20, positionY: 70, width: 15, height: 16, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'B8', shelfCode: 'B8', areaCode: 'Area B', description: 'B8', positionX: 45, positionY: 70, width: 15, height: 16, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'B9', shelfCode: 'B9', areaCode: 'Area B', description: 'B9', positionX: 70, positionY: 70, width: 15, height: 16, isAvailable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    await db.shelves.bulkAdd(defaultShelves);
  }

  const existingMaps = await db.maps.count();
  if (existingMaps === 0) {
    const mapAId = await db.maps.add({
      mapName: 'Area A — Wooden Shelves',
      areaCode: 'Area A',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const mapBId = await db.maps.add({
      mapName: 'Area B — Glass Cabinet',
      areaCode: 'Area B',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const shelves = await db.shelves.toArray();
    for (const s of shelves) {
      if (s.areaCode === 'Area A') {
        await db.mapMarkers.add({
          mapId: mapAId,
          shelfId: s.id,
          positionX: s.positionX || 20,
          positionY: s.positionY || 20,
          isVisible: true
        });
      } else if (s.areaCode === 'Area B') {
        await db.mapMarkers.add({
          mapId: mapBId,
          shelfId: s.id,
          positionX: s.positionX || 20,
          positionY: s.positionY || 20,
          isVisible: true
        });
      }
    }
  }
}
