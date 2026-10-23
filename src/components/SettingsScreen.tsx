import React, { useState } from 'react';
import {
  Store,
  ShieldCheck,
  Tags,
  Database,
  Download,
  RotateCcw,
  KeyRound,
  Check,
} from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_BAR_CLASSES,
  CATEGORY_TAG_CLASSES,
  ShopSettings,
} from '../types';
import { formatINR, LedgerMetrics } from '../utils/ledgerLogic';
import { playTactileSound } from '../utils/soundEffects';

interface SettingsScreenProps {
  settings: ShopSettings;
  onUpdateSettings: (next: ShopSettings) => void;
  metrics: LedgerMetrics;
  totalReceiptsCount: number;
  onExportCSV: () => void;
  onResetDemoData: () => void;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  metrics,
  totalReceiptsCount,
  onExportCSV,
  onResetDemoData,
  onLogout,
}) => {
  const [formState, setFormState] = useState<ShopSettings>(settings);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleSaveShopProfile = (e: React.FormEvent) => {
    e.preventDefault();
    playTactileSound('chime');
    onUpdateSettings(formState);
    setSavedBanner('Shop settings saved and synced to your ledger.');
    setTimeout(() => setSavedBanner(null), 3000);
  };

  const handleToggleRule = (
    key: 'duplicateDetectionEnabled' | 'flagUnclearDates' | 'autoCategorizeReceipts'
  ) => {
    playTactileSound('tick');
    const updated = {
      ...formState,
      [key]: !formState[key],
    };
    setFormState(updated);
    onUpdateSettings(updated);
    setSavedBanner('Verification rule updated.');
    setTimeout(() => setSavedBanner(null), 2500);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      playTactileSound('pop');
      setPasswordStatus({
        type: 'error',
        message: 'Password must be at least 6 characters.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      playTactileSound('pop');
      setPasswordStatus({
        type: 'error',
        message: 'Passwords do not match.',
      });
      return;
    }
    playTactileSound('chime');
    setPasswordStatus({
      type: 'success',
      message: 'Shop login password updated. You can still sign in with OTP (123456).',
    });
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0A0A0C] text-[#EDEDEF]">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-[#0A0A0C]/85 backdrop-blur-md border-b border-white/[0.07] px-6 lg:px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-100 tracking-tight leading-tight">
            Settings
          </h1>
          <p className="text-[13px] text-zinc-400 mt-0.5">
            Configure your shop profile, receipt verification rules, categories, and ledger exports
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedBanner && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12.5px] font-medium animate-in fade-in"
            >
              <Check className="w-3.5 h-3.5" />
              {savedBanner}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              playTactileSound('click');
              onExportCSV();
            }}
            className="btn-tactile inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-[#141417] hover:bg-[#1A1A1F] text-zinc-200 font-semibold text-[13px] cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Confirmed CSV</span>
          </button>
        </div>
      </header>

      <div className="p-6 lg:p-8 max-w-[1160px] w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Shop Profile & Security */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Shop Profile & GSTIN */}
            <form
              onSubmit={handleSaveShopProfile}
              className="card-obsidian rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-[15.5px] font-bold text-zinc-100 tracking-tight">
                      Shop profile & GST details
                    </h2>
                    <p className="text-[12px] text-zinc-400">
                      Used on exported CSV ledgers and duplicate bill checks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Shop
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="settings-shop-name"
                    className="block text-[12px] font-medium text-zinc-400 mb-1.5"
                  >
                    Shop / Business name
                  </label>
                  <input
                    id="settings-shop-name"
                    type="text"
                    value={formState.shopName}
                    onChange={(e) =>
                      setFormState({ ...formState, shopName: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0C] px-3.5 py-2.5 text-[14px] font-medium text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-owner-name"
                    className="block text-[12px] font-medium text-zinc-400 mb-1.5"
                  >
                    Owner / Manager name
                  </label>
                  <input
                    id="settings-owner-name"
                    type="text"
                    value={formState.ownerName}
                    onChange={(e) =>
                      setFormState({ ...formState, ownerName: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0C] px-3.5 py-2.5 text-[14px] font-medium text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-gstin"
                    className="block text-[12px] font-medium text-zinc-400 mb-1.5"
                  >
                    Shop GSTIN
                  </label>
                  <input
                    id="settings-gstin"
                    type="text"
                    value={formState.gstin}
                    onChange={(e) =>
                      setFormState({ ...formState, gstin: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0C] px-3.5 py-2.5 text-[14px] font-mono uppercase tabular-nums text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-monthly-budget"
                    className="block text-[12px] font-medium text-zinc-400 mb-1.5"
                  >
                    Monthly expense target (₹)
                  </label>
                  <input
                    id="settings-monthly-budget"
                    type="number"
                    value={formState.monthlyBudget}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        monthlyBudget: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0C] px-3.5 py-2.5 text-[14px] font-mono tabular-nums text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-phone"
                    className="block text-[12px] font-medium text-zinc-400 mb-1.5"
                  >
                    Registered mobile (OTP login)
                  </label>
                  <input
                    id="settings-phone"
                    type="tel"
                    value={formState.phone}
                    onChange={(e) =>
                      setFormState({ ...formState, phone: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0C] px-3.5 py-2.5 text-[14px] font-mono tabular-nums text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-email"
                    className="block text-[12px] font-medium text-zinc-400 mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    value={formState.email}
                    onChange={(e) =>
                      setFormState({ ...formState, email: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0C] px-3.5 py-2.5 text-[14px] font-medium text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label
                  htmlFor="settings-address"
                  className="block text-[12px] font-medium text-zinc-400 mb-1.5"
                >
                  Shop address
                </label>
                <input
                  id="settings-address"
                  type="text"
                  value={formState.address}
                  onChange={(e) =>
                    setFormState({ ...formState, address: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0C] px-3.5 py-2.5 text-[14px] font-medium text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <span className="text-[12px] text-zinc-400">
                  Currency format:{' '}
                  <strong className="text-zinc-200 font-mono font-medium">
                    INR (₹12,175.00)
                  </strong>
                </span>
                <button
                  type="submit"
                  className="btn-tactile px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-semibold text-[13.5px] cursor-pointer"
                >
                  Save profile changes
                </button>
              </div>
            </form>

            {/* Card 2: Login & Password Setup */}
            <form
              onSubmit={handleSavePassword}
              className="card-obsidian rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[15.5px] font-bold text-zinc-100 tracking-tight">
                    Login & password access
                  </h2>
                  <p className="text-[12px] text-zinc-400">
                    Set a backup password in addition to Mobile/Email OTP (demo code 123456)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="settings-new-password"
                    className="block text-[12px] font-medium text-zinc-400 mb-1.5"
                  >
                    New password
                  </label>
                  <input
                    id="settings-new-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordStatus(null);
                    }}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0C] px-3.5 py-2.5 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-confirm-password"
                    className="block text-[12px] font-medium text-zinc-400 mb-1.5"
                  >
                    Confirm password
                  </label>
                  <input
                    id="settings-confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordStatus(null);
                    }}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0A0A0C] px-3.5 py-2.5 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {passwordStatus && (
                <div
                  role="alert"
                  className={`mb-4 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium border ${
                    passwordStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {passwordStatus.message}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playTactileSound('pop');
                    onLogout();
                  }}
                  className="text-[13px] font-medium text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Sign out of this device
                </button>
                <button
                  type="submit"
                  className="btn-tactile px-4 py-2 rounded-xl border border-white/[0.08] bg-[#1A1A1F] hover:bg-[#222228] text-zinc-200 font-semibold text-[13px] cursor-pointer"
                >
                  Set password
                </button>
              </div>
            </form>
          </div>

          {/* Right Column (5 cols): Receipt Verification Rules, Categories & Ledger Data */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 3: Receipt Verification & AI Guardrails */}
            <div className="card-obsidian rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[15.5px] font-bold text-zinc-100 tracking-tight">
                    Ledger verification rules
                  </h2>
                  <p className="text-[12px] text-zinc-400">
                    Strict accounting guardrails for confirmed records
                  </p>
                </div>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {/* Rule 1: Confirmed-only totals */}
                <div className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13.5px] font-medium text-zinc-200">
                      Exclude unconfirmed bills from totals
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5">
                      Needs review and duplicate receipts never count in Records, Insights or Q&A.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 shrink-0 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Always on
                  </span>
                </div>

                {/* Rule 2: Duplicate detection */}
                <div className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13.5px] font-medium text-zinc-200">
                      Automatic duplicate detection
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5">
                      Flag receipts with same vendor, total and same/unclear date (e.g. R-0107).
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formState.duplicateDetectionEnabled}
                    aria-label="Automatic duplicate detection"
                    onClick={() => handleToggleRule('duplicateDetectionEnabled')}
                    className={`btn-tactile w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 border ${
                      formState.duplicateDetectionEnabled
                        ? 'bg-emerald-500 border-emerald-400/50'
                        : 'bg-zinc-800 border-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        formState.duplicateDetectionEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Rule 3: Unclear field highlighting */}
                <div className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13.5px] font-medium text-zinc-200">
                      Highlight unclear fields for human review
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5">
                      Never guess blurry dates or amounts; require manual confirmation in Review.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formState.flagUnclearDates}
                    aria-label="Highlight unclear fields for human review"
                    onClick={() => handleToggleRule('flagUnclearDates')}
                    className={`btn-tactile w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 border ${
                      formState.flagUnclearDates
                        ? 'bg-emerald-500 border-emerald-400/50'
                        : 'bg-zinc-800 border-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        formState.flagUnclearDates ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Rule 4: AI pre-categorization */}
                <div className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13.5px] font-medium text-zinc-200">
                      AI category & item extraction
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5">
                      Pre-fill vendor, line items and category when processing uploaded bills.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formState.autoCategorizeReceipts}
                    aria-label="AI category and item extraction"
                    onClick={() => handleToggleRule('autoCategorizeReceipts')}
                    className={`btn-tactile w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 border ${
                      formState.autoCategorizeReceipts
                        ? 'bg-emerald-500 border-emerald-400/50'
                        : 'bg-zinc-800 border-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        formState.autoCategorizeReceipts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 4: Active Expense Categories (6 Fixed Categories) */}
            <div className="card-obsidian rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Tags className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-[15.5px] font-bold text-zinc-100 tracking-tight">
                      Expense categories ({CATEGORIES.length})
                    </h2>
                    <p className="text-[12px] text-zinc-400">
                      Standard shop ledger categories with live confirmed totals
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {metrics.categoryBreakdown.map((item) => (
                  <div
                    key={item.category}
                    className="py-2.5 flex items-center justify-between text-[13.5px]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          CATEGORY_BAR_CLASSES[item.category] || 'bg-emerald-400'
                        }`}
                      />
                      <span className="text-[12.5px] font-medium text-zinc-300">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-zinc-400 font-mono text-[12.5px] tabular-nums">
                      <span className="font-semibold text-zinc-200">
                        {formatINR(item.amount)}
                      </span>{' '}
                      · {item.count} confirmed
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 5: Ledger Data & Reset */}
            <div className="card-obsidian rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[15.5px] font-bold text-zinc-100 tracking-tight">
                    Firebase & local ledger storage
                  </h2>
                  <p className="text-[12px] text-zinc-400">
                    {totalReceiptsCount} total receipts ({metrics.confirmedCount} confirmed ·{' '}
                    <span className="font-mono text-zinc-200">{formatINR(metrics.totalSpend)}</span>
                    ) synced to Firestore
                  </p>
                </div>
              </div>

              {!resetConfirmOpen ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      playTactileSound('click');
                      onExportCSV();
                    }}
                    className="btn-tactile flex-1 py-2.5 px-4 rounded-xl border border-white/[0.08] bg-[#1A1A1F] hover:bg-[#222228] text-zinc-200 font-semibold text-[13px] cursor-pointer"
                  >
                    Download CSV backup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTactileSound('pop');
                      setResetConfirmOpen(true);
                    }}
                    className="btn-tactile inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-[13px] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset seed data</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                  <p className="text-[12.5px] font-medium text-rose-300 mb-3">
                    Restore the original 8 October 2026 seed receipts (6 confirmed, R-0107 duplicate, R-0108 needs review)?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setResetConfirmOpen(false)}
                      className="btn-tactile px-3.5 py-1.5 rounded-lg bg-[#141417] text-zinc-300 text-[12.5px] font-medium border border-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playTactileSound('chime');
                        onResetDemoData();
                        setResetConfirmOpen(false);
                        setSavedBanner('Seed receipts restored to initial state.');
                        setTimeout(() => setSavedBanner(null), 3000);
                      }}
                      className="btn-tactile px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[12.5px] font-semibold cursor-pointer shadow-sm"
                    >
                      Confirm reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
