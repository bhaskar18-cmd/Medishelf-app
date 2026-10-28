/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, PharmacyMap, MapMarker, Shelf } from '../db/db';
import { Map, Upload, Plus, Trash2, Edit3, MapPin, AlertTriangle, CheckCircle2, Eye, EyeOff, X, ArrowLeft, Pill } from 'lucide-react';

interface ShelfMapProps {
  highlightedShelfId?: string | null;
  highlightedMapId?: number | null;
  onClearHighlight?: () => void;
}

export const ShelfMap: React.FC<ShelfMapProps> = ({ highlightedShelfId, highlightedMapId, onClearHighlight }) => {
  const maps = useLiveQuery(() => db.maps.toArray(), []) || [];
  const markers = useLiveQuery(() => db.mapMarkers.toArray(), []) || [];
  const shelves = useLiveQuery(() => db.shelves.toArray(), []) || [];
  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];
  const medicines = useLiveQuery(() => db.medicines.toArray(), []) || [];

  const [activeMapId, setActiveMapId] = useState<number | null>(highlightedMapId || null);
  const [showAddMapModal, setShowAddMapModal] = useState(false);
  const [editingMap, setEditingMap] = useState<PharmacyMap | null>(null);

  // In-app confirmation modal state for deletion (bypassing sandbox window.confirm)
  const [mapToDelete, setMapToDelete] = useState<{ id: number; name: string } | null>(null);
  const [diagnosticMsg, setDiagnosticMsg] = useState<string>('');

  // Form states for Add/Edit Map
  const [mapName, setMapName] = useState('');
  const [areaCode, setAreaCode] = useState('Area A');
  const [mapImage, setMapImage] = useState<string>('');

  // Map editor states
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(highlightedShelfId || null);
  const [hideDigitalLabels, setHideDigitalLabels] = useState(false);
  const [customShelfId, setCustomShelfId] = useState('');
  const [customShelfDesc, setCustomShelfDesc] = useState('');
  const [placingShelfId, setPlacingShelfId] = useState<string | null>(null);

  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!placingShelfId || !activeMap || !activeMap.id) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    const existingMarker = markers.find((mk) => mk.mapId === activeMap.id && mk.shelfId === placingShelfId);
    if (existingMarker && existingMarker.id) {
      await db.mapMarkers.update(existingMarker.id, {
        positionX: Number(clampedX.toFixed(2)),
        positionY: Number(clampedY.toFixed(2)),
        isVisible: true,
      });
    } else {
      await db.mapMarkers.add({
        mapId: activeMap.id,
        shelfId: placingShelfId,
        positionX: Number(clampedX.toFixed(2)),
        positionY: Number(clampedY.toFixed(2)),
        isVisible: true,
      });
    }

    setPlacingShelfId(null);
    setSelectedShelfId(placingShelfId);
  };

  const handleCreateCustomShelfAndPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customShelfId.trim() || !activeMap) return;
    const shelfCode = customShelfId.trim().toUpperCase();
    
    const existing = shelves.find(s => s.id === shelfCode);
    if (!existing) {
      await db.shelves.add({
        id: shelfCode,
        shelfCode,
        areaCode: activeMap.areaCode,
        description: customShelfDesc.trim() || shelfCode,
        positionX: 50,
        positionY: 50,
        width: 15,
        height: 12,
        isAvailable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setCustomShelfId('');
    setCustomShelfDesc('');
    setPlacingShelfId(shelfCode);
  };

  useEffect(() => {
    if (highlightedMapId) {
      setActiveMapId(highlightedMapId);
    }
    if (highlightedShelfId) {
      setSelectedShelfId(highlightedShelfId);
    }
  }, [highlightedMapId, highlightedShelfId]);

  const activeMap = maps.find((m) => m.id === activeMapId);
  const activeMarkers = activeMap ? markers.filter((mk) => mk.mapId === activeMap.id) : [];

  const positionedShelfIds = new Set(activeMarkers.map((mk) => mk.shelfId));
  const unpositionedShelves = shelves.filter((s) => {
    if (positionedShelfIds.has(s.id)) return false;
    if (activeMap?.areaCode === 'General') return true;
    return s.areaCode === activeMap?.areaCode;
  });

  const handleSaveMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapName.trim()) return;

    if (editingMap && editingMap.id) {
      await db.maps.update(editingMap.id, {
        mapName: mapName.trim(),
        areaCode,
        image: mapImage || editingMap.image,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const newMapId = await db.maps.add({
        mapName: mapName.trim(),
        areaCode,
        image: mapImage || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const matchingShelves = shelves.filter((s) => s.areaCode === areaCode);
      for (const s of matchingShelves) {
        await db.mapMarkers.add({
          mapId: newMapId,
          shelfId: s.id,
          positionX: 30,
          positionY: 30,
          isVisible: true,
        });
      }
      setActiveMapId(newMapId);
    }

    setMapName('');
    setMapImage('');
    setEditingMap(null);
    setShowAddMapModal(false);
  };

  const confirmDeleteMap = async () => {
    if (!mapToDelete) return;
    setDiagnosticMsg('Storage operation started: Deleting map...');
    try {
      await db.maps.delete(mapToDelete.id);
      const allMarkers = await db.mapMarkers.toArray();
      const markerIdsToDelete = allMarkers
        .filter((mk) => Number(mk.mapId) === Number(mapToDelete.id))
        .map((mk) => mk.id!)
        .filter(Boolean);

      if (markerIdsToDelete.length > 0) {
        await db.mapMarkers.bulkDelete(markerIdsToDelete);
      }

      setDiagnosticMsg('Storage operation succeeded: Map deleted.');
      if (activeMapId === mapToDelete.id) {
        setActiveMapId(null);
      }
      setMapToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete map:', err);
      setDiagnosticMsg(`Storage operation failed: ${err.message || err}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setMapImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMarkerToMap = (shelfId: string) => {
    if (!activeMapId) return;
    setPlacingShelfId(shelfId);
  };

  const handleRemoveMarker = async (markerId: number) => {
    await db.mapMarkers.delete(markerId);
    setSelectedShelfId(null);
  };

  const selectedShelfBatches = selectedShelfId
    ? batches.filter((b) => b.shelfId === selectedShelfId && b.quantity > 0)
    : [];
  const selectedShelfObj = shelves.find((s) => s.id === selectedShelfId);
  const currentMarker = activeMarkers.find((mk) => mk.shelfId === selectedShelfId);

  // If viewing a specific map
  if (activeMap) {
    return (
      <div className="space-y-6 pb-12">
        {diagnosticMsg && (
          <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-mono flex items-center justify-between">
            <span>Diagnostic: {diagnosticMsg}</span>
            <button onClick={() => setDiagnosticMsg('')} className="text-slate-400 hover:text-white">×</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveMapId(null)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> All Maps
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{activeMap.mapName}</h1>
              <p className="text-slate-500 text-sm">Associated Area: {activeMap.areaCode}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setHideDigitalLabels(!hideDigitalLabels)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
            >
              {hideDigitalLabels ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {hideDigitalLabels ? 'Show Markers' : 'Hide Digital Labels'}
            </button>
            <button
              onClick={() => {
                setEditingMap(activeMap);
                setMapName(activeMap.mapName);
                setAreaCode(activeMap.areaCode);
                setMapImage(activeMap.image || '');
                setShowAddMapModal(true);
              }}
              className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Edit Map
            </button>
            <button
              onClick={() => {
                setDiagnosticMsg('Delete map button clicked');
                setMapToDelete({ id: activeMap.id!, name: activeMap.mapName });
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Delete Map
            </button>
          </div>
        </div>

        {highlightedShelfId && (
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between text-teal-900 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600 animate-bounce" />
              <span>Highlighting shelf: <strong>{highlightedShelfId}</strong> on this map</span>
            </div>
            {onClearHighlight && (
              <button
                onClick={onClearHighlight}
                className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {placingShelfId && (
          <div className="p-4 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-between text-sm font-bold shadow-xl animate-pulse">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-950" />
              <span>🎯 Placement Mode: Tap the exact location of shelf "{placingShelfId}" on the map image below.</span>
            </div>
            <button
              onClick={() => setPlacingShelfId(null)}
              className="px-3 py-1 bg-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Cancel Placement
            </button>
          </div>
        )}

        {/* Map Workspace & Inspector Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-950 rounded-3xl p-6 relative min-h-[500px] flex items-center justify-center overflow-hidden shadow-sm">
            {activeMap.image ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={activeMap.image}
                  alt={activeMap.mapName}
                  onClick={handleImageClick}
                  className={`max-h-[550px] w-auto object-contain rounded-xl opacity-95 transition-all ${
                    placingShelfId ? 'cursor-crosshair ring-4 ring-amber-400 shadow-2xl' : ''
                  }`}
                />
                {!hideDigitalLabels && activeMarkers.map((mk) => {
                  const isHighlighted = mk.shelfId === highlightedShelfId;
                  const isSelected = mk.shelfId === selectedShelfId;
                  return (
                    <button
                      key={mk.id}
                      onClick={() => setSelectedShelfId(mk.shelfId)}
                      style={{ left: `${mk.positionX}%`, top: `${mk.positionY}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-1.5 ${
                        isHighlighted
                          ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 animate-bounce scale-110 z-30'
                          : isSelected
                          ? 'bg-teal-500 text-white ring-2 ring-white z-20'
                          : 'bg-slate-900/90 text-white border border-slate-700 hover:bg-teal-600 z-10'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-teal-400" />
                      <span>{mk.shelfId}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-24 text-slate-400 space-y-4">
                <Map className="w-12 h-12 mx-auto text-slate-600" />
                <div>
                  <h3 className="text-white font-bold text-base mb-1">No Floor Image Uploaded for this Map</h3>
                  <p className="text-xs text-slate-400">Click "Edit Map" to upload a floor plan image for visual reference.</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-md mx-auto pt-4">
                  {activeMarkers.map((mk) => (
                    <button
                      key={mk.id}
                      onClick={() => setSelectedShelfId(mk.shelfId)}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-bold text-sm hover:border-teal-500"
                    >
                      {mk.shelfId}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shelf Inspector & Unpositioned List */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Shelf Inspector</h3>
                {selectedShelfId && (
                  <button
                    onClick={() => setSelectedShelfId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                )}
              </div>

              {selectedShelfId ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-extrabold text-slate-900">{selectedShelfId}</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                        {selectedShelfObj?.areaCode || 'Shelf'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{selectedShelfObj?.description}</p>
                  </div>

                  {currentMarker && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-700 block">Marker Position on Map (%):</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block">X Position</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={currentMarker.positionX}
                            onChange={async (e) => {
                              const val = Number(e.target.value);
                              if (currentMarker.id) {
                                await db.mapMarkers.update(currentMarker.id, { positionX: val });
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Y Position</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={currentMarker.positionY}
                            onChange={async (e) => {
                              const val = Number(e.target.value);
                              if (currentMarker.id) {
                                await db.mapMarkers.update(currentMarker.id, { positionY: val });
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700 block">Medicines Stored Here:</span>
                    {selectedShelfBatches.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-xl text-center">
                        No active stock batches currently stored in this shelf.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {selectedShelfBatches.map((b) => {
                          const med = medicines.find((m) => m.id === b.medicineId);
                          return (
                            <div key={b.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900">{med?.brandName} {med?.strength}</span>
                                <span className="font-bold text-teal-700">{b.quantity} {b.unit}</span>
                              </div>
                              <span className="text-[11px] text-slate-500">Batch: {b.batchNumber} • Exp: {b.expiryDate}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => setPlacingShelfId(selectedShelfId)}
                      className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MapPin className="w-4 h-4 text-amber-700" /> Reposition Marker on Map
                    </button>
                    {currentMarker && (
                      <button
                        onClick={() => handleRemoveMarker(currentMarker.id!)}
                        className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold text-xs transition-colors"
                      >
                        Remove Marker from this Map
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">Tap any digital shelf marker on the map to inspect stored medicines.</p>
                </div>
              )}
            </div>

            {/* Unpositioned Locations List & Custom Shelf Creator */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Add / Place Shelf Markers</h3>
                <p className="text-xs text-slate-500">Match the exact shelf labels written on your uploaded map (e.g., B1, B2...):</p>
              </div>

              <form onSubmit={handleCreateCustomShelfAndPlace} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Shelf ID (e.g. B1)"
                    value={customShelfId}
                    onChange={(e) => setCustomShelfId(e.target.value)}
                    required
                    className="w-1/2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold uppercase bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Description / Note"
                    value={customShelfDesc}
                    onChange={(e) => setCustomShelfDesc(e.target.value)}
                    className="w-1/2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Create & Place Marker on Map
                </button>
              </form>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700 block">Unpositioned Shelves ({unpositionedShelves.length}):</span>
                {unpositionedShelves.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-medium italic">All shelves for {activeMap.areaCode} are positioned on this map.</p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {unpositionedShelves.map((s) => (
                      <div key={s.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{s.id}</span>
                          <span className="text-slate-500 ml-1">({s.areaCode})</span>
                        </div>
                        <button
                          onClick={() => handleAddMarkerToMap(s.id)}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 shadow-xs"
                        >
                          <Plus className="w-3 h-3" /> Place on Map
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {mapToDelete && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Confirm Delete Map</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete <strong className="text-slate-900">{mapToDelete.name}</strong>? This will permanently remove its floor image and marker layout. All medicines, stock batches, sales, and shelf records will be fully preserved.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMapToDelete(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteMap}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 shadow-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Map Gallery View
  return (
    <div className="space-y-6 pb-12">
      {diagnosticMsg && (
        <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-mono flex items-center justify-between">
          <span>Diagnostic: {diagnosticMsg}</span>
          <button onClick={() => setDiagnosticMsg('')} className="text-slate-400 hover:text-white">×</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pharmacy Floor Maps</h1>
          <p className="text-slate-500 text-sm">Manage multiple floor plans and independent shelf marker layouts.</p>
        </div>
        <button
          onClick={() => {
            setEditingMap(null);
            setMapName('');
            setAreaCode('Area A');
            setMapImage('');
            setShowAddMapModal(true);
          }}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add New Map
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {maps.map((m) => {
          const mMarkers = markers.filter((mk) => mk.mapId === m.id);
          return (
            <div key={m.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
                      {m.areaCode}
                    </span>
                    <h3 className="font-bold text-slate-900 text-lg mt-2">{m.mapName}</h3>
                  </div>
                </div>

                <div className="h-40 rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center relative border border-slate-200">
                  {m.image ? (
                    <img src={m.image} alt={m.mapName} className="w-full h-full object-cover opacity-90" />
                  ) : (
                    <div className="text-center text-slate-500 p-4">
                      <Map className="w-8 h-8 mx-auto mb-1 text-slate-600" />
                      <span className="text-xs">No floor image uploaded</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-xs text-white rounded-lg text-[10px] font-semibold">
                    {mMarkers.length} Markers
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setActiveMapId(m.id!)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                >
                  Open Map View
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingMap(m);
                      setMapName(m.mapName);
                      setAreaCode(m.areaCode);
                      setMapImage(m.image || '');
                      setShowAddMapModal(true);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      setDiagnosticMsg('Delete map button clicked');
                      setMapToDelete({ id: m.id!, name: m.mapName });
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Map Modal */}
      {showAddMapModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">{editingMap ? 'Edit Pharmacy Map' : 'Add New Pharmacy Map'}</h3>
              <button onClick={() => setShowAddMapModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMap} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Map Name *</label>
                <input
                  type="text"
                  required
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  placeholder="e.g. Area A — Wooden Shelves"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Associated Area</label>
                <select
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                >
                  <option value="Area A">Area A</option>
                  <option value="Area B">Area B</option>
                  <option value="General">General / Storage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Floor Plan Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
                {mapImage && <span className="text-[11px] text-teal-600 font-medium block mt-1">Image loaded successfully</span>}
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMapModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 shadow-sm"
                >
                  Save Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {mapToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Confirm Delete Map</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{mapToDelete.name}</strong>? This will permanently remove its floor image and marker layout. All medicines, stock batches, sales, and shelf records will be fully preserved.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMapToDelete(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMap}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
