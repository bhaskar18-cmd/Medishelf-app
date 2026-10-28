/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Settings, Database, MapPin, Search, ShoppingCart, PackagePlus, AlertTriangle, History, ArrowLeft } from 'lucide-react';

interface NavbarProps {
  shopName: string;
  activeTab: string;
  navStackLength: number;
  onBack: () => void;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ shopName, activeTab, navStackLength, onBack, setActiveTab, onOpenSettings }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Back Button & Brand Wordmark */}
        <div className="flex items-center gap-3">
          {navStackLength > 1 && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold min-h-[40px] min-w-[40px]"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                MediShelf
              </span>
              <span className="text-xs text-teal-700 font-medium truncate max-w-[150px] sm:max-w-[200px] block">
                {shopName || 'Pharmacy Inventory'}
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('find')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'find' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Find Medicine
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'sell' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Sell
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'add' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Add Stock
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'map' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Shelf Map
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'inventory' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'alerts' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Alerts
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'backup' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Backup
          </button>
        </nav>

        {/* Zone 3: Primary Action & Settings */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('sell')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Quick Sell</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Receive Stock</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
