import React, { useState, useEffect, useMemo } from 'react';
import { CATEGORIES, Category, LanguageCode, Receipt, ReceiptItem } from '../types';
import { getTranslations } from '../i18n';
import { DUPLICATE_REFERENCE_RECEIPT } from '../seedData';
import {
  dateToSlashFormat,
  slashFormatToDate,
  formatCurrency,
  formatINR,
  formatIndianNumber,
  LedgerMetrics,
  validateReceiptFinancials,
  detectDuplicate,
} from '../utils/ledgerLogic';
import { playTactileClick, playTactileSuccess, playTactilePop } from '../utils/soundEffects';

interface ReviewScreenProps {
  receipts: Receipt[];
  metrics: LedgerMetrics;
  activeReceiptId: string | null;
  onSelectReceiptId: (id: string) => void;
  onConfirmReceipt: (updatedReceipt: Receipt) => void;
  onMarkDuplicate: (receiptId: string) => void;
  onSkipReceipt: (receiptId: string) => void;
  onGoToRecords: () => void;
  language?: LanguageCode;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  receipts,
  metrics,
  activeReceiptId,
  onSelectReceiptId,
  onConfirmReceipt,
  onMarkDuplicate,
  onSkipReceipt,
  onGoToRecords,
  language = 'en',
}) => {
  const t = getTranslations(language);
  // Queue of receipts needing attention (possible_duplicate or needs_review)
  const reviewQueue = receipts.filter((r) => r.status !== 'confirmed');

  const currentReceipt =
    reviewQueue.find((r) => r.id === activeReceiptId) ||
    reviewQueue[0] ||
    receipts.find((r) => r.id === activeReceiptId) ||
    receipts.find((r) => r.id === 'R-0107') ||
    receipts[0];

  // Editable form state initialized from current receipt
  const [vendor, setVendor] = useState(currentReceipt?.vendor || '');
  const [dateInput, setDateInput] = useState(dateToSlashFormat(currentReceipt?.date || ''));
  const [category, setCategory] = useState<Category>(currentReceipt?.category || 'Supplies & Stock');
  const [currency, setCurrency] = useState<string>(currentReceipt?.currency || 'INR');
  const [subtotalInput, setSubtotalInput] = useState<string>(
    currentReceipt?.subtotal !== undefined && currentReceipt?.subtotal !== null
      ? String(currentReceipt.subtotal)
      : ''
  );
  const [taxInput, setTaxInput] = useState<string>(
    currentReceipt?.tax !== undefined && currentReceipt?.tax !== null
      ? String(currentReceipt.tax)
      : ''
  );
  const [totalInput, setTotalInput] = useState<string>(String(currentReceipt?.total || '0'));
  const [items, setItems] = useState<ReceiptItem[]>(
    currentReceipt?.items ? currentReceipt.items.map((it) => ({ ...it })) : []
  );
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);
  const [isRetryingExtraction, setIsRetryingExtraction] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state whenever active receipt changes
  useEffect(() => {
    if (currentReceipt) {
      setVendor(currentReceipt.vendor);
      setDateInput(dateToSlashFormat(currentReceipt.date));
      setCategory(currentReceipt.category);
      setCurrency(currentReceipt.currency || 'INR');
      setSubtotalInput(
        currentReceipt.subtotal !== undefined && currentReceipt.subtotal !== null
          ? String(currentReceipt.subtotal)
          : ''
      );
      setTaxInput(
        currentReceipt.tax !== undefined && currentReceipt.tax !== null
          ? String(currentReceipt.tax)
          : ''
      );
      setTotalInput(String(currentReceipt.total));
      setItems(currentReceipt.items.map((item) => ({ ...item })));
      setOverrideAcknowledged(Boolean(currentReceipt.overrideConfirmed));
    }
  }, [currentReceipt?.id]);

  // Derived numeric calculations
  const parsedSubtotal = subtotalInput.trim() !== '' ? parseFloat(subtotalInput) : null;
  const parsedTax = taxInput.trim() !== '' ? parseFloat(taxInput) : null;
  const parsedTotal = parseFloat(totalInput) || 0;
  const lineItemsSum = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Deterministic financial validation recalculating on every change
  const financialValidation = useMemo(() => {
    return validateReceiptFinancials({
      vendor,
      date: slashFormatToDate(dateInput),
      total: parsedTotal,
      subtotal: parsedSubtotal,
      tax: parsedTax,
      items,
      currency,
    });
  }, [vendor, dateInput, parsedTotal, parsedSubtotal, parsedTax, items, currency]);

  // Dynamic duplicate detection against other stored receipts
  const duplicateCheck = useMemo(() => {
    if (!currentReceipt) return { isDuplicate: false };
    return detectDuplicate(
      {
        id: currentReceipt.id,
        vendor,
        total: parsedTotal,
        date: slashFormatToDate(dateInput),
        currency,
        items,
        duplicateOfId: currentReceipt.duplicateOfId,
      },
      receipts
    );
  }, [currentReceipt?.id, vendor, parsedTotal, dateInput, currency, items, receipts]);

  // Unclear fields checks
  const isVendorUnclear =
    (currentReceipt?.unclearFields || []).includes('vendor') ||
    (currentReceipt?.unclearFields || []).includes('vendor_name') ||
    vendor.trim() === '';

  const isDateUnclear =
    (currentReceipt?.unclearFields || []).includes('date') ||
    (currentReceipt?.unclearFields || []).includes('receipt_date') ||
    dateInput.includes('?') ||
    dateInput.trim() === '';

  const isTotalUnclear =
    (currentReceipt?.unclearFields || []).includes('total') ||
    parsedTotal <= 0;

  // Line item handlers
  const handleItemAmountChange = (index: number, rawVal: string) => {
    const cleaned = rawVal.replace(/[^0-9.]/g, '');
    const parsed = cleaned === '' ? 0 : parseFloat(cleaned);
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, amount: isNaN(parsed) ? 0 : parsed } : it))
    );
  };

  const handleItemNameChange = (index: number, newName: string) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, name: newName } : it))
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { name: 'New Item', amount: 0, quantity: 1, unitPrice: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setToastMessage('Receipt must have at least one line item.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Sync Total to Line Items Sum helper button
  const handleSyncTotalWithItems = () => {
    const newTotal = parsedTax ? lineItemsSum + parsedTax : lineItemsSum;
    setTotalInput(newTotal.toFixed(2));
    if (parsedSubtotal !== null) {
      setSubtotalInput(lineItemsSum.toFixed(2));
    }
    setToastMessage(`Total synced to line items sum (${formatCurrency(newTotal, currency)})`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Action: Retry Extraction
  const handleRetryExtraction = async () => {
    if (!currentReceipt?.imageUrl) {
      setToastMessage('Original image data is not stored in this browser session to re-read.');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    setIsRetryingExtraction(true);
    try {
      const base64Data = currentReceipt.imageUrl.split(',')[1] || '';
      const res = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: currentReceipt.fileType || 'image/jpeg',
          fileName: currentReceipt.fileName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Retry failed');
      }

      const data = await res.json();
      if (data.vendor_name) setVendor(data.vendor_name);
      if (data.receipt_date) setDateInput(dateToSlashFormat(data.receipt_date));
      if (data.currency) setCurrency(data.currency);
      if (data.subtotal) setSubtotalInput(String(data.subtotal));
      if (data.tax) setTaxInput(String(data.tax));
      if (data.total) setTotalInput(String(data.total));
      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems(
          data.items.map((i: any) => ({
            name: i.name,
            amount: Number(i.line_total || i.amount) || 0,
            quantity: i.quantity,
            unitPrice: i.unit_price,
          }))
        );
      }
      setToastMessage('Receipt re-analyzed successfully by Gemini AI!');
    } catch (e: any) {
      setToastMessage(`Retry failed: ${e.message}`);
    } finally {
      setIsRetryingExtraction(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Action: Save Draft (keeps in review queue with user updates)
  const handleSaveDraft = () => {
    const normalizedDate = slashFormatToDate(dateInput);
    const updated: Receipt = {
      ...currentReceipt,
      vendor: vendor.trim() || 'Unidentified Merchant',
      date: normalizedDate,
      category,
      currency,
      subtotal: parsedSubtotal,
      tax: parsedTax,
      items,
      total: parsedTotal,
      status: duplicateCheck.isDuplicate ? 'possible_duplicate' : 'needs_review',
      unclearFields: [
        ...(isVendorUnclear ? ['vendor'] : []),
        ...(isDateUnclear ? ['date'] : []),
        ...(isTotalUnclear ? ['total'] : []),
      ],
      overrideConfirmed: overrideAcknowledged,
    };
    onConfirmReceipt(updated);
    playTactileClick();
    setToastMessage('Draft saved! Receipt remains in Review queue.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Action: Confirm Receipt (validates and marks confirmed)
  const handleConfirm = () => {
    // 1. Check critical missing fields
    if (financialValidation.isCriticalError) {
      playTactileClick();
      setToastMessage('Please resolve critical missing fields (vendor, date, or total) before confirming.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    // 2. Check if warnings exist and require user acknowledgment
    const hasWarnings =
      financialValidation.status === 'mismatch' ||
      duplicateCheck.isDuplicate ||
      isDateUnclear ||
      isVendorUnclear ||
      isTotalUnclear;

    if (hasWarnings && !overrideAcknowledged) {
      playTactileClick();
      setToastMessage(
        'Warning: Material issues detected. Please check the acknowledgment box below to confirm override.'
      );
      setTimeout(() => setToastMessage(null), 4500);
      return;
    }

    // Clean up any remaining '?' in date
    const cleanDateInput = dateInput.replace(/\?/g, '0');
    const normalizedDate = slashFormatToDate(cleanDateInput);

    const updated: Receipt = {
      ...currentReceipt,
      vendor: vendor.trim() || currentReceipt.vendor,
      date: normalizedDate,
      category,
      currency,
      subtotal: parsedSubtotal,
      tax: parsedTax,
      items,
      total: parsedTotal,
      status: 'confirmed',
      unclearFields: [],
      overrideConfirmed: true,
      arithmeticMismatch: false,
    };

    playTactileSuccess();
    onConfirmReceipt(updated);
    setToastMessage(`Receipt ${updated.id} confirmed and added to Records!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const matchedDuplicateReceipt =
    duplicateCheck.matchedReceipt ||
    receipts.find(
      (r) =>
        r.id !== currentReceipt?.id &&
        r.id === (currentReceipt?.duplicateOfId || 'R-0112')
    ) ||
    DUPLICATE_REFERENCE_RECEIPT;

  if (!currentReceipt) {
    return (
      <div className="flex-1 p-8 text-center bg-[#0A0A0C] min-h-screen flex flex-col items-center justify-center text-zinc-300">
        <p className="text-[15px] font-medium text-white">No receipts in review queue.</p>
        <button
          type="button"
          onClick={() => {
            playTactileClick();
            onGoToRecords();
          }}
          className="btn-tactile mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-[13px] font-medium"
        >
          Go to Records
        </button>
      </div>
    );
  }

  const isPdf =
    currentReceipt.fileType === 'application/pdf' ||
    currentReceipt.fileName.toLowerCase().endsWith('.pdf');

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0A0A0C] text-zinc-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#16161A] border border-white/20 text-white px-4 py-2.5 rounded-lg shadow-2xl text-[12.5px] font-medium">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="bg-[#0E0E12] border-b border-white/[0.07] px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight leading-tight">
              {t.reviewHeading}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tabular-nums">
              {currentReceipt.id}
            </span>
            {currentReceipt.sourceTag === 'Register' && (
              <span className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
                Source: Register
              </span>
            )}
          </div>
          <p className="text-[12px] sm:text-[12.5px] text-zinc-400 mt-0.5 font-mono">
            {metrics.storyReviewedCount} of {metrics.storyTotalCount} reviewed ·{' '}
            {metrics.storyNeedsAttentionCount} need attention
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Receipt selector if multiple receipts are pending */}
          {reviewQueue.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-mono text-zinc-500">Jump to:</span>
              <select
                value={currentReceipt.id}
                onChange={(e) => {
                  playTactilePop();
                  onSelectReceiptId(e.target.value);
                }}
                className="bg-[#141417] border border-white/[0.08] rounded-md px-2.5 py-1 text-[12px] font-medium text-zinc-200 focus:border-white/20 focus:outline-none cursor-pointer"
              >
                {reviewQueue.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} - {r.vendor} ({formatCurrency(r.total, r.currency)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-mono text-zinc-400 tabular-nums">
              {metrics.storyProgressPercent}%
            </span>
            <div className="w-[120px] h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${metrics.storyProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid: Split View */}
      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1360px] w-full items-start mx-auto">
        {/* LEFT CARD: Original Receipt Preview */}
        <div className="card-obsidian rounded-xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-[15px] font-medium text-white tracking-tight">Original receipt</h2>
              <span className="text-[11.5px] font-mono text-zinc-500">{currentReceipt.fileName}</span>
            </div>
            {currentReceipt.confidenceScore && (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>OCR: {Math.round(currentReceipt.confidenceScore * 100)}%</span>
              </span>
            )}
          </div>

          {/* Obsidian Viewport holding the receipt */}
          <div className="bg-[#0A0A0E] border border-white/[0.06] rounded-lg min-h-[460px] p-4 sm:p-6 flex items-center justify-center overflow-auto">
            {currentReceipt.imageUrl ? (
              <div className="bg-[#141417] rounded-lg border border-white/[0.08] shadow-2xl p-2.5 max-w-[420px] w-full">
                <img
                  src={currentReceipt.imageUrl}
                  alt={`Uploaded receipt ${currentReceipt.fileName}`}
                  className="w-full h-auto rounded object-contain max-h-[480px]"
                />
              </div>
            ) : isPdf ? (
              /* PDF Document Preview Card */
              <div className="bg-[#141417] rounded-lg shadow-xl p-5 max-w-[380px] w-full text-zinc-100 border border-white/[0.08]">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-rose-500/10 text-rose-400 font-mono text-[10px] border border-rose-500/20">PDF</span>
                    <span className="text-[12.5px] font-medium truncate max-w-[200px]">{currentReceipt.fileName}</span>
                  </div>
                  <span className="text-[10.5px] font-mono text-zinc-500">Tax Invoice</span>
                </div>
                <div className="space-y-2.5 text-[12px]">
                  <div className="p-2.5 bg-[#0E0E12] rounded border border-white/[0.05]">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Vendor</p>
                    <p className="text-[13px] font-medium text-white mt-0.5">{currentReceipt.vendor}</p>
                    {currentReceipt.gstin && (
                      <p className="text-[10.5px] font-mono text-zinc-500 mt-0.5">GSTIN: {currentReceipt.gstin}</p>
                    )}
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-zinc-500">Date</span>
                    <span className="font-mono text-zinc-200">{currentReceipt.date}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-zinc-500">Invoice No</span>
                    <span className="font-mono text-zinc-200">{currentReceipt.billNo || 'N/A'}</span>
                  </div>
                  <div className="pt-1.5">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">Line Items</p>
                    <div className="space-y-1">
                      {items.map((it, i) => (
                        <div key={i} className="flex justify-between text-[11.5px]">
                          <span className="text-zinc-300">{it.name}</span>
                          <span className="font-mono text-white tabular-nums">{formatCurrency(it.amount, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-white/[0.08] flex justify-between font-mono font-medium text-[13.5px]">
                    <span className="text-white">Total</span>
                    <span className="text-emerald-400 tabular-nums">{formatCurrency(currentReceipt.total, currency)}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Standard Minimal Dark Paper Receipt */
              <div className="bg-[#141417] rounded-lg border border-white/[0.08] shadow-2xl p-5 w-full max-w-[340px] text-zinc-100">
                <div className="text-center mb-3">
                  <div className="text-[13px] font-medium tracking-wide uppercase text-white">
                    {vendor.toUpperCase() || 'RECEIPT'}
                  </div>
                  <div className="text-[10.5px] text-zinc-500 mt-0.5 font-mono">
                    {currentReceipt.address || 'Shop & Retail Supply Center'}
                  </div>
                </div>

                <div
                  className={`rounded px-2.5 py-1.5 mb-2.5 text-[11.5px] font-mono ${
                    isDateUnclear
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                      : 'bg-[#0E0E12] border border-white/[0.06] text-zinc-300'
                  }`}
                >
                  Date: {dateInput} {isDateUnclear && '(Unclear)'}
                </div>

                <div className="text-[11px] font-mono text-zinc-500 mb-2.5 px-0.5 flex justify-between">
                  <span>Bill: {currentReceipt.billNo || '4471'}</span>
                  <span>{currency}</span>
                </div>

                {/* Line Items */}
                <div className="space-y-1 text-[11.5px] text-zinc-300 mb-3 px-0.5 max-h-[160px] overflow-y-auto">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="truncate pr-2">{item.name}</span>
                      <span className="font-mono tabular-nums text-white shrink-0">
                        {formatIndianNumber(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                {(parsedSubtotal !== null || parsedTax !== null) && (
                  <div className="py-2 border-t border-white/[0.06] text-[11px] font-mono space-y-0.5 text-zinc-500">
                    {parsedSubtotal !== null && (
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="tabular-nums text-zinc-300">{formatCurrency(parsedSubtotal, currency)}</span>
                      </div>
                    )}
                    {parsedTax !== null && (
                      <div className="flex justify-between">
                        <span>Tax / GST</span>
                        <span className="tabular-nums text-zinc-300">{formatCurrency(parsedTax, currency)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 flex items-center justify-between text-[12px] font-mono font-medium text-emerald-400 mt-2">
                  <span>TOTAL</span>
                  <span className="tabular-nums font-semibold">{formatCurrency(parsedTotal, currency)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Legend and Retry */}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-3 text-[11.5px] text-zinc-400">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Unclear</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Verified</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isRetryingExtraction}
              onClick={() => {
                playTactileClick();
                handleRetryExtraction();
              }}
              className="btn-tactile-subtle text-[11.5px] font-mono text-zinc-400 hover:text-white cursor-pointer disabled:opacity-50"
            >
              {isRetryingExtraction ? 'Re-scanning…' : '↻ Retry extraction'}
            </button>
          </div>
        </div>

        {/* RIGHT CARD: Editable Extracted Information */}
        <div className="card-obsidian rounded-xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-[15px] font-medium text-white tracking-tight">Extracted details</h2>
              <p className="text-[11.5px] text-zinc-400 mt-0.5">
                Review and edit extracted fields before confirming to ledger
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.07]">
              AI extracted
            </span>
          </div>

          {/* DUPLICATE WARNING BANNER */}
          {duplicateCheck.isDuplicate && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="text-rose-400 text-[14px] leading-none mt-0.5">⚠️</span>
                <div>
                  <div className="text-[12.5px] font-medium text-rose-300">
                    Likely Duplicate Detected
                  </div>
                  <div className="text-[11.5px] text-zinc-300 mt-0.5 font-mono">
                    {duplicateCheck.matchDetails?.reason ||
                      `Matches record ${matchedDuplicateReceipt.id} (${matchedDuplicateReceipt.vendor} · ${matchedDuplicateReceipt.date})`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTactilePop();
                  setIsCompareOpen(true);
                }}
                className="btn-tactile-subtle text-[11.5px] font-medium text-rose-300 hover:text-white shrink-0 cursor-pointer bg-white/[0.06] px-2.5 py-1 rounded border border-rose-500/30"
              >
                Compare
              </button>
            </div>
          )}

          {/* ARITHMETIC WARNING BANNER */}
          {financialValidation.status === 'mismatch' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 mb-4 text-[12px] text-amber-300">
              <div className="font-medium flex items-center justify-between">
                <span>⚠️ Arithmetic Reconciliation Notice</span>
                <button
                  type="button"
                  onClick={() => {
                    playTactileClick();
                    handleSyncTotalWithItems();
                  }}
                  className="btn-tactile text-[11px] font-mono text-zinc-200 bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08] hover:bg-white/[0.1] cursor-pointer"
                >
                  Sync total ({formatCurrency(lineItemsSum, currency)})
                </button>
              </div>
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11.5px] text-zinc-300 font-mono">
                {financialValidation.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {financialValidation.status === 'insufficient_info' && (
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5 mb-4 text-[11.5px] text-zinc-400">
              ℹ️ <strong className="text-zinc-200">Unable to verify item sum:</strong> Receipt does not provide individual item amounts.
            </div>
          )}

          {/* Vendor and Date inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="review-vendor-input" className="text-[11.5px] font-mono text-zinc-400">
                  Vendor
                </label>
                {isVendorUnclear && (
                  <span className="text-[10.5px] font-mono text-amber-400">Verify</span>
                )}
              </div>
              <input
                id="review-vendor-input"
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Merchant or shop name"
                className={`w-full rounded-md px-3 py-2 text-[13px] font-normal focus:outline-none ${
                  isVendorUnclear
                    ? 'border border-amber-500/50 bg-[#161410] text-amber-300'
                    : 'border border-white/[0.08] bg-[#0E0E12] text-white focus:border-white/20'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="review-date-input" className="text-[11.5px] font-mono text-zinc-400">
                  Date
                </label>
                {isDateUnclear && (
                  <span className="text-[10.5px] font-mono text-amber-400">Check date</span>
                )}
              </div>
              <input
                id="review-date-input"
                type="text"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                placeholder="DD/MM/YYYY"
                className={`w-full rounded-md px-3 py-2 text-[13px] font-mono focus:outline-none ${
                  isDateUnclear
                    ? 'border border-amber-500/50 bg-[#161410] text-amber-300'
                    : 'border border-white/[0.08] bg-[#0E0E12] text-white focus:border-white/20'
                }`}
              />
            </div>
          </div>

          {/* Currency and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
            <div>
              <label htmlFor="review-currency-select" className="block text-[11.5px] font-mono text-zinc-400 mb-1">
                Currency
              </label>
              <select
                id="review-currency-select"
                value={currency}
                onChange={(e) => {
                  playTactilePop();
                  setCurrency(e.target.value);
                }}
                className="w-full rounded-md border border-white/[0.08] bg-[#0E0E12] px-3 py-2 text-[12.5px] font-medium text-white focus:border-white/20 focus:outline-none cursor-pointer"
              >
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="AED">AED (UAE Dirham)</option>
              </select>
            </div>

            <div>
              <label htmlFor="review-category-select" className="block text-[11.5px] font-mono text-zinc-400 mb-1">
                Expense category
              </label>
              <select
                id="review-category-select"
                value={category}
                onChange={(e) => {
                  playTactilePop();
                  setCategory(e.target.value as Category);
                }}
                className="w-full rounded-md border border-white/[0.08] bg-[#0E0E12] px-3 py-2 text-[12.5px] font-medium text-white focus:border-white/20 focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* EDITABLE LINE ITEMS TABLE */}
          <div className="rounded-lg border border-white/[0.07] overflow-hidden mb-4 bg-[#0E0E12]">
            <div className="bg-white/[0.02] px-3 py-2 border-b border-white/[0.06] flex items-center justify-between text-[10.5px] font-mono text-zinc-400 uppercase tracking-wider">
              <span>ITEM DESCRIPTION</span>
              <div className="flex items-center gap-6">
                <span>AMOUNT ({currency})</span>
                <span className="w-5"></span>
              </div>
            </div>

            <div className="divide-y divide-white/[0.04] max-h-[200px] overflow-y-auto">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 flex items-center justify-between gap-3 hover:bg-white/[0.02]"
                >
                  <input
                    type="text"
                    aria-label={`Item ${idx + 1} name`}
                    value={item.name}
                    onChange={(e) => handleItemNameChange(idx, e.target.value)}
                    className="text-[12.5px] text-zinc-200 bg-transparent focus:outline-none focus:text-white w-full"
                    placeholder="Item description"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Item ${idx + 1} amount`}
                      value={item.amount}
                      onChange={(e) => handleItemAmountChange(idx, e.target.value)}
                      className="w-20 text-right text-[12.5px] font-mono text-white tabular-nums bg-transparent rounded px-1 py-0.5 border border-transparent hover:border-white/10 focus:border-white/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        playTactilePop();
                        handleRemoveItem(idx);
                      }}
                      title="Remove row"
                      className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-rose-400 rounded cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table Footer */}
            <div className="bg-white/[0.02] px-3 py-2 border-t border-white/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  handleAddItem();
                }}
                className="btn-tactile-subtle text-[11.5px] font-mono text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                + Add item
              </button>
              <div className="text-[11px] font-mono text-zinc-400">
                Sum: <strong className="text-white tabular-nums">{formatCurrency(lineItemsSum, currency)}</strong>
              </div>
            </div>
          </div>

          {/* Subtotal, Tax, and Total inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
            <div>
              <label htmlFor="review-subtotal-input" className="block text-[11px] font-mono text-zinc-400 mb-1">
                Subtotal
              </label>
              <input
                id="review-subtotal-input"
                type="number"
                step="any"
                placeholder="Optional"
                value={subtotalInput}
                onChange={(e) => setSubtotalInput(e.target.value)}
                className="w-full rounded-md border border-white/[0.08] bg-[#0E0E12] px-2.5 py-1.5 text-[12.5px] text-white font-mono tabular-nums focus:border-white/20 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="review-tax-input" className="block text-[11px] font-mono text-zinc-400 mb-1">
                Tax / GST
              </label>
              <input
                id="review-tax-input"
                type="number"
                step="any"
                placeholder="Optional"
                value={taxInput}
                onChange={(e) => setTaxInput(e.target.value)}
                className="w-full rounded-md border border-white/[0.08] bg-[#0E0E12] px-2.5 py-1.5 text-[12.5px] text-white font-mono tabular-nums focus:border-white/20 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="review-total-input" className="text-[11px] font-mono font-medium text-white">
                  Total Payable
                </label>
                {isTotalUnclear && (
                  <span className="text-[10px] font-mono text-amber-400">Check</span>
                )}
              </div>
              <input
                id="review-total-input"
                type="number"
                step="any"
                value={totalInput}
                onChange={(e) => setTotalInput(e.target.value)}
                className={`w-full rounded-md px-2.5 py-1.5 text-[13px] font-mono font-semibold tabular-nums focus:outline-none ${
                  isTotalUnclear
                    ? 'border border-amber-500/50 bg-[#161410] text-amber-300'
                    : 'border border-emerald-500/40 bg-[#0E0E12] text-emerald-400 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* User Acknowledgment Checkbox if warnings exist */}
          {(duplicateCheck.isDuplicate ||
            financialValidation.status === 'mismatch' ||
            isDateUnclear ||
            isVendorUnclear) && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
              <label className="flex items-start gap-2 cursor-pointer select-none text-[11.5px] text-amber-300">
                <input
                  type="checkbox"
                  checked={overrideAcknowledged}
                  onChange={(e) => {
                    playTactilePop();
                    setOverrideAcknowledged(e.target.checked);
                  }}
                  className="mt-0.5 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span>
                  <strong>Acknowledge & Override:</strong> I have verified this bill despite warnings and wish to confirm it into the ledger.
                </span>
              </label>
            </div>
          )}

          {/* Action Buttons: Confirm & Save, Save Draft, Mark Duplicate, Skip */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-tactile flex-1 min-w-[130px] py-2 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-[13px] shadow-[0_2px_8px_rgba(16,185,129,0.2)] text-center cursor-pointer"
            >
              {t.confirmAndSaveBtn}
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="btn-tactile py-2 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-medium text-[12px] cursor-pointer"
            >
              Save draft
            </button>

            <button
              type="button"
              onClick={() => {
                playTactileClick();
                onMarkDuplicate(currentReceipt.id);
              }}
              className="btn-tactile py-2 px-3 rounded-lg border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium text-[12px] cursor-pointer"
            >
              Mark duplicate
            </button>

            <button
              type="button"
              onClick={() => {
                playTactilePop();
                onSkipReceipt(currentReceipt.id);
              }}
              className="btn-tactile-subtle py-2 px-3 rounded-lg text-zinc-400 hover:text-zinc-200 font-medium text-[12px] cursor-pointer"
            >
              Skip
            </button>
          </div>

          {reviewQueue.length === 0 && (
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-emerald-400 font-mono">
              <span>All queued receipts have been verified!</span>
              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  onGoToRecords();
                }}
                className="hover:underline cursor-pointer"
              >
                View Records →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compare Modal */}
      {isCompareOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="card-obsidian-elevated rounded-xl border border-white/10 max-w-[720px] w-full p-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div>
                <h3 id="compare-modal-title" className="text-[16px] font-medium text-white tracking-tight">
                  Compare possible duplicate
                </h3>
                <p className="text-[11.5px] text-zinc-400 mt-0.5 font-mono">
                  Candidate ({currentReceipt.id}) vs existing match ({matchedDuplicateReceipt.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTactilePop();
                  setIsCompareOpen(false);
                }}
                className="text-zinc-400 hover:text-white p-1 text-[13px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-4">
              {/* Current Candidate */}
              <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-mono text-emerald-400">
                    {currentReceipt.id} (Candidate)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300">
                    Duplicate?
                  </span>
                </div>
                <div className="text-[13px] font-medium text-white">{vendor}</div>
                <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  Date: {dateInput}
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1 text-[11.5px] max-h-[120px] overflow-y-auto text-zinc-300 font-mono">
                  {items.map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate pr-2">{it.name}</span>
                      <span className="tabular-nums">{formatCurrency(it.amount, currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-white/[0.06] flex justify-between font-mono font-medium text-[12.5px] text-white">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(parsedTotal, currency)}</span>
                </div>
              </div>

              {/* Stored Record */}
              <div className="rounded-lg border border-white/[0.07] bg-[#0E0E12] p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-mono text-emerald-400">
                    {matchedDuplicateReceipt.id} (Stored)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                    {matchedDuplicateReceipt.status}
                  </span>
                </div>
                <div className="text-[13px] font-medium text-white">
                  {matchedDuplicateReceipt.vendor}
                </div>
                <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  Date: {matchedDuplicateReceipt.date}
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1 text-[11.5px] max-h-[120px] overflow-y-auto text-zinc-300 font-mono">
                  {matchedDuplicateReceipt.items.map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate pr-2">{it.name}</span>
                      <span className="tabular-nums">
                        {formatCurrency(it.amount, matchedDuplicateReceipt.currency)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-white/[0.06] flex justify-between font-mono font-medium text-[12.5px] text-white">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatCurrency(matchedDuplicateReceipt.total, matchedDuplicateReceipt.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  setIsCompareOpen(false);
                  onMarkDuplicate(currentReceipt.id);
                }}
                className="btn-tactile px-3 py-1.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[12px] font-medium cursor-pointer"
              >
                Mark as duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  setOverrideAcknowledged(true);
                  setIsCompareOpen(false);
                }}
                className="btn-tactile px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[12px] font-medium cursor-pointer"
              >
                Not duplicate · Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
