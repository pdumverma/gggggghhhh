import React from 'react';
import { LANGUAGE_OPTIONS } from '../i18n';
import { LanguageCode, LanguageOption } from '../types';
import { BrandWordmark } from './BrandWordmark';
import { playTactileClick, playTactilePop } from '../utils/soundEffects';

interface LanguageSelectionScreenProps {
  selectedLanguage: LanguageCode;
  onSelectLanguage: (option: LanguageOption) => void;
}

export const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({
  selectedLanguage,
  onSelectLanguage,
}) => {
  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center px-4 py-8 sm:py-10 text-zinc-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 ambient-glow-emerald" />

      <div className="w-full max-w-[880px] card-obsidian-elevated rounded-2xl p-6 sm:p-10 relative z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <BrandWordmark size="md" showIcon={true} />
        </div>

        <h1 className="text-[20px] sm:text-[24px] font-semibold text-white text-center tracking-tight leading-tight">
          Choose your language / अपनी भाषा चुनें
        </h1>
        <p className="text-[12px] sm:text-[13px] text-zinc-400 text-center mt-1.5 mb-6 sm:mb-8 font-mono">
          Select language for bills, speech input, and ledger analytics
        </p>

        {/* Tactile language grid */}
        <div
          role="group"
          aria-label="Choose your language"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = selectedLanguage === option.code;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  playTactileClick();
                  onSelectLanguage(option);
                }}
                className={`btn-tactile text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[82px] sm:min-h-[88px] group ${
                  isSelected
                    ? 'border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                    : 'border-white/[0.07] bg-[#0E0E12] hover:border-white/20 hover:bg-[#141417]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] sm:text-[16px] font-medium text-white group-hover:text-emerald-400 transition-colors">
                    {option.displayScript}
                  </span>
                  <span className="text-[10.5px] font-mono text-zinc-500 tabular-nums">
                    {option.speechCode}
                  </span>
                </div>
                <span className="text-[11.5px] text-zinc-400 mt-2 leading-snug">
                  {option.sampleGreeting}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
