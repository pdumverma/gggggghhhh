/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Camera } from 'lucide-react';
import {
  AppSection,
  Category,
  ChatMessage,
  LanguageCode,
  LanguageOption,
  PartialExtractionDraft,
  QueuedUpload,
  Receipt,
  RegisterRowEntry,
  RevenueEntry,
  ShopSettings,
  ToastNotification,
} from './types';
import { INITIAL_CHAT_MESSAGES, SEED_RECEIPTS } from './seedData';
import {
  buildPartialDraftFromReceipt,
  buildReceiptFromExtraction,
  calculateLedgerMetrics,
  DEFAULT_OCTOBER_REVENUE_ENTRIES,
  DEFAULT_SAMPLE_REGISTER_ROWS,
  detectDuplicate,
  formatINR,
  generateConfirmedCSV,
  getNextReceiptId,
} from './utils/ledgerLogic';
import { getLanguageOption, getTranslations } from './i18n';
import { playTactileSound } from './utils/soundEffects';
import { LoginScreen } from './components/LoginScreen';
import { LanguageSelectionScreen } from './components/LanguageSelectionScreen';
import { Sidebar } from './components/Sidebar';
import { ScanScreen } from './components/ScanScreen';
import { UploadScreen } from './components/UploadScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { RecordsScreen, StatusFilter } from './components/RecordsScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { RegisterChecklistModal } from './components/RegisterChecklistModal';
import { SahayakChatbot } from './components/SahayakChatbot';
import { VideoBillSessionModal } from './components/VideoBillSessionModal';
import { QuickAddAndCompleteModal } from './components/QuickAddAndCompleteModal';
import {
  auth,
  onAuthStateChanged,
  saveReceiptToFirestore,
  saveShopSettingsToFirestore,
  seedInitialReceiptsToFirestore,
} from './firebase';

const STORAGE_KEYS = {
  AUTH: 'shopledger_v1_logged_in',
  RECEIPTS: 'shopledger_v1_receipts',
  REVENUES: 'shopledger_v2_revenues',
  CHAT: 'shopledger_v1_chat',
  SECTION: 'shopledger_v1_section',
  SETTINGS: 'shopledger_v1_settings',
  LANGUAGE: 'shopledger_v2_language',
  SPEECH_CODE: 'shopledger_v2_speech_code',
  LANG_CHOSEN: 'shopledger_v2_lang_chosen',
};

const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: 'Sharma Kirana & Provision Store',
  ownerName: 'Rajesh Sharma',
  gstin: '06AABCS1429B1Z5',
  phone: '+91 98765 43210',
  email: 'sharma.store@gmail.com',
  address: 'Shop 14, Main Market, Sohna, Gurugram - 122103',
  currencySymbol: '₹',
  duplicateDetectionEnabled: true,
  flagUnclearDates: true,
  autoCategorizeReceipts: true,
  monthlyBudget: 25000,
};

function getInitialSectionFromPath(): AppSection | null {
  try {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/review')) return 'Review';
    if (path.includes('/records')) return 'Records';
    if (path.includes('/insights')) return 'Insights';
    if (path.includes('/upload')) return 'Upload';
    if (path.includes('/scan')) return 'Scan';
  } catch {
    // ignore
  }
  return null;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('autostart') === '1' ||
        window.location.pathname.toLowerCase().includes('/settings')
      ) {
        return true;
      }
      return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
    } catch {
      return false;
    }
  });

  const [language, setLanguage] = useState<LanguageCode>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang') as LanguageCode | null;
      if (urlLang) return urlLang;
      const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as LanguageCode | null;
      if (saved) return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const [hasSelectedLanguage, setHasSelectedLanguage] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('choose_lang') === '1') return false;
      if (params.get('autostart') === '1') return true;
      return localStorage.getItem(STORAGE_KEYS.LANG_CHOSEN) === 'true';
    } catch {
      return false;
    }
  });

  const [activeSection, setActiveSection] = useState<AppSection>(() => {
    const fromPath = getInitialSectionFromPath();
    if (fromPath) return fromPath;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SECTION) as AppSection | null;
      if (
        saved &&
        ['Scan', 'Upload', 'Review', 'Records', 'Insights', 'Settings'].includes(saved)
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'Scan';
  });

  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return SEED_RECEIPTS;
  });

  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REVENUES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_OCTOBER_REVENUE_ENTRIES;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHAT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_CHAT_MESSAGES;
  });

  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        return { ...DEFAULT_SHOP_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SHOP_SETTINGS;
  });

  const [queuedUploads, setQueuedUploads] = useState<QueuedUpload[]>([]);
  const [activeReviewReceiptId, setActiveReviewReceiptId] = useState<string | null>('R-0107');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<Category | null>(null);
  const [recordsStatusFilter, setRecordsStatusFilter] = useState<StatusFilter | null>(null);

  // Modal & Toast states
  const [isScanSheetOpen, setIsScanSheetOpen] = useState(false);
  const [isVideoSessionOpen, setIsVideoSessionOpen] = useState(false);
  const [registerChecklist, setRegisterChecklist] = useState<{
    entries: RegisterRowEntry[];
    fileName?: string;
  } | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // One-Tap Manual Add & AI Partial Completion Modal state
  const [quickModalState, setQuickModalState] = useState<{
    isOpen: boolean;
    mode: 'manual' | 'ai-partial';
    initialEntryType: 'cost' | 'revenue';
    partialDraft?: PartialExtractionDraft | null;
  }>({
    isOpen: false,
    mode: 'manual',
    initialEntryType: 'cost',
    partialDraft: null,
  });

  const receiptsRef = useRef<Receipt[]>(receipts);
  useEffect(() => {
    receiptsRef.current = receipts;
  }, [receipts]);

  const t = getTranslations(language);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH, String(isLoggedIn));
    } catch {
      // ignore
    }
  }, [isLoggedIn]);

  useEffect(() => {
    try {
      const opt = getLanguageOption(language);
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
      localStorage.setItem(STORAGE_KEYS.SPEECH_CODE, opt.speechCode);
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LANG_CHOSEN, String(hasSelectedLanguage));
    } catch {
      // ignore
    }
  }, [hasSelectedLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SECTION, activeSection);
      const targetPath =
        activeSection === 'Scan' ? '/' : `/${activeSection.toLowerCase()}`;
      if (window.location.pathname !== targetPath) {
        window.history.replaceState(null, '', targetPath + window.location.search);
      }
    } catch {
      // ignore
    }
  }, [activeSection]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
    } catch {
      // ignore
    }
  }, [receipts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REVENUES, JSON.stringify(revenueEntries));
    } catch {
      // ignore
    }
  }, [revenueEntries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(chatMessages));
    } catch {
      // ignore
    }
  }, [chatMessages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(shopSettings));
      saveShopSettingsToFirestore(shopSettings);
    } catch {
      // ignore
    }
  }, [shopSettings]);

  // Listen to Firebase Auth state and sync seed receipts if signed in with Google
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        seedInitialReceiptsToFirestore(receiptsRef.current);
      }
    });
    return () => unsubscribe();
  }, []);

  // All metrics calculated in code from confirmed records + revenue entries
  const metrics = useMemo(
    () => calculateLedgerMetrics(receipts, revenueEntries),
    [receipts, revenueEntries]
  );

  const showToast = (notification: ToastNotification, durationMs = 5500) => {
    setToast(notification);
    setTimeout(() => {
      setToast((prev) => (prev?.id === notification.id ? null : prev));
    }, durationMs);
  };

  const handleLoginSuccess = (personalIdentifier?: string) => {
    if (personalIdentifier) {
      setShopSettings((prev) => ({
        ...prev,
        ...(personalIdentifier.includes('@')
          ? { email: personalIdentifier }
          : { phone: personalIdentifier }),
      }));
    }
    setIsLoggedIn(true);
    setHasSelectedLanguage(false);
  };

  const handleSelectLanguageAtLogin = (option: LanguageOption) => {
    setLanguage(option.code);
    setHasSelectedLanguage(true);
    setActiveSection('Scan');
  };

  const handleChangeLanguageInSidebar = (option: LanguageOption) => {
    setLanguage(option.code);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setHasSelectedLanguage(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      localStorage.removeItem(STORAGE_KEYS.LANG_CHOSEN);
      window.history.replaceState(null, '', '/');
    } catch {
      // ignore
    }
  };

  const handleResetDemoData = () => {
    setReceipts(SEED_RECEIPTS);
    setRevenueEntries(DEFAULT_OCTOBER_REVENUE_ENTRIES);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setQueuedUploads([]);
    setActiveReviewReceiptId('R-0107');
    setSelectedCategoryFilter(null);
    setRecordsStatusFilter(null);
  };

  // Direct Confirmed Save (used by One-Tap Manual Add, AI Partial Completion Popup, and Sahayak Voice/Chat Bill Add)
  const handleSaveConfirmedReceiptDirect = (newReceipt: Receipt) => {
    const confirmedReceipt: Receipt = {
      ...newReceipt,
      status: 'confirmed',
      unclearFields: [],
    };
    setReceipts((prev) => [...prev, confirmedReceipt]);
    saveReceiptToFirestore(confirmedReceipt);
    showToast({
      id: `toast-confirmed-${Date.now()}`,
      message: `Saved ${confirmedReceipt.vendor} (${formatINR(confirmedReceipt.total, false)}) directly to Confirmed Records!`,
      type: 'success',
    });
  };

  const handleSaveRevenueDirect = (entry: RevenueEntry) => {
    setRevenueEntries((prev) => [...prev, entry]);
    showToast({
      id: `toast-rev-${Date.now()}`,
      message: `Added revenue ${entry.label} (${formatINR(entry.amount, false)}) — Profit & Graph updated!`,
      type: 'success',
    });
  };

  const openOneTapManualModal = (initialType: 'cost' | 'revenue' = 'cost') => {
    setQuickModalState({
      isOpen: true,
      mode: 'manual',
      initialEntryType: initialType,
      partialDraft: null,
    });
  };

  const openPartialCompletionModal = (draft: PartialExtractionDraft) => {
    setQuickModalState({
      isOpen: true,
      mode: 'ai-partial',
      initialEntryType: draft.entryType || 'cost',
      partialDraft: draft,
    });
  };

  // Feature 3: Background auto-save to Records (as "Needs review" or "Possible duplicate")
  const handleAddReceiptToReview = (newReceipt: Receipt, isDuplicate?: boolean) => {
    const safeStatus =
      newReceipt.status === 'confirmed'
        ? isDuplicate
          ? 'possible_duplicate'
          : 'needs_review'
        : newReceipt.status;
    const enforcedReceipt: Receipt = { ...newReceipt, status: safeStatus };

    setReceipts((prev) => [...prev, enforcedReceipt]);
    setActiveReviewReceiptId(enforcedReceipt.id);
    saveReceiptToFirestore(enforcedReceipt);

    showToast({
      id: `toast-added-${Date.now()}`,
      message:
        safeStatus === 'possible_duplicate'
          ? t.toastDuplicateAddedTapReview
          : t.toastBillAddedTapReview,
      type: safeStatus === 'possible_duplicate' ? 'warning' : 'success',
      receiptId: enforcedReceipt.id,
      actionLabel: 'Tap to review',
    });
  };

  const handleBackgroundScanBill = async (payload: {
    base64Data: string;
    mimeType: string;
    fileName: string;
    imageUrl?: string;
    sourceTag?: 'Scan' | 'Upload';
    noteText?: string;
  }) => {
    showToast(
      {
        id: `toast-recv-${Date.now()}`,
        message: t.toastBillReceived,
        type: 'info',
      },
      4000
    );

    try {
      const res = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: payload.base64Data,
          mimeType: payload.mimeType,
          fileName: payload.fileName,
          noteText: payload.noteText,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        const errReason =
          data?.error || `Gemini AI request failed with HTTP ${res.status}`;
        showToast(
          {
            id: `toast-scan-err-${Date.now()}`,
            message: `AI Scan Error: ${errReason}`,
            type: 'error',
          },
          6500
        );
        return;
      }
      const { receipt, isDuplicate } = buildReceiptFromExtraction(
        data,
        receiptsRef.current,
        {
          fileName: payload.fileName,
          fileType: payload.mimeType,
          imageUrl: payload.imageUrl,
          sourceTag: payload.sourceTag || 'Scan',
        }
      );

      // If AI couldn't recognize vendor, date, or amount on a torn/unclear bill or note, pop up the Completion Modal!
      const partialDraft = buildPartialDraftFromReceipt(receipt, 'AI Bill / Note Scan');
      if (partialDraft) {
        openPartialCompletionModal(partialDraft);
        return;
      }

      handleAddReceiptToReview(receipt, isDuplicate);
    } catch (err: any) {
      const errReason =
        err?.message || 'Failed to reach Gemini AI receipt extraction endpoint.';
      showToast(
        {
          id: `toast-scan-err-${Date.now()}`,
          message: `AI Scan Error: ${errReason}`,
          type: 'error',
        },
        6500
      );
    }
  };

  // Feature 4: Register page upload (handwritten khata)
  const handleUploadRegisterPage = async (payload: {
    base64Data: string;
    mimeType: string;
    fileName: string;
  }) => {
    showToast(
      {
        id: `toast-reg-read-${Date.now()}`,
        message: 'Reading handwritten register page with Gemini AI…',
        type: 'info',
      },
      2500
    );

    try {
      const res = await fetch('/api/analyze-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (Array.isArray(data.entries) && data.entries.length > 0) {
        const mapped: RegisterRowEntry[] = data.entries.map(
          (row: any, idx: number) => ({
            id: `reg-${Date.now()}-${idx}`,
            selected: true,
            vendorOrPerson: row.vendor_or_person || 'Unclear Name',
            itemOrNote: row.item_or_note || 'Register entry',
            amount:
              typeof row.amount === 'number' && !isNaN(row.amount)
                ? row.amount
                : null,
            date: row.date || '?? Oct 2026',
            category: (row.suggested_category as Category) || 'Supplies & Stock',
            unclearFields: Array.isArray(row.unclear_fields)
              ? row.unclear_fields
              : [],
            needsConfirmation: Boolean(
              row.needs_confirmation ||
                row.amount === null ||
                row.amount === undefined ||
                (row.date && row.date.includes('?'))
            ),
          })
        );
        setRegisterChecklist({ entries: mapped, fileName: payload.fileName });
        return;
      }
    } catch {
      // fallback below
    }

    setRegisterChecklist({
      entries: DEFAULT_SAMPLE_REGISTER_ROWS.map((r) => ({ ...r })),
      fileName: payload.fileName,
    });
  };

  const handleAddRegisterEntriesToRecords = (selectedEntries: RegisterRowEntry[]) => {
    const currentList = [...receiptsRef.current];
    const newReceipts: Receipt[] = [];

    selectedEntries.forEach((entry, idx) => {
      const newId = getNextReceiptId(currentList, idx);
      const numericAmount =
        entry.amount !== null && !isNaN(Number(entry.amount)) && Number(entry.amount) > 0
          ? Number(entry.amount)
          : 0;

      const dupCheck = detectDuplicate(
        {
          id: newId,
          vendor: entry.vendorOrPerson,
          total: numericAmount,
          date: entry.date,
          currency: 'INR',
        },
        [...currentList, ...newReceipts]
      );

      const unclear: string[] = [...entry.unclearFields];
      if (numericAmount <= 0 && !unclear.includes('total')) unclear.push('total');
      if (entry.date.includes('?') && !unclear.includes('date')) unclear.push('date');

      newReceipts.push({
        id: newId,
        vendor: entry.vendorOrPerson || 'Unclear Register Entry',
        date: entry.date || '?? Oct 2026',
        category: entry.category || 'Supplies & Stock',
        items: [{ name: entry.itemOrNote || 'Register item', amount: numericAmount }],
        total: numericAmount,
        status: dupCheck.isDuplicate ? 'possible_duplicate' : 'needs_review',
        unclearFields: unclear,
        fileName: registerChecklist?.fileName || 'khata_register.jpg',
        duplicateOfId: dupCheck.matchedId,
        sourceTag: 'Register',
      });
    });

    setReceipts((prev) => [...prev, ...newReceipts]);
    if (newReceipts.length > 0) {
      setActiveReviewReceiptId(newReceipts[0].id);
    }
    setRegisterChecklist(null);

    showToast({
      id: `toast-reg-saved-${Date.now()}`,
      message: t.toastRegisterAdded(newReceipts.length),
      type: 'success',
      receiptId: newReceipts[0]?.id,
      actionLabel: 'Tap to review',
    });
  };

  const advanceToNextReviewReceipt = (currentId: string, updatedList: Receipt[]) => {
    const remaining = updatedList.filter(
      (r) => r.status !== 'confirmed' && r.id !== currentId
    );
    if (remaining.length > 0) {
      setActiveReviewReceiptId(remaining[0].id);
    } else {
      const stillUnconfirmed = updatedList.filter((r) => r.status !== 'confirmed');
      setActiveReviewReceiptId(stillUnconfirmed[0]?.id || null);
    }
  };

  const handleConfirmReceipt = (updatedReceipt: Receipt) => {
    const exists = receipts.some((r) => r.id === updatedReceipt.id);
    const nextReceipts = exists
      ? receipts.map((r) => (r.id === updatedReceipt.id ? updatedReceipt : r))
      : [...receipts, updatedReceipt];
    setReceipts(nextReceipts);
    saveReceiptToFirestore(updatedReceipt);
    if (updatedReceipt.status === 'confirmed') {
      advanceToNextReviewReceipt(updatedReceipt.id, nextReceipts);
    }
  };

  const handleMarkDuplicate = (receiptId: string) => {
    const nextReceipts = receipts.map((r) => {
      if (r.id === receiptId) {
        const updated = { ...r, status: 'possible_duplicate' as const };
        saveReceiptToFirestore(updated);
        return updated;
      }
      return r;
    });
    setReceipts(nextReceipts);
    advanceToNextReviewReceipt(receiptId, nextReceipts);
  };

  const handleSkipReceipt = (receiptId: string) => {
    const unconfirmed = receipts.filter((r) => r.status !== 'confirmed');
    if (unconfirmed.length <= 1) return;
    const idx = unconfirmed.findIndex((r) => r.id === receiptId);
    const nextItem = unconfirmed[(idx + 1) % unconfirmed.length];
    if (nextItem) {
      setActiveReviewReceiptId(nextItem.id);
    }
  };

  const handleExportCSV = () => {
    const csvContent = generateConfirmedCSV(receipts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'shopledger-confirmed-records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (!hasSelectedLanguage) {
    return (
      <LanguageSelectionScreen
        selectedLanguage={language}
        onSelectLanguage={handleSelectLanguageAtLogin}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0A0A0C] text-[#EDEDEF] selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Background Auto-Save & Error Toast Banner */}
      {toast && (
        <div
          role="status"
          data-testid="app-toast-banner"
          onClick={() => {
            if (toast.receiptId) {
              setActiveReviewReceiptId(toast.receiptId);
              setActiveSection('Review');
              setToast(null);
            }
          }}
          className={`fixed top-14 md:top-5 right-4 md:right-5 z-[100] max-w-[440px] px-4 py-3 rounded-xl shadow-2xl border border-white/10 bg-[#16161A]/95 backdrop-blur-md text-white text-[13px] font-medium flex items-center justify-between gap-3 transition-all ${
            toast.receiptId ? 'cursor-pointer hover:border-emerald-500/40' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full ${
                toast.type === 'error' ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>{toast.message}</span>
          </div>
          {toast.receiptId && (
            <span className="btn-tactile px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold shrink-0">
              Review →
            </span>
          )}
        </div>
      )}

      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => {
          if (sec !== 'Records') {
            setSelectedCategoryFilter(null);
            setRecordsStatusFilter(null);
          }
          setActiveSection(sec);
        }}
        reviewBadgeCount={metrics.reviewBadgeCount}
        shopName={shopSettings.shopName}
        onLogout={handleLogout}
        language={language}
        onChangeLanguage={handleChangeLanguageInSidebar}
        onOpenQuickAdd={() => openOneTapManualModal('cost')}
      />

      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-20">
        {activeSection === 'Scan' && (
          <ScanScreen
            language={language}
            onBackgroundScanBill={handleBackgroundScanBill}
            onUploadRegisterPage={handleUploadRegisterPage}
            onStartVideoSession={() => setIsVideoSessionOpen(true)}
            onOpenQuickAdd={() => openOneTapManualModal('cost')}
          />
        )}

        {activeSection === 'Upload' && (
          <UploadScreen
            queuedUploads={queuedUploads}
            setQueuedUploads={setQueuedUploads}
            receipts={receipts}
            onAddReceiptToReview={handleAddReceiptToReview}
            onGoToReview={(receiptId) => {
              if (receiptId) setActiveReviewReceiptId(receiptId);
              setActiveSection('Review');
            }}
            onUploadRegisterPage={handleUploadRegisterPage}
            onNotifyBillReceived={() =>
              showToast({
                id: `toast-up-recv-${Date.now()}`,
                message: t.toastBillReceived,
                type: 'info',
              })
            }
            onOpenQuickAdd={() => openOneTapManualModal('cost')}
            onOpenPartialCompletionModal={openPartialCompletionModal}
            language={language}
          />
        )}

        {activeSection === 'Review' && (
          <ReviewScreen
            receipts={receipts}
            metrics={metrics}
            activeReceiptId={activeReviewReceiptId}
            onSelectReceiptId={setActiveReviewReceiptId}
            onConfirmReceipt={handleConfirmReceipt}
            onMarkDuplicate={handleMarkDuplicate}
            onSkipReceipt={handleSkipReceipt}
            onGoToRecords={() => setActiveSection('Records')}
            language={language}
          />
        )}

        {activeSection === 'Records' && (
          <RecordsScreen
            receipts={receipts}
            metrics={metrics}
            selectedCategoryFilter={selectedCategoryFilter}
            onClearCategoryFilter={() => setSelectedCategoryFilter(null)}
            onExportCSV={handleExportCSV}
            onSelectReceiptForReview={(id) => {
              setActiveReviewReceiptId(id);
              setActiveSection('Review');
            }}
            onOpenQuickAdd={() => openOneTapManualModal('cost')}
            language={language}
            externalStatusFilter={recordsStatusFilter}
          />
        )}

        {activeSection === 'Insights' && (
          <InsightsScreen
            receipts={receipts}
            metrics={metrics}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            onSelectCategoryForRecords={(category) => {
              setSelectedCategoryFilter(category);
              setActiveSection('Records');
            }}
            onExportCSV={handleExportCSV}
            onOpenLogRevenueModal={() => openOneTapManualModal('revenue')}
            language={language}
          />
        )}

        {activeSection === 'Settings' && (
          <SettingsScreen
            settings={shopSettings}
            onUpdateSettings={setShopSettings}
            metrics={metrics}
            totalReceiptsCount={receipts.length}
            onExportCSV={handleExportCSV}
            onResetDemoData={handleResetDemoData}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Floating round Scan button fixed at bottom-RIGHT */}
      <button
        type="button"
        onClick={() => {
          playTactileSound('pop');
          setIsScanSheetOpen(true);
        }}
        aria-label="Quick scan bill"
        title={t.scanBillBtn}
        className="btn-tactile fixed bottom-16 md:bottom-5 right-4 md:right-5 z-40 w-13 h-13 md:w-14 md:h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 shadow-[0_4px_24px_rgba(16,185,129,0.35)] flex items-center justify-center cursor-pointer border border-emerald-300/40"
      >
        <Camera className="w-6 h-6 stroke-[2.2]" />
      </button>

      {/* Popup Scan Sheet when floating right button is tapped */}
      {isScanSheetOpen && (
        <ScanScreen
          language={language}
          onBackgroundScanBill={handleBackgroundScanBill}
          onUploadRegisterPage={handleUploadRegisterPage}
          onStartVideoSession={() => setIsVideoSessionOpen(true)}
          onOpenQuickAdd={() => {
            setIsScanSheetOpen(false);
            openOneTapManualModal('cost');
          }}
          isPopupSheet={true}
          onCloseSheet={() => setIsScanSheetOpen(false)}
        />
      )}

      {/* One-Tap Manual Add & AI Unrecognized Field Completion Modal */}
      <QuickAddAndCompleteModal
        isOpen={quickModalState.isOpen}
        mode={quickModalState.mode}
        initialEntryType={quickModalState.initialEntryType}
        partialDraft={quickModalState.partialDraft}
        existingReceipts={receipts}
        onClose={() =>
          setQuickModalState((prev) => ({ ...prev, isOpen: false, partialDraft: null }))
        }
        onSaveReceipt={handleSaveConfirmedReceiptDirect}
        onSaveRevenue={handleSaveRevenueDirect}
      />

      {/* Handwritten Register Checklist Modal */}
      {registerChecklist && (
        <RegisterChecklistModal
          entries={registerChecklist.entries}
          fileName={registerChecklist.fileName}
          language={language}
          onClose={() => setRegisterChecklist(null)}
          onAddAllToRecords={handleAddRegisterEntriesToRecords}
        />
      )}

      {/* Floating Sahayak Chatbot fixed at bottom-LEFT of every screen */}
      <SahayakChatbot
        language={language}
        receipts={receipts}
        onNavigate={(sec) => {
          setRecordsStatusFilter(null);
          setActiveSection(sec);
        }}
        onOpenScanSheet={() => setIsScanSheetOpen(true)}
        onOpenReceiptInReview={(id) => {
          setActiveReviewReceiptId(id);
          setActiveSection('Review');
        }}
        onShowDuplicatesInRecords={() => {
          setRecordsStatusFilter('possible_duplicate');
          setActiveSection('Records');
        }}
        onAddConfirmedReceipt={handleSaveConfirmedReceiptDirect}
        onOpenPartialCompletionModal={openPartialCompletionModal}
      />

      {/* Live Video Bill Session Modal */}
      {isVideoSessionOpen && (
        <VideoBillSessionModal
          language={language}
          existingReceipts={receipts}
          onCatchReceipt={(newReceipt) => {
            setReceipts((prev) => [
              ...prev,
              { ...newReceipt, status: 'needs_review', sourceTag: 'Video' },
            ]);
          }}
          onErrorToast={(reason) => {
            showToast(
              {
                id: `toast-video-err-${Date.now()}`,
                message: `AI Scan Error: ${reason}`,
                type: 'error',
              },
              6500
            );
          }}
          onClose={() => setIsVideoSessionOpen(false)}
          onReviewThemNow={(firstId) => {
            setIsVideoSessionOpen(false);
            if (firstId) setActiveReviewReceiptId(firstId);
            setActiveSection('Review');
          }}
        />
      )}
    </div>
  );
}
