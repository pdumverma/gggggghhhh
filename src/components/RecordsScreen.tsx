import React, { useState, useEffect } from 'react';
import { PlusCircle, Download, Search, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';
import {
  Category,
  LanguageCode,
  Receipt,
  ReceiptStatus,
} from '../types';
import { getTranslations } from '../i18n';
import {
  formatINR,
  formatIndianNumber,
  LedgerMetrics,
} from '../utils/ledgerLogic';
import { playTactileClick, playTactilePop } from '../utils/soundEffects';

export type StatusFilter = 'all' | 'confirmed' | 'needs_review' | 'possible_duplicate';

interface RecordsScreenProps {
  receipts: Receipt[];
  metrics: LedgerMetrics;
  selectedCategoryFilter: Category | null;
  onClearCategoryFilter: () => void;
  onExportCSV: () => void;
  onSelectReceiptForReview: (receiptId: string) => void;
  onOpenQuickAdd?: () => void;
  language?: LanguageCode;
  externalStatusFilter?: StatusFilter | null;
}

export const RecordsScreen: React.FC<RecordsScreenProps> = ({
  receipts,
  metrics,
  selectedCategoryFilter,
  onClearCategoryFilter,
  onExportCSV,
  onSelectReceiptForReview,
  onOpenQuickAdd,
  language = 'en',
  externalStatusFilter,
}) => {
  const t = getTranslations(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(externalStatusFilter || 'all');

  useEffect(() => {
    if (externalStatusFilter) {
      setStatusFilter(externalStatusFilter);
    }
  }, [externalStatusFilter]);

  const filteredReceipts = receipts.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) {
      return false;
    }
    if (selectedCategoryFilter && r.category !== selectedCategoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchVendor = r.vendor.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      const matchCategory = r.category.toLowerCase().includes(q);
      return matchVendor || matchId || matchCategory;
    }
    return true;
  });

  const handleStatusFilterChange = (next: StatusFilter) => {
    playTactilePop();
    setStatusFilter(next);
  };

  // Zero-pill discipline: unboxed status indicators with colored micro-dots
  const renderStatusIndicator = (status: ReceiptStatus) => {
    if (status === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (status === 'possible_duplicate') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
          <span>Possible duplicate</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
        <span>Needs review</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0A0A0C] text-zinc-100">
      {/* Header */}
      <header className="bg-[#0E0E12] border-b border-white/[0.07] px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight leading-tight">
            {t.recordsHeading}
          </h1>
          <p className="text-[12px] sm:text-[12.5px] text-zinc-400 mt-0.5 font-mono">
            {metrics.confirmedCount} confirmed · {metrics.duplicateCount} duplicate to review ·{' '}
            {metrics.needsReviewCount} needs review
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              aria-label="Search vendor or receipt"
              placeholder="Search vendor or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[220px] rounded-lg border border-white/[0.08] bg-[#141417] pl-8 pr-3 py-1.5 text-[12.5px] text-zinc-100 placeholder-zinc-500 focus:bg-[#18181D] focus:border-white/20 focus:outline-none transition-colors"
            />
          </div>

          {onOpenQuickAdd && (
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                onOpenQuickAdd();
              }}
              data-testid="records-one-tap-add-btn"
              className="btn-tactile px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-[12.5px] shadow-[0_2px_8px_rgba(16,185,129,0.2)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Record</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playTactileClick();
              onExportCSV();
            }}
            className="btn-tactile px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] font-medium text-[12.5px] transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>{t.exportCsvBtn}</span>
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-[1340px] w-full space-y-4 mx-auto">
        {/* Status segmented filters & active category */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div
            className="flex items-center bg-[#141417] border border-white/[0.07] p-1 rounded-lg gap-1"
            role="group"
            aria-label="Filter records by status"
          >
            <button
              type="button"
              onClick={() => handleStatusFilterChange('all')}
              className={`btn-tactile-subtle px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white/[0.1] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All <span className="ml-1 font-mono text-[11px] text-zinc-400">{receipts.length}</span>
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('confirmed')}
              className={`btn-tactile-subtle px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                statusFilter === 'confirmed'
                  ? 'bg-white/[0.1] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Confirmed <span className="ml-1 font-mono text-[11px] text-emerald-400">{metrics.confirmedCount}</span>
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('needs_review')}
              className={`btn-tactile-subtle px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                statusFilter === 'needs_review'
                  ? 'bg-white/[0.1] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Needs review <span className="ml-1 font-mono text-[11px] text-amber-400">{metrics.needsReviewCount}</span>
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('possible_duplicate')}
              className={`btn-tactile-subtle px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                statusFilter === 'possible_duplicate'
                  ? 'bg-white/[0.1] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Duplicates <span className="ml-1 font-mono text-[11px] text-rose-400">{metrics.duplicateCount}</span>
            </button>
          </div>

          {selectedCategoryFilter && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md text-[12px] font-medium">
              <span>Category: {selectedCategoryFilter}</span>
              <button
                type="button"
                onClick={() => {
                  playTactilePop();
                  onClearCategoryFilter();
                }}
                aria-label="Clear category filter"
                className="hover:text-white ml-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Bento Table Card */}
        <div className="card-obsidian rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 bg-white/[0.02]">
                  <th className="py-3 pl-6 pr-4 w-[140px]">RECEIPT</th>
                  <th className="py-3 px-4">VENDOR</th>
                  <th className="py-3 px-4 w-[130px]">DATE</th>
                  <th className="py-3 px-4 w-[170px]">CATEGORY</th>
                  <th className="py-3 px-4 w-[160px]">STATUS</th>
                  <th className="py-3 pl-4 pr-6 text-right w-[140px]">TOTAL (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-[13px]">
                {filteredReceipts.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      if (r.status !== 'confirmed') {
                        playTactileClick();
                        onSelectReceiptForReview(r.id);
                      }
                    }}
                    className={`transition-colors ${
                      r.status !== 'confirmed'
                        ? 'hover:bg-white/[0.04] cursor-pointer'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="py-3.5 pl-6 pr-4 font-mono font-medium text-emerald-400">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{r.id}</span>
                        {r.sourceTag && r.sourceTag !== 'Scan' && (
                          <span className="px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-300 text-[9.5px] font-mono">
                            {r.sourceTag}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-normal text-zinc-100">{r.vendor}</td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono text-[12px]">{r.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[12px] text-zinc-300 font-normal">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{renderStatusIndicator(r.status)}</td>
                    <td className="py-3.5 pl-4 pr-6 text-right font-mono font-medium text-white tabular-nums">
                      {r.currency && r.currency !== 'INR'
                        ? `${r.currency} ${r.total.toFixed(2)}`
                        : formatIndianNumber(r.total)}
                    </td>
                  </tr>
                ))}

                {filteredReceipts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[13px] text-zinc-500">
                      No matching receipts found in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary Strip */}
        <div className="card-obsidian rounded-xl px-5 py-3.5 flex items-center justify-between flex-wrap gap-2 text-zinc-300">
          <span className="text-[12.5px] font-normal text-zinc-400">
            {metrics.confirmedCount} verified record{metrics.confirmedCount === 1 ? '' : 's'} in ledger
          </span>
          <span className="text-[14px] font-mono font-medium text-white tabular-nums flex items-center gap-2">
            <span className="text-zinc-500 text-[12px]">Confirmed Total:</span>
            <span className="text-emerald-400 font-semibold">{formatINR(metrics.totalSpend)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
