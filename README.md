# MediShelf — Offline Pharmacy Shelf Locator & Inventory Management App

**Tagline:** Find Every Medicine. Know Every Shelf.

MediShelf is a professional, offline-first pharmacy inventory and shelf locator application built with React, TypeScript, Vite, IndexedDB (Dexie), and Tailwind CSS. It provides deterministic inventory operations, shelf map visualization, FEFO batch tracking, and sales management without any external cloud database or AI dependencies.

---

## Features

1. **First-Time Shop Setup Wizard**: Configure shop details and floor plan maps or use the default generated shelf grid.
2. **Editable Shelf Locations**: Pre-configured with **Area A** (Open Wooden Shelves, with A4-R disabled by default) and **Area B** (Glass-Door Cabinet 3x3), with full support for custom areas and shelf IDs.
3. **Interactive Shelf Map**: Visual map viewer with normalized marker overlays, highlighting searched medicines, and map replacement without losing inventory records.
4. **Fast Local Search**: Instant search by brand name, generic name, strength, dosage form, or barcode.
5. **Add Stock & Batch Receiving**: Receive incoming batch shipments with expiry dates, manufacturing dates, purchase/selling prices, and shelf assignment.
6. **Sell Medicine Without Scanning**: FEFO (First Expiry, First Out) batch selection, multi-item sales cart, automatic stock deduction, and atomic transaction logging.
7. **Physical Stock Reconciliation**: Audit screen comparing system quantities against physical counts with adjustment reasons.
8. **Expiry & Low-Stock Alerts**: Programmed date comparisons for expired batches, <7 days, <30 days, <90 days expiry windows, and low-stock thresholds.
9. **Barcode & Shelf QR Scanning**: Camera-based barcode and QR scanning using `html5-qrcode`.
10. **Data Backup & Restore**: Secure local JSON backups and CSV catalog export/import.

---

## Getting Started

### 1. Run the Development Server
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. Build for Production (Web)
```bash
npm run build
```
This generates static production assets in the `dist/` directory.

---

## Capacitor Android Packaging Guide

To package MediShelf as a native Android APK using Capacitor:

### Step 1: Install Capacitor CLI & Core
```bash
npm install @capacitor/core @capacitor/cli
npx cap init MediShelf com.medishelf.app --web-dir dist
```

### Step 2: Add Android Platform
```bash
npm install @capacitor/android
npx cap add android
```

### Step 3: Build & Sync
```bash
npm run build
npx cap sync
```

### Step 4: Open Android Studio & Build APK
```bash
npx cap open android
```
In Android Studio:
1. Connect an Android device or start an Android Emulator.
2. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Install the generated APK on your mobile device for offline pharmacy operations.

---

## Architecture & Offline Storage

- **Database:** IndexedDB via Dexie (stores shops, shelves, medicines, batches, transactions, and sales locally on device).
- **Offline First:** Fully functional without an active internet connection after initial installation.
- **Privacy:** 100% local storage. No data is transmitted to external cloud services.
