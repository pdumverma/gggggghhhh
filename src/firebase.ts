import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Receipt, ShopSettings } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot (Mandatory constraint in firebase-integration-rpc)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

// Sanitize Receipt payload to adhere strictly to firebase-blueprint.json & firestore.rules volumetric constraints
export function sanitizeReceiptForFirestore(receipt: Receipt, ownerId: string) {
  const safeId = (receipt.id || 'R-0100')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 64);
  const safeVendor = (receipt.vendor || 'Unidentified Merchant').slice(0, 200);
  const safeDate = (receipt.date || '20 Oct 2026').slice(0, 64);
  const safeFileName = (receipt.fileName || 'receipt.jpg').slice(0, 256);
  const safeItems = (receipt.items || []).slice(0, 50).map((it) => ({
    name: String(it.name || 'Item').slice(0, 160),
    amount: Number(it.amount) || 0,
  }));
  const safeUnclear = (receipt.unclearFields || [])
    .slice(0, 10)
    .map((f) => String(f).slice(0, 64));

  const payload: Record<string, any> = {
    id: safeId,
    ownerId,
    vendor: safeVendor,
    date: safeDate,
    category: receipt.category || 'Supplies & Stock',
    total: Math.max(0, Math.min(100000000, Number(receipt.total) || 0)),
    status: receipt.status || 'needs_review',
    fileName: safeFileName,
    currency: (receipt.currency || 'INR').slice(0, 12),
    unclearFields: safeUnclear,
    items: safeItems,
    updatedAt: serverTimestamp(),
  };

  if (receipt.sourceTag) payload.sourceTag = receipt.sourceTag;
  if (receipt.duplicateOfId) payload.duplicateOfId = receipt.duplicateOfId.slice(0, 64);
  if (receipt.gstin) payload.gstin = receipt.gstin.slice(0, 32);
  if (receipt.address) payload.address = receipt.address.slice(0, 400);
  if (receipt.billNo) payload.billNo = receipt.billNo.slice(0, 64);
  if (receipt.subtotal !== undefined) payload.subtotal = receipt.subtotal;
  if (receipt.tax !== undefined) payload.tax = receipt.tax;
  if (typeof receipt.confidenceScore === 'number') {
    payload.confidenceScore = Math.max(0, Math.min(1, receipt.confidenceScore));
  }
  if (typeof receipt.overrideConfirmed === 'boolean') {
    payload.overrideConfirmed = receipt.overrideConfirmed;
  }
  if (typeof receipt.arithmeticMismatch === 'boolean') {
    payload.arithmeticMismatch = receipt.arithmeticMismatch;
  }
  if (receipt.arithmeticMessage) {
    payload.arithmeticMessage = receipt.arithmeticMessage.slice(0, 300);
  }

  return payload;
}

export async function saveReceiptToFirestore(
  receipt: Receipt,
  user: User | null = auth.currentUser,
  isCreate = false
): Promise<void> {
  if (!user || !user.emailVerified) return;
  const path = `users/${user.uid}/receipts/${receipt.id}`;
  try {
    const payload = sanitizeReceiptForFirestore(receipt, user.uid);
    if (isCreate) {
      payload.createdAt = serverTimestamp();
    }
    await setDoc(doc(db, 'users', user.uid, 'receipts', receipt.id), payload, {
      merge: !isCreate,
    });
  } catch (error) {
    handleFirestoreError(
      error,
      isCreate ? OperationType.CREATE : OperationType.WRITE,
      path
    );
  }
}

export async function saveShopSettingsToFirestore(
  settings: ShopSettings,
  user: User | null = auth.currentUser,
  isCreate = false
): Promise<void> {
  if (!user || !user.emailVerified) return;
  const path = `users/${user.uid}/private/settings`;
  try {
    const payload = {
      ownerId: user.uid,
      shopName: (settings.shopName || 'Shop').slice(0, 200),
      ownerName: (settings.ownerName || '').slice(0, 160),
      gstin: (settings.gstin || '').slice(0, 32),
      phone: (settings.phone || '').slice(0, 32),
      email: (settings.email || '').slice(0, 160),
      address: (settings.address || '').slice(0, 400),
      currencySymbol: (settings.currencySymbol || '₹').slice(0, 8),
      duplicateDetectionEnabled: Boolean(settings.duplicateDetectionEnabled),
      flagUnclearDates: Boolean(settings.flagUnclearDates),
      autoCategorizeReceipts: Boolean(settings.autoCategorizeReceipts),
      monthlyBudget: Math.max(0, Math.min(100000000, Number(settings.monthlyBudget) || 0)),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', user.uid, 'private', 'settings'), payload, {
      merge: !isCreate,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedInitialReceiptsToFirestore(
  receipts: Receipt[],
  user: User | null = auth.currentUser
): Promise<void> {
  if (!user || !user.emailVerified) return;
  for (const r of receipts) {
    await saveReceiptToFirestore(r, user, false);
  }
}

export { onAuthStateChanged, collection, query, where, onSnapshot, doc };
export type { User };
