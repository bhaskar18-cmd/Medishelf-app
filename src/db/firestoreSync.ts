/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db as firestoreDb, auth, handleFirestoreError, OperationType } from './firebase';
import { db as dexieDb } from './db';
import { collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';

export function initFirestoreSync(onSynced?: () => void) {
  if (!auth.currentUser) return () => {};

  const unsubscribers: (() => void)[] = [];

  // Sync Shops
  unsubscribers.push(
    onSnapshot(collection(firestoreDb, 'shops'), async (snapshot) => {
      try {
        const shops = snapshot.docs.map(d => ({ id: Number(d.id) || 1, ...d.data() }));
        await dexieDb.shops.clear();
        if (shops.length > 0) {
          await dexieDb.shops.bulkPut(shops as any);
        }
        if (onSynced) onSynced();
      } catch (err) {
        console.error('Error syncing shops:', err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shops');
    })
  );

  // Sync Shelves
  unsubscribers.push(
    onSnapshot(collection(firestoreDb, 'shelves'), async (snapshot) => {
      try {
        const shelves = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        await dexieDb.shelves.clear();
        if (shelves.length > 0) {
          await dexieDb.shelves.bulkPut(shelves as any);
        }
      } catch (err) {
        console.error('Error syncing shelves:', err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shelves');
    })
  );

  // Sync Medicines
  unsubscribers.push(
    onSnapshot(collection(firestoreDb, 'medicines'), async (snapshot) => {
      try {
        const meds = snapshot.docs.map(d => ({ id: Number(d.id) || Date.now(), ...d.data() }));
        await dexieDb.medicines.clear();
        if (meds.length > 0) {
          await dexieDb.medicines.bulkPut(meds as any);
        }
      } catch (err) {
        console.error('Error syncing medicines:', err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'medicines');
    })
  );

  // Sync Batches
  unsubscribers.push(
    onSnapshot(collection(firestoreDb, 'batches'), async (snapshot) => {
      try {
        const batches = snapshot.docs.map(d => ({ id: Number(d.id) || Date.now(), ...d.data() }));
        await dexieDb.batches.clear();
        if (batches.length > 0) {
          await dexieDb.batches.bulkPut(batches as any);
        }
      } catch (err) {
        console.error('Error syncing batches:', err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'batches');
    })
  );

  // Sync Transactions
  unsubscribers.push(
    onSnapshot(collection(firestoreDb, 'transactions'), async (snapshot) => {
      try {
        const txs = snapshot.docs.map(d => ({ id: Number(d.id) || Date.now(), ...d.data() }));
        await dexieDb.transactions.clear();
        if (txs.length > 0) {
          await dexieDb.transactions.bulkPut(txs as any);
        }
      } catch (err) {
        console.error('Error syncing transactions:', err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    })
  );

  // Sync Sales
  unsubscribers.push(
    onSnapshot(collection(firestoreDb, 'sales'), async (snapshot) => {
      try {
        const sales = snapshot.docs.map(d => ({ id: Number(d.id) || Date.now(), ...d.data() }));
        await dexieDb.sales.clear();
        if (sales.length > 0) {
          await dexieDb.sales.bulkPut(sales as any);
        }
      } catch (err) {
        console.error('Error syncing sales:', err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sales');
    })
  );

  // Sync Maps
  unsubscribers.push(
    onSnapshot(collection(firestoreDb, 'maps'), async (snapshot) => {
      try {
        const maps = snapshot.docs.map(d => ({ id: Number(d.id) || Date.now(), ...d.data() }));
        await dexieDb.maps.clear();
        if (maps.length > 0) {
          await dexieDb.maps.bulkPut(maps as any);
        }
      } catch (err) {
        console.error('Error syncing maps:', err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'maps');
    })
  );

  // Sync MapMarkers
  unsubscribers.push(
    onSnapshot(collection(firestoreDb, 'mapMarkers'), async (snapshot) => {
      try {
        const markers = snapshot.docs.map(d => ({ id: Number(d.id) || Date.now(), ...d.data() }));
        await dexieDb.mapMarkers.clear();
        if (markers.length > 0) {
          await dexieDb.mapMarkers.bulkPut(markers as any);
        }
      } catch (err) {
        console.error('Error syncing mapMarkers:', err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mapMarkers');
    })
  );

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

export function compressBase64Image(base64Str: string, maxWidth = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

export async function seedFirestoreFromDexieIfNeeded() {
  if (!auth.currentUser) return;
  try {
    const shopsSnap = await getDocs(collection(firestoreDb, 'shops'));
    if (shopsSnap.empty) {
      const localShops = await dexieDb.shops.toArray();
      for (const s of localShops) {
        const id = s.id ? String(s.id) : '1';
        let sData = { ...s };
        if (sData.mapImage && sData.mapImage.length > 800000) {
          sData.mapImage = await compressBase64Image(sData.mapImage, 800, 0.6);
        }
        await setDoc(doc(firestoreDb, 'shops', id), sData);
      }
      const localShelves = await dexieDb.shelves.toArray();
      for (const sh of localShelves) {
        await setDoc(doc(firestoreDb, 'shelves', sh.id), sh);
      }
      const localMeds = await dexieDb.medicines.toArray();
      for (const m of localMeds) {
        if (m.id) await setDoc(doc(firestoreDb, 'medicines', String(m.id)), m);
      }
      const localBatches = await dexieDb.batches.toArray();
      for (const b of localBatches) {
        if (b.id) await setDoc(doc(firestoreDb, 'batches', String(b.id)), b);
      }
      const localMaps = await dexieDb.maps.toArray();
      for (const map of localMaps) {
        if (map.id) {
          let mapData = { ...map };
          if (mapData.image && mapData.image.length > 800000) {
            mapData.image = await compressBase64Image(mapData.image, 800, 0.6);
          }
          await setDoc(doc(firestoreDb, 'maps', String(map.id)), mapData);
        }
      }
      const localMarkers = await dexieDb.mapMarkers.toArray();
      for (const marker of localMarkers) {
        if (marker.id) await setDoc(doc(firestoreDb, 'mapMarkers', String(marker.id)), marker);
      }
    }
  } catch (err) {
    console.error('Error seeding Firestore from Dexie:', err);
  }
}

// Firestore write helpers
export async function saveShopToFirestore(shop: any) {
  if (!auth.currentUser) return;
  try {
    let shopData = { ...shop };
    if (shopData.mapImage && shopData.mapImage.length > 800000) {
      shopData.mapImage = await compressBase64Image(shopData.mapImage, 800, 0.6);
    }
    await setDoc(doc(firestoreDb, 'shops', '1'), shopData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'shops/1');
  }
}

export async function saveShelfToFirestore(shelf: any) {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(firestoreDb, 'shelves', shelf.id), shelf);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `shelves/${shelf.id}`);
  }
}

export async function deleteShelfFromFirestore(shelfId: string) {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(firestoreDb, 'shelves', shelfId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `shelves/${shelfId}`);
  }
}

export async function addMedicineToFirestore(medicine: any): Promise<string> {
  if (!auth.currentUser) return '';
  try {
    const docRef = await addDoc(collection(firestoreDb, 'medicines'), medicine);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'medicines');
    return '';
  }
}

export async function addBatchToFirestore(batch: any): Promise<string> {
  if (!auth.currentUser) return '';
  try {
    const docRef = await addDoc(collection(firestoreDb, 'batches'), batch);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'batches');
    return '';
  }
}

export async function updateBatchInFirestore(id: number | string, data: any) {
  if (!auth.currentUser) return;
  try {
    await updateDoc(doc(firestoreDb, 'batches', String(id)), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `batches/${id}`);
  }
}

export async function addTransactionToFirestore(tx: any) {
  if (!auth.currentUser) return;
  try {
    await addDoc(collection(firestoreDb, 'transactions'), tx);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'transactions');
  }
}

export async function addSaleToFirestore(sale: any) {
  if (!auth.currentUser) return;
  try {
    await addDoc(collection(firestoreDb, 'sales'), sale);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'sales');
  }
}

export async function saveMapToFirestore(map: any): Promise<string> {
  if (!auth.currentUser) return '';
  try {
    let mapData = { ...map };
    if (mapData.image && mapData.image.length > 800000) {
      mapData.image = await compressBase64Image(mapData.image, 800, 0.6);
    }
    const docRef = await addDoc(collection(firestoreDb, 'maps'), mapData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'maps');
    return '';
  }
}

export async function updateMapInFirestore(id: number | string, data: any) {
  if (!auth.currentUser) return;
  try {
    let mapData = { ...data };
    if (mapData.image && mapData.image.length > 800000) {
      mapData.image = await compressBase64Image(mapData.image, 800, 0.6);
    }
    await updateDoc(doc(firestoreDb, 'maps', String(id)), mapData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `maps/${id}`);
  }
}

export async function addMarkerToFirestore(marker: any): Promise<string> {
  if (!auth.currentUser) return '';
  try {
    const docRef = await addDoc(collection(firestoreDb, 'mapMarkers'), marker);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'mapMarkers');
    return '';
  }
}

export async function updateMarkerInFirestore(id: number | string, data: any) {
  if (!auth.currentUser) return;
  try {
    await updateDoc(doc(firestoreDb, 'mapMarkers', String(id)), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mapMarkers/${id}`);
  }
}

export async function deleteMarkerFromFirestore(id: number | string) {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(firestoreDb, 'mapMarkers', String(id)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `mapMarkers/${id}`);
  }
}
