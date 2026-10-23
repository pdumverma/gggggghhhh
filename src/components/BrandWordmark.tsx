import React from 'react';

interface BrandWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  showIcon?: boolean;
  dotTestId?: string;
}

/**
 * Ultra-minimalist, high-end brand wordmark for "ShopLedger"
 * Styled with crisp typography, subtle emerald accent, and obsidian elevation.
 */
export const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  size = 'md',
  subtitle,
  showIcon = false,
  dotTestId = 'logo-haldi-dot',
}) => {
  const textSizeClass =
    size === 'lg'
      ? 'text-[22px] tracking-tight'
      : size === 'sm'
      ? 'text-[15px] tracking-tight'
      : 'text-[17px] tracking-tight';

  const iconSizeClass =
    size === 'lg'
      ? 'w-8 h-8 rounded-lg text-[15px]'
      : size === 'sm'
      ? 'w-6 h-6 rounded-[7px] text-[12px]'
      : 'w-7 h-7 rounded-[8px] text-[13px]';

  return (
    <div className="inline-flex items-center gap-2.5 select-none min-w-0">
      {showIcon && (
        <div
          className={`relative ${iconSizeClass} bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-emerald-400 font-bold shrink-0 shadow-xs`}
        >
          <span>S</span>
          <span
            data-testid={dotTestId}
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0A0A0C]"
          />
        </div>
      )}
      <div className="min-w-0">
        <div
          data-testid="colorful-brand-wordmark"
          aria-label="ShopLedger"
          className={`${textSizeClass} font-semibold text-white inline-flex items-baseline whitespace-nowrap`}
        >
          <span>Shop</span>
          <span className="text-zinc-400 font-normal">Ledger</span>
          <span className="ml-1 text-[10px] font-mono font-medium px-1.5 py-0.2 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            PRO
          </span>
        </div>
        {subtitle && (
          <div className="text-[11px] text-zinc-400 truncate font-normal">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
