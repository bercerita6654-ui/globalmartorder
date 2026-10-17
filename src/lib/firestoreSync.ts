import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppDatabase } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firestoreDb = getFirestore(app);

const DB_DOC_ID = 'vidica_global_database_v1';

export async function fetchCloudDatabase(): Promise<AppDatabase | null> {
  try {
    const docRef = doc(firestoreDb, 'app_databases', DB_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AppDatabase;
    }
    return null;
  } catch (err: any) {
    if (err?.code !== 'unavailable' && !err?.message?.includes('offline')) {
      console.warn('Cloud database fetch warning:', err?.message || err);
    }
    return null;
  }
}

export async function saveCloudDatabase(database: AppDatabase): Promise<boolean> {
  try {
    const docRef = doc(firestoreDb, 'app_databases', DB_DOC_ID);
    await setDoc(docRef, {
      ...database,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err: any) {
    if (err?.code !== 'unavailable' && !err?.message?.includes('offline')) {
      console.warn('Cloud database save warning:', err?.message || err);
    }
    return false;
  }
}

export function subscribeCloudDatabase(onUpdate: (database: AppDatabase) => void) {
  try {
    const docRef = doc(firestoreDb, 'app_databases', DB_DOC_ID);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppDatabase;
        if (data && Array.isArray(data.produk)) {
          onUpdate(data);
        }
      }
    }, (err) => {
      // Ignore offline errors silently to avoid spamming console
    });
  } catch (e) {
    return () => {};
  }
}
