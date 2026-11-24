import React from 'react';

export const PRODUCT_HUNT_URL =
  'https://www.producthunt.com/products/spacetabs-tab-manager?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-spacetabs-tab-manager';

const BADGE_SOURCES = {
  light:
    'https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1327375&theme=light&t=1795502045284',
  neutral:
    'https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1327375&theme=neutral&t=1795502066333',
  dark:
    'https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1327375&theme=dark&t=1795502083139',
} as const;

interface ProductHuntBadgeProps {
  isLight: boolean;
  variant?: 'auto' | 'light' | 'neutral' | 'dark';
  className?: string;
}

export const ProductHuntBadge: React.FC<ProductHuntBadgeProps> = ({
  isLight,
  variant = 'auto',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const resolvedTheme =
    variant === 'auto' ? (isLight ? 'light' : 'dark') : variant;
  const imgSrc = BADGE_SOURCES[resolvedTheme];

  return (
    <a
      href={PRODUCT_HUNT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-[0.99] ${className}`}
      title="Find SpaceTabs — Tab Manager on Product Hunt"
    >
      {!imgFailed ? (
        <img
          alt="SpaceTabs — Tab Manager - Local-first, unlimited Chrome tab & workspace manager | Product Hunt"
          width={250}
          height={54}
          src={imgSrc}
          onError={() => setImgFailed(true)}
          className="h-[54px] w-[250px] block select-none"
        />
      ) : (
        <div
          className={`w-[250px] h-[54px] rounded-xl border px-3.5 flex items-center justify-between shadow-sm ${
            isLight
              ? 'bg-white border-[#ff6154]/40 text-slate-900'
              : 'bg-slate-900 border-[#ff6154]/40 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#ff6154] text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0">
              P
            </span>
            <div className="text-left leading-tight">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#ff6154]">
                Find us on
              </div>
              <div className="text-sm font-extrabold">Product Hunt</div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center text-[#ff6154] font-bold text-xs">
            <span>▲</span>
          </div>
        </div>
      )}
    </a>
  );
};
