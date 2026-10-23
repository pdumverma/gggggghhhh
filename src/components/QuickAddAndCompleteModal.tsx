import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  IndianRupee,
  Calendar,
  Store,
  Tag,
  FileText,
  ArrowRight,
  PenTool,
} from 'lucide-react';
import {
  CATEGORIES,
  Category,
  PartialExtractionDraft,
  Receipt,
  RevenueEntry,
} from '../types';
import {
  getNextReceiptId,
  isoToDisplayDate,
  parseMessyLanguageBillCommand,
} from '../utils/ledgerLogic';
import { playTactileSound } from '../utils/soundEffects';

interface QuickAddAndCompleteModalProps {
  isOpen: boolean;
  mode: 'manual' | 'ai-partial';
  initialEntryType?: 'cost' | 'revenue';
  partialDraft?: PartialExtractionDraft | null;
  existingReceipts: Receipt[];
  onClose: () => void;
  onSaveReceipt: (receipt: Receipt) => void;
  onSaveRevenue?: (entry: RevenueEntry) => void;
}

export const QuickAddAndCompleteModal: React.FC<QuickAddAndCompleteModalProps> = ({
  isOpen,
  mode,
  initialEntryType = 'cost',
  partialDraft,
  existingReceipts,
  onClose,
  onSaveReceipt,
  onSaveRevenue,
}) => {
  const [entryType, setEntryType] = useState<'cost' | 'revenue'>(initialEntryType);
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState('23 Oct 2026');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Supplies & Stock');
  const [itemNote, setItemNote] = useState('');
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setQuickNoteInput('');
    if (mode === 'ai-partial' && partialDraft) {
      setEntryType(partialDraft.entryType || 'cost');
      setVendor(partialDraft.vendor || '');
      setDate(partialDraft.date || '23 Oct 2026');
      setAmount(partialDraft.amount || '');
      setCategory(partialDraft.category || 'Supplies & Stock');
      setItemNote(partialDraft.itemNote || '');
    } else {
      setEntryType(initialEntryType);
      setVendor('');
      setDate('23 Oct 2026');
      setAmount('');
      setCategory('Supplies & Stock');
      setItemNote('');
    }
  }, [isOpen, mode, partialDraft, initialEntryType]);

  if (!isOpen) return null;

  const missingFields = partialDraft?.missingFields || [];
  const recognizedFields = partialDraft?.recognizedFields || [];

  const isFieldMissingFromAI = (
    field: 'vendor' | 'date' | 'amount' | 'category' | 'itemNote'
  ) => mode === 'ai-partial' && missingFields.includes(field);

  const isFieldRecognizedByAI = (
    field: 'vendor' | 'date' | 'amount' | 'category' | 'itemNote'
  ) => mode === 'ai-partial' && recognizedFields.includes(field);

  const handleParseHandwrittenSlipText = () => {
    playTactileSound('click');
    const raw = quickNoteInput.trim();
    if (!raw) return;
    const parsed = parseMessyLanguageBillCommand(raw, existingReceipts, true);
    if (parsed.draft) {
      if (parsed.draft.vendor) setVendor(parsed.draft.vendor);
      if (parsed.draft.amount) setAmount(parsed.draft.amount);
      if (parsed.draft.date) setDate(parsed.draft.date);
      if (parsed.draft.category) setCategory(parsed.draft.category);
      setItemNote(`Handwritten note: ${raw}`);
      setErrorMessage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVendor = vendor.trim();
    const numericAmount = Number(amount);

    if (!cleanVendor) {
      playTactileSound('pop');
      setErrorMessage('Please enter the vendor or customer name.');
      return;
    }
    if (!date.trim()) {
      playTactileSound('pop');
      setErrorMessage('Please provide the bill date.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      playTactileSound('pop');
      setErrorMessage('Please enter a valid amount greater than ₹0.');
      return;
    }

    playTactileSound('chime');
    const displayDate = isoToDisplayDate(date.trim());

    if (entryType === 'revenue' && onSaveRevenue) {
      const newRevenue: RevenueEntry = {
        id: `REV-${Date.now()}`,
        label: cleanVendor,
        date: displayDate,
        amount: Math.round(numericAmount),
        channel: 'Cash',
      };
      onSaveRevenue(newRevenue);
      onClose();
      return;
    }

    const newId = getNextReceiptId(existingReceipts);
    const newReceipt: Receipt = {
      id: newId,
      vendor: cleanVendor,
      date: displayDate,
      category: category || 'Supplies & Stock',
      items: [
        {
          name: itemNote.trim() || `${category || 'Supplies & Stock'} (${cleanVendor})`,
          amount: Math.round(numericAmount),
        },
      ],
      total: Math.round(numericAmount),
      status: 'confirmed',
      unclearFields: [],
      fileName: partialDraft?.fileName || 'manual_entry.jpg',
      imageUrl: partialDraft?.imageUrl,
      sourceTag: mode === 'ai-partial' ? 'Scan' : 'Manual',
      entryType: 'cost',
    };

    onSaveReceipt(newReceipt);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      data-testid="quick-add-complete-modal"
    >
      <div className="card-obsidian-elevated rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto border border-white/[0.09]">
        {/* Top Header */}
        <div className="px-6 py-5 flex items-start justify-between border-b border-white/[0.07] bg-[#16161A]/80">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                mode === 'ai-partial'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {mode === 'ai-partial' ? <Sparkles size={18} /> : <PlusCircle size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[16.5px] font-bold text-zinc-100 tracking-tight">
                  {mode === 'ai-partial'
                    ? 'Complete Unrecognized Bill Fields'
                    : 'One-Tap Add to Records'}
                </h2>
                {mode === 'ai-partial' && (
                  <span className="px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {missingFields.length} Field{missingFields.length === 1 ? '' : 's'} Needed
                  </span>
                )}
              </div>
              <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">
                {mode === 'ai-partial'
                  ? partialDraft?.rawText
                    ? `AI parsed "${partialDraft.rawText}". Recognized fields are pre-filled below—just complete highlighted info!`
                    : 'AI pre-filled recognizable fields. Please complete only highlighted values to save to Records.'
                  : 'Enter Name, Date, and Amount manually—or paste a rough handwritten note—to save directly to Confirmed Records.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playTactileSound('pop');
              onClose();
            }}
            className="btn-tactile text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Entry Type Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0A0A0C] rounded-xl border border-white/[0.07]">
            <button
              type="button"
              onClick={() => {
                playTactileSound('tick');
                setEntryType('cost');
              }}
              data-testid="modal-type-cost"
              className={`btn-tactile py-2 px-3 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
                entryType === 'cost'
                  ? 'bg-[#1C1C22] text-emerald-400 border border-white/10 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Vendor Bill / Cost
            </button>
            <button
              type="button"
              onClick={() => {
                playTactileSound('tick');
                setEntryType('revenue');
              }}
              data-testid="modal-type-revenue"
              className={`btn-tactile py-2 px-3 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
                entryType === 'revenue'
                  ? 'bg-[#1C1C22] text-emerald-400 border border-white/10 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Shop Sale / Revenue
            </button>
          </div>

          {/* Handwritten Note Auto-Fill helper */}
          {mode === 'manual' && (
            <div className="p-3.5 rounded-xl bg-[#0A0A0C] border border-white/[0.07] space-y-2">
              <label className="text-[11.5px] font-medium text-emerald-400 flex items-center gap-1.5">
                <PenTool size={12} className="text-emerald-400" />
                <span>Have a handwritten note (Name, Price &amp; Date)? Paste to auto-fill:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  data-testid="modal-handwritten-note-input"
                  value={quickNoteInput}
                  onChange={(e) => setQuickNoteInput(e.target.value)}
                  placeholder="e.g. Sharma Kirana 1450 23 Oct 2026"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#141417] border border-white/[0.08] text-[12.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleParseHandwrittenSlipText}
                  data-testid="modal-parse-note-btn"
                  className="btn-tactile px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[12px] font-semibold cursor-pointer shrink-0"
                >
                  Auto-Fill
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-[12px] font-medium text-rose-400 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Vendor / Party Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1.5">
                <Store size={13} className="text-emerald-400" />
                <span>
                  {entryType === 'revenue'
                    ? 'Customer / Sale Title *'
                    : 'Vendor / Person Name *'}
                </span>
              </label>
              {isFieldMissingFromAI('vendor') && (
                <span
                  data-testid="badge-missing-vendor"
                  className="text-[11px] font-medium text-amber-400 flex items-center gap-1"
                >
                  <AlertTriangle size={11} /> AI couldn&apos;t recognize — Please fill
                </span>
              )}
              {isFieldRecognizedByAI('vendor') && (
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={11} /> AI Recognized
                </span>
              )}
            </div>
            <input
              type="text"
              data-testid="modal-input-vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder={
                entryType === 'revenue'
                  ? 'e.g. Evening Counter Sales or Gupta Hotel Order'
                  : 'e.g. Sharma General Store, Raju Milk'
              }
              autoFocus={isFieldMissingFromAI('vendor') || mode === 'manual'}
              className={`w-full px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium outline-none transition-all ${
                isFieldMissingFromAI('vendor')
                  ? 'bg-amber-950/20 border-2 border-amber-500/60 text-zinc-100 ring-2 ring-amber-500/20'
                  : isFieldRecognizedByAI('vendor')
                  ? 'bg-[#141417] border border-emerald-500/30 text-zinc-100'
                  : 'bg-[#0A0A0C] border border-white/[0.08] focus:border-emerald-500/50 text-zinc-100'
              }`}
            />
          </div>

          {/* Amount & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Total Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1">
                  <IndianRupee size={13} className="text-emerald-400" />
                  <span>Price / Amount (₹) *</span>
                </label>
                {isFieldMissingFromAI('amount') && (
                  <span
                    data-testid="badge-missing-amount"
                    className="text-[10.5px] font-medium text-amber-400"
                  >
                    AI Unrecognized — Fill
                  </span>
                )}
                {isFieldRecognizedByAI('amount') && (
                  <span className="text-[10.5px] font-medium text-emerald-400">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                type="number"
                data-testid="modal-input-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1450"
                autoFocus={!isFieldMissingFromAI('vendor') && isFieldMissingFromAI('amount')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-[14px] font-mono font-bold tabular-nums outline-none transition-all ${
                  isFieldMissingFromAI('amount')
                    ? 'bg-amber-950/20 border-2 border-amber-500/60 text-zinc-100 ring-2 ring-amber-500/20'
                    : isFieldRecognizedByAI('amount')
                    ? 'bg-[#141417] border border-emerald-500/30 text-zinc-100'
                    : 'bg-[#0A0A0C] border border-white/[0.08] focus:border-emerald-500/50 text-zinc-100'
                }`}
              />
            </div>

            {/* Bill Date */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1">
                  <Calendar size={13} className="text-emerald-400" />
                  <span>Date *</span>
                </label>
                {isFieldMissingFromAI('date') && (
                  <span
                    data-testid="badge-missing-date"
                    className="text-[10.5px] font-medium text-amber-400"
                  >
                    AI Unrecognized — Fill
                  </span>
                )}
                {isFieldRecognizedByAI('date') && (
                  <span className="text-[10.5px] font-medium text-emerald-400">
                    AI Filled
                  </span>
                )}
              </div>
              <input
                type="text"
                data-testid="modal-input-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="23 Oct 2026"
                className={`w-full px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium outline-none transition-all ${
                  isFieldMissingFromAI('date')
                    ? 'bg-amber-950/20 border-2 border-amber-500/60 text-zinc-100 ring-2 ring-amber-500/20'
                    : isFieldRecognizedByAI('date')
                    ? 'bg-[#141417] border border-emerald-500/30 text-zinc-100'
                    : 'bg-[#0A0A0C] border border-white/[0.08] focus:border-emerald-500/50 text-zinc-100'
                }`}
              />
            </div>
          </div>

          {/* Category & Item Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1 mb-1.5">
                <Tag size={13} className="text-emerald-400" />
                <span>Category</span>
              </label>
              <select
                data-testid="modal-input-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl text-[13.5px] font-medium text-zinc-100 outline-none transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#141417] text-zinc-100">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1 mb-1.5">
                <FileText size={13} className="text-emerald-400" />
                <span>Item / Note</span>
              </label>
              <input
                type="text"
                data-testid="modal-input-item"
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="e.g. Handwritten slip, 50kg Sugar"
                className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl text-[13.5px] font-medium text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={() => {
                playTactileSound('pop');
                onClose();
              }}
              className="btn-tactile px-4 py-2.5 rounded-xl border border-white/[0.08] text-[12.5px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="modal-submit-save"
              className="btn-tactile px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 text-[13px] font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>
                {entryType === 'revenue'
                  ? 'Save Revenue to Insights'
                  : 'Save Directly to Records'}
              </span>
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
