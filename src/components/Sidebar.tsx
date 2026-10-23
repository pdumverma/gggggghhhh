import React, { useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  FileCheck2,
  FileSpreadsheet,
  BarChart3,
  Settings,
  LogOut,
  Globe,
  PlusCircle,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AppSection, LanguageCode, LanguageOption } from '../types';
import { getTranslations, LANGUAGE_OPTIONS } from '../i18n';
import { BrandWordmark } from './BrandWordmark';
import { isSoundMuted, playTactileClick, playTactilePop, toggleSoundMuted } from '../utils/soundEffects';

interface SidebarProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  reviewBadgeCount: number;
  shopName: string;
  onLogout: () => void;
  language: LanguageCode;
  onChangeLanguage: (option: LanguageOption) => void;
  onOpenQuickAdd?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  reviewBadgeCount,
  shopName,
  onLogout,
  language,
  onChangeLanguage,
  onOpenQuickAdd,
}) => {
  const t = getTranslations(language);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('shopledger_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [soundMuted, setSoundMutedState] = useState<boolean>(isSoundMuted());

  const handleToggleCollapse = () => {
    playTactilePop();
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('shopledger_sidebar_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const handleToggleSound = () => {
    const nextMuted = toggleSoundMuted();
    setSoundMutedState(nextMuted);
  };

  const mainNavItems: {
    section: AppSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    hotkey: string;
  }[] = [
    { section: 'Scan', label: t.navScan, icon: Camera, hotkey: '1' },
    { section: 'Upload', label: t.navUpload, icon: Upload, hotkey: '2' },
    { section: 'Review', label: t.navReview, icon: FileCheck2, hotkey: '3' },
    { section: 'Records', label: t.navRecords, icon: FileSpreadsheet, hotkey: '4' },
    { section: 'Insights', label: t.navInsights, icon: BarChart3, hotkey: '5' },
    { section: 'Settings', label: t.navSettings, icon: Settings, hotkey: '6' },
  ];

  // Hotkey navigation listener: 1-6
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const item = mainNavItems.find((n) => n.hotkey === e.key);
        if (item) {
          e.preventDefault();
          playTactileClick();
          onSelectSection(item.section);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mainNavItems, onSelectSection]);

  return (
    <>
      {/* Mobile Top Bar (< 768px) */}
      <header
        data-testid="mobile-top-bar"
        className="md:hidden sticky top-0 z-30 w-full bg-[#0A0A0C]/90 backdrop-blur-md border-b border-white/[0.07] px-3.5 py-2.5 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-[13px] shrink-0">
            <span>S</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0A0A0C]" />
          </div>
          <div className="min-w-0">
            <BrandWordmark size="sm" />
            <div className="text-[10px] text-zinc-400 truncate leading-none mt-0.5">
              {shopName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenQuickAdd && (
            <button
              type="button"
              onClick={() => {
                playTactileClick();
                onOpenQuickAdd();
              }}
              data-testid="mobile-quick-add-btn"
              className="btn-tactile px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-semibold flex items-center gap-1 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Bill</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleSound}
            title={soundMuted ? 'Unmute tactile audio' : 'Mute tactile audio'}
            aria-label="Toggle tactile sounds"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <select
            aria-label="Mobile change language"
            value={language}
            onChange={(e) => {
              playTactilePop();
              const found = LANGUAGE_OPTIONS.find((o) => o.code === e.target.value);
              if (found) onChangeLanguage(found);
            }}
            className="bg-[#141417] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-200 focus:border-white/20 focus:outline-none"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.displayScript}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Desktop & Tablet Obsidian Dock (>= 768px) */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 bg-[#0E0E12] border-r border-white/[0.07] min-h-screen select-none transition-all duration-200 ease-in-out relative ${
          isCollapsed ? 'w-[72px]' : 'w-[244px] lg:w-[252px]'
        }`}
      >
        <div>
          {/* Header & Logo */}
          <div className={`pt-5 pb-4 flex items-center justify-between ${isCollapsed ? 'px-3 justify-center' : 'px-4'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-[14px] shrink-0 shadow-xs">
                <span>S</span>
                <span
                  data-testid="sidebar-logo-haldi-dot"
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0E0E12]"
                />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <BrandWordmark size="sm" />
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {shopName}
                  </div>
                </div>
              )}
            </div>

            {/* Dock Collapse Toggle */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              title={isCollapsed ? 'Expand dock' : 'Collapse to slim dock'}
              aria-label={isCollapsed ? 'Expand dock' : 'Collapse to slim dock'}
              className="hidden lg:flex p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* One-Tap Quick Add Record CTA */}
          {onOpenQuickAdd && (
            <div className={`pb-3 ${isCollapsed ? 'px-2' : 'px-3.5'}`}>
              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  onOpenQuickAdd();
                }}
                data-testid="sidebar-quick-add-btn"
                title={isCollapsed ? 'Add Bill (One-Tap)' : undefined}
                className={`btn-tactile w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-[12.5px] shadow-[0_2px_10px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 cursor-pointer ${
                  isCollapsed ? 'px-0' : 'px-3'
                }`}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>One-Tap Add Record</span>}
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav aria-label="Main navigation" className="px-2 space-y-1">
            {mainNavItems.map(({ section, label, icon: Icon, hotkey }) => {
              const isActive = activeSection === section;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => {
                    playTactileClick();
                    onSelectSection(section);
                  }}
                  title={isCollapsed ? `${label} (${hotkey})` : undefined}
                  className={`btn-tactile-subtle group relative w-full flex items-center rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                    isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-xs'
                      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {section === 'Review' && reviewBadgeCount > 0 && (
                        <span
                          data-testid="review-count-badge"
                          aria-label={`${reviewBadgeCount} receipts need review`}
                          className="px-1.5 py-0.2 text-[10.5px] font-mono font-semibold rounded-full tabular-nums bg-amber-400 text-zinc-950"
                        >
                          {reviewBadgeCount}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-400 px-1 py-0.5 rounded border border-white/[0.05] bg-white/[0.02]">
                        {hotkey}
                      </span>
                    </div>
                  )}

                  {/* Dot badge on collapsed mode */}
                  {isCollapsed && section === 'Review' && reviewBadgeCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0E0E12]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Mute Toggle, Language, Logout */}
        <div className={`p-2.5 border-t border-white/[0.07] space-y-2 ${isCollapsed ? 'items-center' : ''}`}>
          {/* Audio & Haptic Feedback Switcher */}
          <div
            className={`flex items-center rounded-lg bg-white/[0.03] border border-white/[0.06] ${
              isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5'
            }`}
          >
            {!isCollapsed && (
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Tactile Sound</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleToggleSound}
              title={soundMuted ? 'Enable tactile click sounds' : 'Mute tactile sounds'}
              aria-label="Toggle sound effects"
              className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>

          {/* Language Switcher */}
          {!isCollapsed ? (
            <div className="px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <label
                htmlFor="sidebar-language-select"
                className="flex items-center gap-1.5 text-[10.5px] font-medium text-zinc-400 mb-1"
              >
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>{t.languageLabel}</span>
              </label>
              <select
                id="sidebar-language-select"
                aria-label="Change language"
                value={language}
                onChange={(e) => {
                  playTactilePop();
                  const found = LANGUAGE_OPTIONS.find((o) => o.code === e.target.value);
                  if (found) onChangeLanguage(found);
                }}
                className="w-full bg-[#141417] border border-white/[0.08] rounded-md px-2 py-1 text-[11.5px] font-medium text-zinc-200 focus:border-white/20 focus:outline-none cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.displayScript}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                playTactilePop();
                const currIdx = LANGUAGE_OPTIONS.findIndex((o) => o.code === language);
                const next = LANGUAGE_OPTIONS[(currIdx + 1) % LANGUAGE_OPTIONS.length];
                onChangeLanguage(next);
              }}
              title={`Switch language (current: ${language})`}
              className="btn-tactile-subtle w-full flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"
            >
              <Globe className="w-4 h-4" />
            </button>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={() => {
              playTactileClick();
              onLogout();
            }}
            title={isCollapsed ? t.navLogout : undefined}
            className={`btn-tactile-subtle w-full flex items-center rounded-lg text-[12.5px] font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span>{t.navLogout}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Dock (< 768px) */}
      <nav
        aria-label="Mobile bottom navigation"
        data-testid="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0E0E12]/95 backdrop-blur-md border-t border-white/[0.07] px-1 py-1 grid grid-cols-6 gap-0.5"
      >
        {mainNavItems.map(({ section, label, icon: Icon }) => {
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              type="button"
              onClick={() => {
                playTactileClick();
                onSelectSection(section);
              }}
              className={`btn-tactile-subtle relative flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
              <span className="text-[9.5px] leading-tight mt-0.5 truncate max-w-full">
                {label}
              </span>
              {section === 'Review' && reviewBadgeCount > 0 && (
                <span className="absolute top-0.5 right-1 px-1 min-w-[14px] h-[14px] text-[8.5px] font-mono font-bold rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center">
                  {reviewBadgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
