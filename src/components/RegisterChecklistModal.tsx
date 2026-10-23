import React, { useState } from 'react';
import { CATEGORIES, Category, LanguageCode, RegisterRowEntry } from '../types';
import { getTranslations } from '../i18n';
import { playTactileSound } from '../utils/soundEffects';

interface RegisterChecklistModalProps {
  entries: RegisterRowEntry[];
  language: LanguageCode;
  fileName?: string;
  onClose: () => void;
  onAddAllToRecords: (selectedEntries: RegisterRowEntry[]) => void;
}

export const RegisterChecklistModal: React.FC<RegisterChecklistModalProps> = ({
  entries: initialEntries,
  language,
  fileName,
  onClose,
  onAddAllToRecords,
}) => {
  const t = getTranslations(language);
  const [rows, setRows] = useState<RegisterRowEntry[]>(initialEntries);

  const toggleRow = (id: string) => {
    playTactileSound('tick');
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const updateRowField = (
    id: string,
    field: keyof RegisterRowEntry,
    value: any
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        const isAmountMissing =
          updated.amount === null ||
          updated.amount === undefined ||
          isNaN(Number(updated.amount)) ||
          Number(updated.amount) <= 0;
        const isVendorUnclear =
          !updated.vendorOrPerson.trim() ||
          updated.vendorOrPerson.toLowerCase().includes('unclear');
        const isDateUnclear =
          !updated.date.trim() || updated.date.includes('?');
        updated.needsConfirmation =
          isAmountMissing || isVendorUnclear || isDateUnclear;
        return updated;
      })
    );
  };

  const selectedRows = rows.filter((r) => r.selected);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="card-obsidian-elevated rounded-2xl border border-white/[0.09] shadow-2xl max-w-[920px] w-full p-6 my-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.07]">
          <div>
            <div className="flex items-center gap-2.5">
              <h2
                id="register-modal-title"
                className="text-[18px] font-bold text-zinc-100 tracking-tight"
              >
                {t.registerFoundTitle(rows.length)}
              </h2>
              <span className="text-[11.5px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {t.registerSourceTag}
              </span>
            </div>
            <p className="text-[13px] text-zinc-400 mt-1">
              {fileName ? `Source: ${fileName} · ` : ''}
              Review, edit, or untick rows before saving to Records with status &ldquo;Needs review&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playTactileSound('pop');
              onClose();
            }}
            aria-label="Close register checklist"
            className="btn-tactile px-3 py-1.5 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Checklist table */}
        <div className="my-5 space-y-3 max-h-[440px] overflow-y-auto pr-1">
          {rows.map((row, idx) => {
            const isAmountMissing =
              row.amount === null ||
              row.amount === undefined ||
              isNaN(Number(row.amount)) ||
              Number(row.amount) <= 0;
            const isFlagged = row.needsConfirmation || isAmountMissing;

            return (
              <div
                key={row.id}
                className={`rounded-xl border p-3.5 transition-all ${
                  isFlagged
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-white/[0.07] bg-[#0A0A0C]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Select register row ${idx + 1}`}
                      className="w-4 h-4 rounded text-emerald-500 bg-[#141417] border-white/20 focus:ring-0 cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[12.5px] font-bold text-zinc-100">
                      Row #{idx + 1}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-400">
                      Source: {t.registerSourceTag}
                    </span>
                  </label>

                  {isFlagged && (
                    <span className="text-[11.5px] font-medium text-amber-400 flex items-center gap-1">
                      ⚠️ {t.registerPleaseConfirm}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  {/* Vendor / Person */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-zinc-400 mb-0.5">
                      Vendor / Person
                    </label>
                    <input
                      type="text"
                      aria-label={`Row ${idx + 1} vendor or person`}
                      value={row.vendorOrPerson}
                      onChange={(e) =>
                        updateRowField(row.id, 'vendorOrPerson', e.target.value)
                      }
                      className={`w-full rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-zinc-100 focus:outline-none transition-all ${
                        row.unclearFields.includes('vendor')
                          ? 'border border-amber-500/60 bg-amber-950/40 text-amber-200'
                          : 'border border-white/[0.08] bg-[#141417] focus:border-emerald-500/50'
                      }`}
                    />
                  </div>

                  {/* Item / Note */}
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-medium text-zinc-400 mb-0.5">
                      Item / Note
                    </label>
                    <input
                      type="text"
                      aria-label={`Row ${idx + 1} item or note`}
                      value={row.itemOrNote}
                      onChange={(e) =>
                        updateRowField(row.id, 'itemOrNote', e.target.value)
                      }
                      className="w-full rounded-lg border border-white/[0.08] bg-[#141417] px-2.5 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>

                  {/* Amount */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-zinc-400 mb-0.5">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Confirm ₹"
                      aria-label={`Row ${idx + 1} amount`}
                      value={row.amount ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRowField(
                          row.id,
                          'amount',
                          val === '' ? null : parseFloat(val)
                        );
                      }}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-[13px] font-mono font-bold text-zinc-100 tabular-nums focus:outline-none transition-all ${
                        isAmountMissing
                          ? 'border border-amber-500/60 bg-amber-950/40 text-amber-200 placeholder:text-amber-500/60'
                          : 'border border-white/[0.08] bg-[#141417] focus:border-emerald-500/50'
                      }`}
                    />
                  </div>

                  {/* Date */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-zinc-400 mb-0.5">
                      Date &amp; Category
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        aria-label={`Row ${idx + 1} date`}
                        value={row.date}
                        onChange={(e) =>
                          updateRowField(row.id, 'date', e.target.value)
                        }
                        className={`w-1/2 rounded-lg px-2 py-1.5 text-[12px] font-mono font-medium text-zinc-100 tabular-nums focus:outline-none transition-all ${
                          row.date.includes('?')
                            ? 'border border-amber-500/60 bg-amber-950/40 text-amber-200'
                            : 'border border-white/[0.08] bg-[#141417] focus:border-emerald-500/50'
                        }`}
                      />
                      <select
                        aria-label={`Row ${idx + 1} category`}
                        value={row.category}
                        onChange={(e) =>
                          updateRowField(
                            row.id,
                            'category',
                            e.target.value as Category
                          )
                        }
                        className="w-1/2 rounded-lg border border-white/[0.08] bg-[#141417] px-1.5 py-1.5 text-[12px] text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c} className="bg-[#141417] text-zinc-100">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between flex-wrap gap-3">
          <div className="text-[13px] text-zinc-400">
            <strong className="text-zinc-100 font-mono">{selectedRows.length}</strong> of {rows.length} rows ticked · Saved as{' '}
            <strong className="text-amber-400 font-medium">Needs review</strong> (Source: Register)
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playTactileSound('pop');
                onClose();
              }}
              className="btn-tactile px-4 py-2.5 rounded-xl border border-white/[0.08] bg-[#141417] hover:bg-[#1A1A1F] text-zinc-300 font-semibold text-[13px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedRows.length === 0}
              onClick={() => {
                playTactileSound('chime');
                onAddAllToRecords(selectedRows);
              }}
              className="btn-tactile px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-40 text-zinc-950 font-semibold text-[13.5px] transition-all cursor-pointer shadow-sm"
            >
              {t.registerAddAllBtn} ({selectedRows.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
