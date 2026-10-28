/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { SetupWizard } from './components/SetupWizard';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { FindMedicine } from './components/FindMedicine';
import { SellMedicine } from './components/SellMedicine';
import { AddStock } from './components/AddStock';
import { ShelfMap } from './components/ShelfMap';
import { InventoryList } from './components/InventoryList';
import { Alerts } from './components/Alerts';
import { TransactionHistory } from './components/TransactionHistory';
import { BackupRestore } from './components/BackupRestore';
import { Reconciliation } from './components/Reconciliation';
import { ScannerModal } from './components/ScannerModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const shop = useLiveQuery(() => db.shops.toCollection().first(), []) || undefined;
  const isShopConfigured = shop !== undefined;

  const [navStack, setNavStack] = useState<string[]>(['dashboard']);
  const currentTab = navStack[navStack.length - 1];

  const [highlightedShelfId, setHighlightedShelfId] = useState<string | null>(null);
  const [highlightedMapId, setHighlightedMapId] = useState<number | null>(null);
  const [scannerMode, setScannerMode] = useState<'medicine' | 'shelf' | null>(null);
  const [scannedBarcodeResult, setScannedBarcodeResult] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  const navigateTo = useCallback((tab: string) => {
    if (tab === currentTab) return;
    setNavStack((prev) => [...prev, tab]);
  }, [currentTab]);

  const handleBack = useCallback(() => {
    if (navStack.length > 1) {
      setNavStack((prev) => prev.slice(0, prev.length - 1));
    }
  }, [navStack.length]);

  // Support browser/Android back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (navStack.length > 1) {
        handleBack();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navStack.length, handleBack]);

  const handleScanSuccess = async (decodedText: string) => {
    setScannerMode(null);
    if (scannerMode === 'medicine') {
      setScannedBarcodeResult(decodedText);
      if (currentTab !== 'add') {
        navigateTo('add');
      }
    } else if (scannerMode === 'shelf') {
      const marker = await db.mapMarkers.where('shelfId').equals(decodedText).first();
      setHighlightedShelfId(decodedText);
      setHighlightedMapId(marker ? marker.mapId : null);
      if (currentTab !== 'map') {
        navigateTo('map');
      }
    }
  };

  if (!isShopConfigured) {
    return <SetupWizard onComplete={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      <Navbar
        shopName={shop?.shopName || 'MediShelf'}
        activeTab={currentTab}
        navStackLength={navStack.length}
        onBack={handleBack}
        setActiveTab={(tab) => navigateTo(tab)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            shop={shop}
            setActiveTab={(tab) => navigateTo(tab)}
            onOpenScanner={(mode) => setScannerMode(mode)}
          />
        )}

        {currentTab === 'find' && (
          <FindMedicine
            onSelectShowOnMap={(shelfId, mapId) => {
              setHighlightedShelfId(shelfId);
              setHighlightedMapId(mapId);
              navigateTo('map');
            }}
            onOpenScanner={(mode) => setScannerMode(mode)}
          />
        )}

        {currentTab === 'sell' && (
          <SellMedicine onSuccess={() => navigateTo('dashboard')} />
        )}

        {currentTab === 'add' && (
          <AddStock
            initialBarcode={scannedBarcodeResult}
            onOpenScanner={(mode) => setScannerMode(mode)}
            onSuccess={() => {
              setScannedBarcodeResult('');
              navigateTo('dashboard');
            }}
            onCancel={handleBack}
          />
        )}

        {currentTab === 'map' && (
          <ShelfMap
            highlightedShelfId={highlightedShelfId}
            highlightedMapId={highlightedMapId}
            onClearHighlight={() => {
              setHighlightedShelfId(null);
              setHighlightedMapId(null);
            }}
          />
        )}

        {currentTab === 'inventory' && <InventoryList />}

        {currentTab === 'alerts' && <Alerts />}

        {currentTab === 'transactions' && <TransactionHistory />}

        {currentTab === 'backup' && <BackupRestore />}

        {currentTab === 'reconciliation' && (
          <Reconciliation onSuccess={() => navigateTo('dashboard')} />
        )}
      </main>

      {scannerMode && (
        <ScannerModal
          title={scannerMode === 'medicine' ? 'Scan Medicine Barcode' : 'Scan Shelf QR Code'}
          onScanSuccess={handleScanSuccess}
          onClose={() => setScannerMode(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          shop={shop}
          onClose={() => setShowSettings(false)}
          onUpdate={() => window.location.reload()}
        />
      )}
    </div>
  );
}
