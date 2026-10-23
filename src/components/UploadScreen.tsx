import React, { useRef, useState } from 'react';
import { BookOpen, PlusCircle, PenTool } from 'lucide-react';
import {
  Category,
  LanguageCode,
  PartialExtractionDraft,
  QueuedUpload,
  Receipt,
} from '../types';
import { getTranslations } from '../i18n';
import {
  buildPartialDraftFromReceipt,
  detectDuplicate,
  formatINR,
  isoToDisplayDate,
  validateReceiptFinancials,
} from '../utils/ledgerLogic';
import { playTactileClick, playTactilePop } from '../utils/soundEffects';

interface UploadScreenProps {
  queuedUploads: QueuedUpload[];
  setQueuedUploads: React.Dispatch<React.SetStateAction<QueuedUpload[]>>;
  receipts: Receipt[];
  onAddReceiptToReview: (newReceipt: Receipt, isDuplicate?: boolean) => void;
  onGoToReview: (receiptId?: string) => void;
  onUploadRegisterPage?: (payload: {
    base64Data: string;
    mimeType: string;
    fileName: string;
  }) => void;
  onNotifyBillReceived?: () => void;
  onOpenQuickAdd?: () => void;
  onOpenPartialCompletionModal?: (draft: PartialExtractionDraft) => void;
  language?: LanguageCode;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  queuedUploads,
  setQueuedUploads,
  receipts,
  onAddReceiptToReview,
  onGoToReview,
  onUploadRegisterPage,
  onNotifyBillReceived,
  onOpenQuickAdd,
  onOpenPartialCompletionModal,
  language = 'en',
}) => {
  const t = getTranslations(language);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const registerInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [handwrittenSlipInput, setHandwrittenSlipInput] = useState('');

  const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
  const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
  ];

  const validateAndQueueFile = (file: File) => {
    setGlobalError(null);

    const mime = (file.type || '').toLowerCase();
    const isExtensionAllowed = /\.(jpe?g|png|webp|pdf|txt)$/i.test(file.name);

    if (!ALLOWED_MIME_TYPES.includes(mime) && !isExtensionAllowed) {
      setGlobalError(
        `Unsupported format for "${file.name}". ShopLedger accepts JPG, PNG, PDF, and Handwritten Note files.`
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const mbSize = (file.size / (1024 * 1024)).toFixed(1);
      setGlobalError(
        `File "${file.name}" is too large (${mbSize} MB). Maximum supported size is 15 MB.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setGlobalError(
        `Failed to read file "${file.name}". Please check file permissions and try again.`
      );
    };

    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : '';

      const isImage =
        file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

      const newItem: QueuedUpload = {
        id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fileName: file.name,
        fileType: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
        fileSize: file.size,
        imageUrl: isImage ? resultStr : undefined,
        base64Data,
        status: 'queued',
      };

      setQueuedUploads((prev) => [...prev, newItem]);
      processReceiptFile(newItem);
    };

    reader.readAsDataURL(file);
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => validateAndQueueFile(file));
  };

  const removeUploadItem = (id: string) => {
    setQueuedUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const loadPresetReceipt = async (
    type: 'fabric' | 'tailoring' | 'packaging' | 'asset_img' | 'handwritten' | 'torn_partial'
  ) => {
    setGlobalError(null);
    let fileName = '';
    let mimeType = 'image/jpeg';
    let base64Data = 'U2FtcGxlIERvY3VtZW50IFByZXNldA==';
    let imageUrl: string | undefined;

    if (type === 'asset_img') {
      fileName = 'whatsapp_cloth_bill.jpg';
      const svgReceipt = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="340" viewBox="0 0 480 340">
        <rect x="16" y="12" width="448" height="316" rx="12" fill="#FFFFFF" stroke="#E9E1CF" stroke-width="2"/>
        <rect x="16" y="12" width="448" height="8" rx="4" fill="#0D9F6E"/>
        <text x="240" y="50" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#112A22">SHARMA CLOTH &amp; TEXTILE HOUSE</text>
        <text x="240" y="72" font-family="Inter, Arial, sans-serif" font-size="12" text-anchor="middle" fill="#4A6B5F">Main Bazar, Sohna Road · GSTIN 06AABCS1429B1Z5</text>
        <line x1="40" y1="90" x2="440" y2="90" stroke="#E9E1CF" stroke-width="1.5"/>
        <text x="48" y="114" font-family="Inter, Arial, sans-serif" font-size="12.5" font-weight="bold" fill="#112A22">Bill No: SC-882</text>
        <text x="432" y="114" font-family="Inter, Arial, sans-serif" font-size="12.5" font-weight="bold" text-anchor="end" fill="#112A22">Date: 20/10/2026</text>
        <text x="48" y="156" font-family="Inter, Arial, sans-serif" font-size="13.5" fill="#112A22">Cotton Poplin Rolls (30m)</text>
        <text x="432" y="156" font-family="Inter, Arial, sans-serif" font-size="13.5" font-weight="bold" text-anchor="end" fill="#112A22">₹1,650.00</text>
        <text x="48" y="188" font-family="Inter, Arial, sans-serif" font-size="13.5" fill="#112A22">Lining Cloth &amp; Thread</text>
        <text x="432" y="188" font-family="Inter, Arial, sans-serif" font-size="13.5" font-weight="bold" text-anchor="end" fill="#112A22">₹800.00</text>
        <rect x="40" y="252" width="400" height="44" rx="8" fill="#DDF7EE"/>
        <text x="56" y="279" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="bold" fill="#112A22">TOTAL AMOUNT</text>
        <text x="424" y="279" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="end" fill="#0D9F6E">₹2,450.00</text>
      </svg>`;
      imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgReceipt)}`;
      base64Data = btoa(unescape(encodeURIComponent(svgReceipt)));
    } else if (type === 'handwritten') {
      fileName = 'handwritten_note_parchi.jpg';
      mimeType = 'image/jpeg';
    } else if (type === 'torn_partial') {
      fileName = 'torn_partial_missing_price.jpg';
      mimeType = 'image/jpeg';
    } else if (type === 'fabric') {
      fileName = 'surat_textiles_fabric_invoice.pdf';
      mimeType = 'application/pdf';
    } else if (type === 'tailoring') {
      fileName = 'delhi_zippers_and_threads.jpg';
      mimeType = 'image/jpeg';
    } else {
      fileName = 'shree_packaging_boxes.jpg';
      mimeType = 'image/jpeg';
    }

    const sampleItem: QueuedUpload = {
      id: `up-preset-${Date.now()}`,
      fileName,
      fileType: mimeType,
      fileSize: 124000,
      imageUrl,
      base64Data,
      status: 'queued',
    };
    setQueuedUploads((prev) => [...prev, sampleItem]);
  };

  const handleQueueHandwrittenNoteText = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = handwrittenSlipInput.trim();
    if (!raw) return;
    const item: QueuedUpload = {
      id: `up-note-${Date.now()}`,
      fileName: `handwritten_note_${Date.now()}.txt`,
      fileType: 'text/plain',
      fileSize: raw.length,
      base64Data: btoa(unescape(encodeURIComponent(raw))),
      status: 'queued',
    };
    setHandwrittenSlipInput('');
    setQueuedUploads((prev) => [...prev, item]);
    processReceiptFile(item, raw);
  };

  const processReceiptFile = async (uploadItem: QueuedUpload, directNoteText?: string) => {
    setGlobalError(null);
    if (onNotifyBillReceived) {
      onNotifyBillReceived();
    }

    setQueuedUploads((prev) =>
      prev.map((u) =>
        u.id === uploadItem.id ? { ...u, status: 'reading', errorMessage: undefined } : u
      )
    );

    try {
      const res = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: uploadItem.base64Data,
          mimeType: uploadItem.fileType,
          fileName: uploadItem.fileName,
          simulateFailure: isSimulatingFailure,
          noteText: directNoteText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      if (data.is_receipt === false) {
        throw new Error(
          data.not_receipt_reason ||
            'The uploaded document does not appear to be a receipt or handwritten note.'
        );
      }

      const validCategories: Category[] = [
        'Supplies & Stock',
        'Packaging',
        'Transport',
        'Utilities',
        'Marketing',
        'Office',
      ];

      let assignedCategory: Category = 'Supplies & Stock';
      if (data.suggested_category && validCategories.includes(data.suggested_category as Category)) {
        assignedCategory = data.suggested_category as Category;
      } else {
        const textBlob = `${data.vendor_name || ''} ${(data.items || [])
          .map((i: any) => i.name)
          .join(' ')}`.toLowerCase();
        if (textBlob.includes('pack') || textBlob.includes('bag') || textBlob.includes('box')) {
          assignedCategory = 'Packaging';
        } else if (
          textBlob.includes('courier') ||
          textBlob.includes('transport') ||
          textBlob.includes('delivery')
        ) {
          assignedCategory = 'Transport';
        } else if (
          textBlob.includes('electric') ||
          textBlob.includes('power') ||
          textBlob.includes('water')
        ) {
          assignedCategory = 'Utilities';
        } else if (textBlob.includes('print') || textBlob.includes('banner')) {
          assignedCategory = 'Marketing';
        } else if (textBlob.includes('stationer') || textBlob.includes('office')) {
          assignedCategory = 'Office';
        }
      }

      const rawItems = Array.isArray(data.items) ? data.items : [];
      const formattedItems = rawItems.map((item: any) => ({
        name: String(item.name || 'Item'),
        amount:
          Number(
            item.line_total ||
              item.amount ||
              (item.quantity && item.unit_price ? item.quantity * item.unit_price : 0)
          ) || 0,
        quantity: item.quantity !== undefined ? Number(item.quantity) : null,
        unitPrice: item.unit_price !== undefined ? Number(item.unit_price) : null,
        lineTotal: item.line_total !== undefined ? Number(item.line_total) : null,
      }));

      const itemsSum = formattedItems.reduce(
        (acc: number, it: any) => acc + (it.amount || 0),
        0
      );
      const computedTotal =
        typeof data.total === 'number' && !isNaN(data.total) && data.total > 0
          ? data.total
          : itemsSum > 0
          ? itemsSum
          : 0;

      const rawDate = data.receipt_date || '23 Oct 2026';
      const formattedDate = isoToDisplayDate(rawDate);

      const existingNumbers = receipts.map((r) => {
        const m = r.id.match(/R-(\d+)/);
        return m ? parseInt(m[1], 10) : 100;
      });
      const nextNumber = Math.max(108, ...existingNumbers) + 1;
      const newId = `R-${String(nextNumber).padStart(4, '0')}`;

      const dupCheck = detectDuplicate(
        {
          id: newId,
          vendor: data.vendor_name || 'Unknown Vendor',
          total: computedTotal,
          date: formattedDate,
          currency: data.currency || 'INR',
          items: formattedItems,
        },
        receipts
      );

      const validation = validateReceiptFinancials({
        vendor: data.vendor_name || '',
        date: formattedDate,
        total: computedTotal,
        subtotal: data.subtotal,
        tax: data.tax,
        items: formattedItems,
        currency: data.currency || 'INR',
      });

      const unclearFields: string[] = Array.isArray(data.unclear_fields)
        ? [...data.unclear_fields]
        : [];
      if (!data.vendor_name && !unclearFields.includes('vendor_name')) {
        unclearFields.push('vendor_name');
      }
      if (
        (!data.receipt_date || data.receipt_date.includes('?')) &&
        !unclearFields.includes('date')
      ) {
        unclearFields.push('date');
      }
      if (computedTotal <= 0 && !unclearFields.includes('total')) {
        unclearFields.push('total');
      }

      const newReceipt: Receipt = {
        id: newId,
        vendor: data.vendor_name || 'Unidentified Merchant',
        date: formattedDate,
        category: assignedCategory,
        items:
          formattedItems.length > 0
            ? formattedItems
            : [{ name: 'Purchase item', amount: computedTotal }],
        total: computedTotal,
        subtotal: data.subtotal ?? null,
        tax: data.tax ?? null,
        currency: data.currency || 'INR',
        confidenceScore:
          typeof data.confidence_score === 'number' ? data.confidence_score : 0.85,
        status: dupCheck.isDuplicate ? 'possible_duplicate' : 'needs_review',
        unclearFields,
        fileName: uploadItem.fileName,
        fileType: uploadItem.fileType,
        address: data.address || undefined,
        billNo: data.bill_number || undefined,
        gstin: data.gstin || undefined,
        duplicateOfId: dupCheck.matchedId,
        imageUrl: uploadItem.imageUrl,
        arithmeticMismatch: validation.status === 'mismatch',
        arithmeticMessage: validation.message,
        sourceTag: 'Upload',
      };

      setQueuedUploads((prev) => prev.filter((u) => u.id !== uploadItem.id));

      // Check if AI couldn't recognize any field (vendor, date, or amount) -> open Completion Popup
      const partialDraft = buildPartialDraftFromReceipt(newReceipt, 'AI Document Upload');
      if (partialDraft && onOpenPartialCompletionModal) {
        onOpenPartialCompletionModal(partialDraft);
        return;
      }

      onAddReceiptToReview(newReceipt, dupCheck.isDuplicate);
    } catch (err: any) {
      console.error('Scan processing error:', err);
      setQueuedUploads((prev) =>
        prev.map((u) =>
          u.id === uploadItem.id
            ? {
                ...u,
                status: 'error',
                errorMessage:
                  err?.message || 'Processing failed. Please check the document and retry.',
              }
            : u
        )
      );
    }
  };

  const unreviewedReceipts = receipts.filter((r) => r.status !== 'confirmed');

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0A0A0C] text-zinc-100">
      {/* Top Header */}
      <header className="bg-[#0E0E12] border-b border-white/[0.07] px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight leading-tight">
            {t.uploadHeading}
          </h1>
          <p className="text-[12px] sm:text-[12.5px] text-zinc-400 mt-0.5">
            {t.uploadSubheading}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenQuickAdd && (
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                onOpenQuickAdd();
              }}
              data-testid="upload-one-tap-manual-btn"
              className="btn-tactile px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-[12.5px] shadow-[0_2px_8px_rgba(16,185,129,0.2)] flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ One-Tap Add</span>
            </button>
          )}
          {onUploadRegisterPage && (
            <>
              <input
                ref={registerInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  playTactilePop();
                  const reader = new FileReader();
                  reader.onload = () => {
                    const resStr = typeof reader.result === 'string' ? reader.result : '';
                    const b64 = resStr.includes(',') ? resStr.split(',')[1] : '';
                    onUploadRegisterPage({
                      base64Data: b64 || 'U2FtcGxlUmVnaXN0ZXI=',
                      mimeType: f.type || 'image/jpeg',
                      fileName: f.name,
                    });
                  };
                  reader.readAsDataURL(f);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  onUploadRegisterPage({
                    base64Data: 'U2FtcGxlS2hhdGFSZWdpc3RlclBhZ2U=',
                    mimeType: 'image/jpeg',
                    fileName: 'october_khata_register_page.jpg',
                  });
                }}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-medium text-[12.5px] flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t.uploadRegisterBtn}</span>
              </button>
            </>
          )}
          {unreviewedReceipts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                onGoToReview();
              }}
              className="btn-tactile px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-medium text-[12px] flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Review pending ({unreviewedReceipts.length})</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 sm:p-8 max-w-[1040px] w-full space-y-5 mx-auto">
        {/* Handwritten Note Fast Converter Bar */}
        <form
          onSubmit={(e) => {
            playTactileClick();
            handleQueueHandwrittenNoteText(e);
          }}
          className="card-obsidian rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <div className="flex items-center gap-2 text-[12px] font-mono text-zinc-300 shrink-0">
            <PenTool className="w-4 h-4 text-emerald-400" />
            <span>Note Slip (Name, Price &amp; Date):</span>
          </div>
          <input
            type="text"
            data-testid="upload-handwritten-note-input"
            value={handwrittenSlipInput}
            onChange={(e) => setHandwrittenSlipInput(e.target.value)}
            placeholder='Just wrote on a note? Type e.g. "Sharma Kirana 1250 23 Oct 2026"'
            className="flex-1 px-3 py-1.5 rounded-md border border-white/[0.08] bg-[#0E0E12] text-[12.5px] text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none"
          />
          <button
            type="submit"
            data-testid="upload-handwritten-note-btn"
            className="btn-tactile px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-[12px] cursor-pointer shrink-0"
          >
            Extract &amp; Save Note
          </button>
        </form>

        {/* Global Error Banner */}
        {globalError && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-[12.5px] text-rose-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-[15px] leading-none">⚠️</span>
              <div>
                <p className="font-medium text-white">Upload notice</p>
                <p className="mt-0.5 text-rose-300">{globalError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              className="text-rose-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Drag-and-drop Card */}
        <div className="card-obsidian rounded-xl p-5 sm:p-7">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              playTactilePop();
              handleFilesSelected(e.dataTransfer.files);
            }}
            onClick={() => {
              playTactileClick();
              fileInputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
            aria-label="Drop receipt photos, handwritten notes, or PDFs, or click to browse"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-xl py-10 px-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/[0.08]'
                : 'border-white/[0.09] bg-[#0E0E12] hover:border-white/20 hover:bg-[#121217]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-emerald-400">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-[14.5px] font-medium text-white">
              Drop receipt photos, handwritten notes, or PDFs, or click to browse
            </p>
            <p className="text-[12px] text-zinc-400 mt-1">
              Supports printed bills AND rough handwritten slips with just Name, Price &amp; Date
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
              <span>✦ Instant Gemini OCR &amp; Financial Ledger Extraction</span>
            </div>
          </div>

          {/* Preset bills testing strip */}
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <span className="text-[11.5px] font-mono uppercase tracking-wider text-zinc-400">
                Sample Retail Bills &amp; Notes:
              </span>
              <label className="flex items-center gap-2 text-[11.5px] text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSimulatingFailure}
                  onChange={(e) => {
                    playTactilePop();
                    setIsSimulatingFailure(e.target.checked);
                  }}
                  className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span className={isSimulatingFailure ? 'text-rose-400 font-medium' : ''}>
                  Simulate API failure test
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  loadPresetReceipt('handwritten');
                }}
                className="btn-tactile text-left px-3.5 py-2.5 rounded-lg border border-white/[0.08] hover:border-emerald-500/40 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group"
              >
                <div className="font-medium text-[12.5px] text-zinc-200 group-hover:text-emerald-400">
                  Handwritten Note Slip
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                  Raju Kirana · ₹850 · 23 Oct
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  loadPresetReceipt('torn_partial');
                }}
                className="btn-tactile text-left px-3.5 py-2.5 rounded-lg border border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 transition-all cursor-pointer group"
              >
                <div className="font-medium text-[12.5px] text-amber-300">
                  Torn Bill (Missing Price)
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Opens AI completion modal
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  loadPresetReceipt('asset_img');
                }}
                className="btn-tactile text-left px-3.5 py-2.5 rounded-lg border border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group"
              >
                <div className="font-medium text-[12.5px] text-zinc-200 group-hover:text-white">
                  WhatsApp Bill Photo
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                  Sharma Cloth House · ₹2,450
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Queued Files List */}
        {queuedUploads.length > 0 && (
          <div className="card-obsidian rounded-xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-[14.5px] font-medium text-white">
                Uploaded documents ({queuedUploads.length})
              </h2>
              <span className="text-[11.5px] font-mono text-zinc-500">
                Extracts vendor, items, and totals into Records
              </span>
            </div>

            <div className="divide-y divide-white/[0.05]">
              {queuedUploads.map((item) => {
                const isReading = item.status === 'reading';
                const isError = item.status === 'error';
                const isPdf =
                  item.fileType === 'application/pdf' ||
                  item.fileName.toLowerCase().endsWith('.pdf');

                return (
                  <div key={item.id} className="py-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg border border-white/[0.08] bg-[#0E0E12] overflow-hidden flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : isPdf ? (
                            <span className="text-[9px] font-mono font-bold text-rose-400">
                              PDF
                            </span>
                          ) : (
                            <PenTool className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-zinc-200 truncate max-w-[240px] sm:max-w-[380px]">
                            {item.fileName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 mt-0.5">
                            <span>{isPdf ? 'PDF' : 'Bill/Note'}</span>
                            {item.fileSize && (
                              <>
                                <span>•</span>
                                <span>{Math.max(1, Math.round(item.fileSize / 1024))} KB</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
                        {item.status === 'queued' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Ready
                          </span>
                        )}

                        {isReading && (
                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[11px] font-mono border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Scanning…</span>
                          </div>
                        )}

                        {isError && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            Failed
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={isReading}
                          onClick={() => {
                            playTactileClick();
                            processReceiptFile(item);
                          }}
                          className={`btn-tactile px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                            isReading
                              ? 'bg-white/[0.04] text-zinc-500 cursor-not-allowed'
                              : isError
                              ? 'bg-rose-500 hover:bg-rose-400 text-white'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium'
                          }`}
                        >
                          {isReading
                            ? 'Scanning…'
                            : isError
                            ? 'Retry'
                            : 'Scan'}
                        </button>

                        {!isReading && (
                          <button
                            type="button"
                            onClick={() => {
                              playTactilePop();
                              removeUploadItem(item.id);
                            }}
                            className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-white/[0.05] transition-colors cursor-pointer"
                            title="Remove from queue"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {isReading && (
                      <div className="w-full bg-white/[0.05] h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full animate-pulse w-3/4" />
                      </div>
                    )}

                    {isError && item.errorMessage && (
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-md p-2.5 text-[11.5px] text-rose-300 flex items-center justify-between">
                        <span>{item.errorMessage}</span>
                        <button
                          type="button"
                          onClick={() => {
                            playTactileClick();
                            processReceiptFile(item);
                          }}
                          className="font-medium underline ml-2 cursor-pointer hover:text-white"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Queue Summary of Unreviewed Receipts */}
        {unreviewedReceipts.length > 0 && (
          <div className="card-obsidian rounded-xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-[14.5px] font-medium text-white">
                  Receipts waiting in Review queue ({unreviewedReceipts.length})
                </h2>
                <p className="text-[11.5px] text-zinc-400 mt-0.5">
                  Unconfirmed receipts are held out of totals until verified
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  onGoToReview();
                }}
                className="btn-tactile px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[12px] font-medium cursor-pointer"
              >
                Review All →
              </button>
            </div>

            <div className="divide-y divide-white/[0.05]">
              {unreviewedReceipts.map((r) => (
                <div
                  key={r.id}
                  className="py-2.5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[12px] font-mono text-emerald-400 tabular-nums">
                      {r.id}
                    </span>
                    <span className="text-[13px] font-normal text-zinc-200">{r.vendor}</span>
                    <span className="text-[12px] font-mono text-zinc-500">{r.date}</span>
                    {r.status === 'possible_duplicate' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>Possible duplicate</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>Needs review</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-mono font-medium text-white tabular-nums">
                      {formatINR(r.total)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playTactileClick();
                        onGoToReview(r.id);
                      }}
                      className="text-[12px] font-medium text-emerald-400 hover:underline cursor-pointer"
                    >
                      Review now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
