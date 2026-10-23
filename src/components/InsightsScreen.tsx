import React, { useState } from 'react';
import { TrendingUp, TrendingDown, IndianRupee, PlusCircle, Check, Sparkles, Send } from 'lucide-react';
import {
  Category,
  CATEGORY_BAR_CLASSES,
  CATEGORY_COLORS,
  CATEGORY_TAG_CLASSES,
  ChatMessage,
  LanguageCode,
  Receipt,
} from '../types';
import { getTranslations } from '../i18n';
import {
  answerSpendingQuestion,
  formatINR,
  LedgerMetrics,
} from '../utils/ledgerLogic';
import { playTactileClick, playTactilePop } from '../utils/soundEffects';

interface InsightsScreenProps {
  receipts: Receipt[];
  metrics: LedgerMetrics;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onSelectCategoryForRecords: (category: Category) => void;
  onExportCSV: () => void;
  onOpenLogRevenueModal?: () => void;
  language?: LanguageCode;
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  receipts,
  metrics,
  chatMessages,
  setChatMessages,
  onSelectCategoryForRecords,
  onExportCSV,
  onOpenLogRevenueModal,
  language = 'en',
}) => {
  const t = getTranslations(language);
  const [questionInput, setQuestionInput] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('w3');
  const [showRevenueSeries, setShowRevenueSeries] = useState<boolean>(true);
  const [showCostSeries, setShowCostSeries] = useState<boolean>(true);
  const [showProfitSeries, setShowProfitSeries] = useState<boolean>(true);

  const handleSendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = questionInput.trim();
    if (!trimmed) return;

    playTactileClick();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const answer = answerSpendingQuestion(trimmed, receipts);
    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now() + 1}`,
      role: 'assistant',
      text: answer.text,
      sources: answer.sources,
    };

    setChatMessages((prev) => [...prev, userMsg, assistantMsg]);
    setQuestionInput('');
  };

  const maxCategoryAmount =
    metrics.categoryBreakdown.length > 0 && metrics.categoryBreakdown[0].amount > 0
      ? metrics.categoryBreakdown[0].amount
      : 1;

  const series = metrics.financialSeries || [];
  const maxSeriesVal = Math.max(
    1,
    ...series.flatMap((pt) => [pt.revenue, pt.cost, Math.abs(pt.profit)])
  );
  const activePoint =
    series.find((pt) => pt.id === selectedPeriodId) || series[series.length - 1];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0A0A0C] text-zinc-100">
      {/* Header */}
      <header className="bg-[#0E0E12] border-b border-white/[0.07] px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight leading-tight">
            {t.insightsHeading}
          </h1>
          <p className="text-[12px] sm:text-[12.5px] text-zinc-400 mt-0.5">
            {t.insightsSubheading}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.07] text-zinc-300 text-[11.5px] font-mono">
            October 2026
          </span>
          {onOpenLogRevenueModal && (
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                onOpenLogRevenueModal();
              }}
              data-testid="insights-log-revenue-btn"
              className="btn-tactile px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-[12.5px] shadow-[0_2px_8px_rgba(16,185,129,0.2)] flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Log Revenue</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              playTactileClick();
              onExportCSV();
            }}
            className="btn-tactile px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] font-medium text-[12.5px] cursor-pointer"
          >
            Export Ledger CSV
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-[1340px] w-full space-y-6 mx-auto">
        {/* Bento Grid Top Row: Total Revenue, Total Cost, Total Profit */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card A: TOTAL REVENUE */}
          <div className="card-obsidian rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                Total Revenue
              </span>
              <span className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <div
              data-testid="insights-total-revenue"
              className="text-[26px] sm:text-[28px] font-mono font-semibold text-white mt-2 mb-1 tabular-nums leading-tight"
            >
              {formatINR(metrics.totalRevenue, false)}
            </div>
            <div className="text-[11.5px] text-zinc-400">
              Counter sales, UPI &amp; wholesale orders
            </div>
          </div>

          {/* Card B: TOTAL COST */}
          <div className="card-obsidian rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                Total Cost (Spend)
              </span>
              <span className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5" />
              </span>
            </div>
            <div
              data-testid="insights-total-cost"
              className="text-[26px] sm:text-[28px] font-mono font-semibold text-white mt-2 mb-1 tabular-nums leading-tight"
            >
              <span data-testid="insights-total-spend">
                {formatINR(metrics.totalCost, false)}
              </span>
            </div>
            <div className="text-[11.5px] text-zinc-400">
              {metrics.confirmedCount} confirmed bills · Avg{' '}
              <strong data-testid="insights-average-receipt" className="text-zinc-200 font-mono">
                {formatINR(Math.round(metrics.averageReceipt), false)}
              </strong>
            </div>
          </div>

          {/* Card C: TOTAL PROFIT */}
          <div className="card-obsidian-elevated rounded-xl p-5 relative overflow-hidden border-emerald-500/30 bg-gradient-to-b from-[#18261F] to-[#141417]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300">
                Net Profit
              </span>
              <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold bg-emerald-400 text-zinc-950">
                {metrics.profitMarginPercent}% Margin
              </span>
            </div>
            <div
              data-testid="insights-total-profit"
              className="text-[26px] sm:text-[28px] font-mono font-bold text-emerald-400 mt-2 mb-1 tabular-nums leading-tight flex items-center gap-1"
            >
              <IndianRupee className="w-5 h-5 text-emerald-400 shrink-0 -mr-0.5" />
              <span>{formatINR(metrics.totalProfit, false).replace('₹', '')}</span>
            </div>
            <div className="text-[11.5px] text-zinc-400">
              Revenue ({formatINR(metrics.totalRevenue, false)}) − Cost (
              {formatINR(metrics.totalCost, false)})
            </div>
          </div>
        </div>

        {/* Interactive Financial Graph Card */}
        <div
          data-testid="interactive-financial-graph"
          className="card-obsidian rounded-xl p-5 sm:p-6"
        >
          <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap mb-5">
            <div>
              <h2 className="text-[15px] sm:text-[16px] font-medium text-white tracking-tight">
                Financial Performance · October 2026
              </h2>
              <p className="text-[11.5px] text-zinc-400 mt-0.5">
                Toggle series or select weekly column to inspect ledger breakdown
              </p>
            </div>

            {/* Interactive Series Toggle Buttons */}
            <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Toggle graph series">
              <button
                type="button"
                data-testid="toggle-series-revenue"
                onClick={() => {
                  playTactilePop();
                  setShowRevenueSeries((p) => !p);
                }}
                className={`btn-tactile-subtle px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-all flex items-center gap-1.5 ${
                  showRevenueSeries
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-white/[0.02] text-zinc-500 border-white/[0.06] opacity-60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Revenue</span>
                {showRevenueSeries && <Check className="w-3 h-3 text-emerald-400" />}
              </button>

              <button
                type="button"
                data-testid="toggle-series-cost"
                onClick={() => {
                  playTactilePop();
                  setShowCostSeries((p) => !p);
                }}
                className={`btn-tactile-subtle px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-all flex items-center gap-1.5 ${
                  showCostSeries
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-white/[0.02] text-zinc-500 border-white/[0.06] opacity-60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Cost</span>
                {showCostSeries && <Check className="w-3 h-3 text-amber-400" />}
              </button>

              <button
                type="button"
                data-testid="toggle-series-profit"
                onClick={() => {
                  playTactilePop();
                  setShowProfitSeries((p) => !p);
                }}
                className={`btn-tactile-subtle px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-all flex items-center gap-1.5 ${
                  showProfitSeries
                    ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                    : 'bg-white/[0.02] text-zinc-500 border-white/[0.06] opacity-60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span>Net Profit</span>
                {showProfitSeries && <Check className="w-3 h-3 text-teal-400" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Interactive Bar Chart Columns (8 cols) */}
            <div className="lg:col-span-8 bg-[#0E0E12] rounded-xl border border-white/[0.06] p-4 sm:p-5">
              <div className="grid grid-cols-4 gap-3 sm:gap-5 items-end h-[210px] pt-6 px-2 border-b border-white/[0.06]">
                {series.map((pt) => {
                  const isSelected = activePoint?.id === pt.id;
                  const revHeight = Math.max(8, Math.round((pt.revenue / maxSeriesVal) * 160));
                  const costHeight = Math.max(8, Math.round((pt.cost / maxSeriesVal) * 160));
                  const profitHeight = Math.max(
                    8,
                    Math.round((Math.abs(pt.profit) / maxSeriesVal) * 160)
                  );

                  return (
                    <button
                      key={pt.id}
                      type="button"
                      data-testid={`graph-period-${pt.id}`}
                      onClick={() => {
                        playTactileClick();
                        setSelectedPeriodId(pt.id);
                      }}
                      className={`btn-tactile-subtle group flex flex-col items-center justify-end h-full rounded-t-lg px-2 pt-2 transition-all cursor-pointer focus:outline-none ${
                        isSelected
                          ? 'bg-white/[0.06] ring-1 ring-white/20'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-end justify-center gap-1.5 sm:gap-2 w-full h-full">
                        {showRevenueSeries && (
                          <div
                            title={`Revenue: ${formatINR(pt.revenue, false)}`}
                            style={{ height: `${revHeight}px` }}
                            className="w-3 sm:w-4 rounded-t bg-emerald-500 transition-all duration-300 group-hover:bg-emerald-400"
                          />
                        )}
                        {showCostSeries && (
                          <div
                            title={`Cost: ${formatINR(pt.cost, false)}`}
                            style={{ height: `${costHeight}px` }}
                            className="w-3 sm:w-4 rounded-t bg-amber-500 transition-all duration-300 group-hover:bg-amber-400"
                          />
                        )}
                        {showProfitSeries && (
                          <div
                            title={`Profit: ${formatINR(pt.profit, false)}`}
                            style={{ height: `${profitHeight}px` }}
                            className="w-3 sm:w-4 rounded-t bg-teal-400 transition-all duration-300 group-hover:bg-teal-300"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="grid grid-cols-4 gap-3 sm:gap-5 pt-2.5 text-center">
                {series.map((pt) => {
                  const isSelected = activePoint?.id === pt.id;
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => {
                        playTactileClick();
                        setSelectedPeriodId(pt.id);
                      }}
                      className={`text-[11.5px] font-mono py-1 rounded transition-colors cursor-pointer ${
                        isSelected
                          ? 'text-white font-medium bg-white/[0.06]'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <div>{pt.shortLabel}</div>
                      <div className="text-[10px] text-zinc-500 hidden sm:block">{pt.dateRange}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Period Inspector Card (4 cols) */}
            {activePoint && (
              <div
                data-testid="graph-period-inspector"
                className="lg:col-span-4 bg-[#0E0E12] rounded-xl border border-white/[0.06] p-5 space-y-3.5"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                      Breakdown
                    </span>
                    <h3 className="text-[15px] font-medium text-white">
                      {activePoint.label}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-zinc-300 tabular-nums">
                    {activePoint.revenue > 0
                      ? `${Math.round((activePoint.profit / activePoint.revenue) * 100)}% Margin`
                      : '0%'}
                  </span>
                </div>

                <div className="space-y-2 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Revenue
                    </span>
                    <strong className="text-white font-mono tabular-nums">
                      {formatINR(activePoint.revenue, false)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Cost ({activePoint.receiptIds.length} bills)
                    </span>
                    <strong className="text-white font-mono tabular-nums">
                      {formatINR(activePoint.cost, false)}
                    </strong>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-zinc-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                      Net Profit
                    </span>
                    <strong className="text-[14px] font-mono text-emerald-400 tabular-nums">
                      {formatINR(activePoint.profit, false)}
                    </strong>
                  </div>
                </div>

                {activePoint.receiptIds.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="text-[10.5px] text-zinc-500 mb-1.5 font-mono">
                      Bills in {activePoint.label}:
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activePoint.receiptIds.map((id) => (
                        <span
                          key={id}
                          className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10.5px] font-mono text-zinc-300 tabular-nums"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Secondary KPI Row: Top Category & Duplicates Caught */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-obsidian rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="text-[12px] text-zinc-400 font-mono uppercase tracking-wider">Top expense category</div>
              <div className="text-[20px] font-medium text-white mt-1 leading-tight">
                {metrics.topCategory ? metrics.topCategory.category : '—'}
              </div>
            </div>
            <div className="text-right text-[12px] font-mono text-zinc-400 tabular-nums">
              {metrics.topCategory
                ? `${formatINR(metrics.topCategory.amount, false)} · ${metrics.topCategory.percentage}%`
                : 'No confirmed spend'}
            </div>
          </div>

          <div className="card-obsidian rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="text-[12px] text-zinc-400 font-mono uppercase tracking-wider">Duplicates caught</div>
              <div className="text-[22px] font-mono font-semibold text-rose-400 mt-1 tabular-nums leading-tight">
                {metrics.duplicateCount}
              </div>
            </div>
            <div className="text-right text-[12px] font-mono text-zinc-500">
              {metrics.duplicateHoldingIds.length > 0
                ? `${metrics.duplicateHoldingIds.join(', ')} held`
                : 'None held'}
            </div>
          </div>
        </div>

        {/* Bottom Bento: Spend by category (Left 7) & Ask records (Right 5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT: Category Breakdown */}
          <div className="lg:col-span-7 card-obsidian rounded-xl p-5 sm:p-6 flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <h2 className="text-[15px] font-medium text-white tracking-tight">Spend by category</h2>
                <span className="text-[11.5px] text-zinc-500 font-mono">
                  Click category to filter records
                </span>
              </div>

              <div className="space-y-4">
                {metrics.categoryBreakdown.map((item) => {
                  const widthPct =
                    maxCategoryAmount > 0
                      ? Math.max(6, Math.round((item.amount / maxCategoryAmount) * 100))
                      : 0;

                  return (
                    <button
                      key={item.category}
                      type="button"
                      onClick={() => {
                        playTactileClick();
                        onSelectCategoryForRecords(item.category);
                      }}
                      className="btn-tactile-subtle w-full text-left group cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[item.category] || '#10B981',
                            }}
                          />
                          <span className="text-zinc-200 group-hover:text-white transition-colors">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-zinc-400 font-mono tabular-nums text-[12px]">
                          <strong className="text-zinc-200 font-normal">
                            {formatINR(item.amount, false)}
                          </strong>{' '}
                          <span className="text-zinc-600">·</span> {item.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          data-testid={`category-bar-${item.category}`}
                          className="h-full rounded-full transition-all duration-300 bg-emerald-500 group-hover:bg-emerald-400"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Ask Your Records */}
          <div className="lg:col-span-5 card-obsidian rounded-xl p-5 sm:p-6 flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h2 className="text-[15px] font-medium text-white tracking-tight">
                  Ask your records
                </h2>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {chatMessages.map((msg) =>
                  msg.role === 'user' ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="inline-block bg-white/[0.08] text-white text-[12.5px] px-3.5 py-2 rounded-lg border border-white/[0.06]">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={msg.id}
                      className="bg-[#0E0E12] rounded-lg p-3 text-[12.5px] text-zinc-300 leading-relaxed border border-white/[0.05]"
                    >
                      <p>{msg.text}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10.5px] font-mono text-zinc-500">Sources:</span>
                          {msg.sources.map((srcId) => (
                            <span
                              key={srcId}
                              className="px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06] text-[10.5px] font-mono tabular-nums"
                            >
                              {srcId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            <form onSubmit={handleSendQuestion} className="mt-4">
              <div className="relative flex items-center">
                <input
                  type="text"
                  aria-label="Ask about your spending"
                  placeholder="Ask about profit, revenue, or bills..."
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0E0E12] pl-3.5 pr-12 py-2 text-[12.5px] text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="btn-tactile absolute right-2 text-zinc-400 hover:text-white p-1 rounded cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
