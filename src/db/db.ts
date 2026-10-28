/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { Table } from 'dexie';

export interface ShopConfiguration {
  id?: number;
  shopName: string;
  address?: string;
  phone?: string;
  mapImage?: string; // legacy single map image
  defaultLowStockThreshold: number;
  pinLock?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shelf {
  id: string; // e.g. "A1", "A2-L", "B1"
  shelfCode: string;
  areaCode: string; // "Area A" or "Area B"
  description: string;
  positionX: number; // percentage 0-100 (legacy fallback)
  positionY: number; // percentage 0-100 (legacy fallback)
  width: number;
  height: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyMap {
  id?: number;
  mapName: string;
  areaCode: string; // "Area A", "Area B", or "General"
  image?: string; // base64 or object URL
  createdAt: string;
  updatedAt: string;
}

export interface MapMarker {
  id?: number;
  mapId: number;
  shelfId: string;
  positionX: number; // percentage 0-100
  positionY: number; // percentage 0-100
  isVisible: boolean;
}

export interface Medicine {
  id?: number;
  brandName: string;
  genericName: string;
  strength: string; // e.g. "500 mg"
  dosageForm: string; // e.g. "Tablet", "Capsule", "Syrup", "Injection", "Ointment"
  manufacturer: string;
  barcode: string;
  notes?: string;
  lowStockThreshold?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockBatch {
  id?: number;
  medicineId: number;
  shelfId: string;
  batchNumber: string;
  quantity: number;
  unit: string; // e.g. "Strips", "Boxes", "Bottles", "Tablets", "Vials"
  manufacturingDate?: string;
  expiryDate: string; // ISO date string YYYY-MM-DD or YYYY-MM
  expiryPrecision: 'exact' | 'month';
  purchasePrice?: number;
  sellingPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id?: number;
  transactionType: 'stock_in' | 'sale' | 'return' | 'damaged' | 'expired' | 'adjustment';
  medicineId: number;
  batchId?: number;
  shelfId?: string;
  quantityChange: number; // positive for stock in/return, negative for sale/damaged/expired
  timestamp: string;
  reason?: string;
  referenceId?: string;
}

export interface SaleItem {
  medicineId: number;
  batchId: number;
  shelfId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id?: number;
  saleNumber: string;
  items: SaleItem[];
  totalAmount: number;
  timestamp: string;
  status: 'completed' | 'cancelled';
}

class MediShelfDB extends Dexie {
  shops!: Table<ShopConfiguration, number>;
  shelves!: Table<Shelf, string>;
  medicines!: Table<Medicine, number>;
  batches!: Table<StockBatch, number>;
  transactions!: Table<InventoryTransaction, number>;
  sales!: Table<Sale, number>;
  maps!: Table<PharmacyMap, number>;
  mapMarkers!: Table<MapMarker, number>;

  constructor() {
    super('MediShelfDB');
    this.version(1).stores({
      shops: '++id, shopName',
      shelves: 'id, areaCode, shelfCode',
      medicines: '++id, brandName, genericName, barcode',
      batches: '++id, medicineId, shelfId, batchNumber, expiryDate',
      transactions: '++id, transactionType, medicineId, shelfId, timestamp',
      sales: '++id, saleNumber, timestamp, status'
    });
    this.version(2).stores({
      shops: '++id, shopName',
      shelves: 'id, areaCode, shelfCode',
      medicines: '++id, brandName, genericName, barcode',
      batches: '++id, medicineId, shelfId, batchNumber, expiryDate',
      transactions: '++id, transactionType, medicineId, shelfId, timestamp',
      sales: '++id, saleNumber, timestamp, status',
      maps: '++id, mapName, areaCode',
      mapMarkers: '++id, mapId, shelfId'
    }).upgrade(async tx => {
      const shops = await tx.table('shops').toArray();
      const existingMaps = await tx.table('maps').count();
      if (existingMaps === 0) {
        const mapAId = await tx.table('maps').add({
          mapName: 'Area A — Wooden Shelves',
          areaCode: 'Area A',
          image: shops.length > 0 ? shops[0].mapImage : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        const mapBId = await tx.table('maps').add({
          mapName: 'Area B — Glass Cabinet',
          areaCode: 'Area B',
          image: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const shelves = await tx.table('shelves').toArray();
        for (const s of shelves) {
          if (s.areaCode === 'Area A') {
            await tx.table('mapMarkers').add({
              mapId: mapAId,
              shelfId: s.id,
              positionX: s.positionX || 20,
              positionY: s.positionY || 20,
              isVisible: true
            });
          } else if (s.areaCode === 'Area B') {
            await tx.table('mapMarkers').add({
              mapId: mapBId,
              shelfId: s.id,
              positionX: s.positionX || 20,
              positionY: s.positionY || 20,
              isVisible: true
            });
          }
        }
      }
    });
  }
}

export const db = new MediShelfDB();
