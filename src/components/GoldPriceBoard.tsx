import React from 'react';
import { GoldPriceItem, GoldPurity } from '../types/gold';
import { formatMYR } from '../utils/calculator';

interface GoldPriceBoardProps {
  prices: Record<GoldPurity, GoldPriceItem>;
  selectedPurity: GoldPurity;
  onSelectPurity: (purity: GoldPurity) => void;
  onOpenCalculator?: () => void;
  isCalculatorOpen?: boolean;
}

export const GoldPriceBoard: React.FC<GoldPriceBoardProps> = ({
  prices,
  selectedPurity,
  onSelectPurity,
  onOpenCalculator,
  isCalculatorOpen = false,
}) => {
  const purities: GoldPurity[] = ['999', '916', '375'];

  // Homepage prices are shown in whole ringgit when there are no sen.
  // e.g. RM 350.00 -> RM 350, but RM 350.50 stays as is.
  const formatBoardPrice = (amount: number) =>
    formatMYR(amount).replace(/\.00$/, '');

  const handleCardClick = (purity: GoldPurity) => {
    onSelectPurity(purity);
    if (!isCalculatorOpen) {
      onOpenCalculator?.();
    }
  };

  return (
    <section aria-label="Papan Tanda Harga Emas Semasa" className="w-full">
      <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
        {purities.map((purity) => {
          const item = prices[purity] || {
            purity,
            label: `Emas ${purity}`,
            karat: purity === '999' ? '24K' : purity === '916' ? '22K' : '9K',
            fineness: purity === '999' ? '99.9%' : purity === '916' ? '91.6%' : '37.5%',
            sellPrice: 0,
            buyPrice: 0,
            previousSellPrice: 0,
            updatedAt: new Date().toISOString(),
          };

          const isSelected = selectedPurity === purity;
          const isMainItem = purity === '916';

          return (
            <div
              key={purity}
              onClick={() => handleCardClick(purity)}
              className={`${isMainItem ? 'gr-card-gold' : 'gr-card-light'} border transition-all cursor-pointer flex flex-col justify-between ${
                isCalculatorOpen ? 'p-2 sm:p-3.5' : 'p-2.5 sm:p-4 lg:p-5'
              } ${
                isSelected
                  ? isMainItem
                    ? 'border-maroon-deep/60 ring-2 ring-maroon-deep/30 shadow-[0_14px_30px_-18px_rgba(59,7,7,0.45)]'
                    : 'border-gold-deep/60 ring-2 ring-gold/50 shadow-[0_14px_30px_-18px_rgba(138,95,20,0.45)]'
                  : isMainItem
                    ? 'border-gold-deep/50 hover:border-maroon-deep/50 hover:-translate-y-0.5'
                    : 'border-line/15 hover:border-gold-deep/40 hover:-translate-y-0.5'
              }`}
            >
              {/* 1. GRED EMAS */}
              <div>
                <div className="flex items-center justify-between gap-1 sm:gap-2">
                  <span className="font-serif font-black tracking-wide text-maroon-deep text-lg leading-none sm:text-2xl lg:text-3xl">
                    {purity}
                  </span>
                  <span className="text-[8px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-maroon-deep text-gold whitespace-nowrap">
                    {item.karat}
                  </span>
                </div>
              </div>

              {/* 2. HARGA PER GRAM (JUAL) */}
              <div className={isCalculatorOpen ? 'my-1.5 sm:my-2' : 'my-2 sm:my-3 lg:my-3.5'}>
                <div className="flex items-baseline gap-1 sm:gap-1.5 flex-wrap">
                  <span className={`font-black tracking-tight font-sans leading-none ${
                    isMainItem ? 'text-maroon-deep' : 'text-gold-deep'
                  } ${
                    isCalculatorOpen ? 'text-sm sm:text-xl lg:text-3xl' : 'text-base sm:text-2xl lg:text-4xl'
                  }`}>
                    {formatBoardPrice(item.sellPrice)}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] lg:text-xs font-medium whitespace-nowrap ${
                    isMainItem ? 'text-maroon-deep/70' : 'text-maroon/50'
                  }`}>/ gram</span>
                </div>
              </div>

              {/* 3. HARGA BELI */}
              <div className={`border-t pt-1.5 sm:pt-2.5 flex flex-wrap items-baseline justify-between gap-x-1 gap-y-0.5 leading-tight ${
                isMainItem ? 'border-maroon-deep/25' : 'border-line/15'
              }`}>
                <span className={`text-[9px] sm:text-xs font-medium ${
                  isMainItem ? 'text-maroon-deep/75' : 'text-maroon/60'
                }`}>Harga Beli:</span>
                <span className="font-bold text-maroon-deep font-mono text-[10px] sm:text-sm lg:text-base whitespace-nowrap">
                  {formatBoardPrice(item.buyPrice)}{' '}
                  <span className={`text-[8px] sm:text-[11px] font-normal ${
                    isMainItem ? 'text-maroon-deep/70' : 'text-maroon/50'
                  }`}>/g</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
