import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface InventoryItemImageProps {
  item: { name: string; label?: string; image?: string };
  className?: string;
}

/**
 * Resolves an inventory item's icon from whichever inventory resource is
 * actually serving images (ox_inventory, then qb-inventory), falling back to
 * a neutral placeholder. Deliberately never falls back to an external CDN url,
 * NUI blocks those hosts, so a raw.githubusercontent.com/flaticon.com
 * fallback just renders a broken image in-game.
 */
export const InventoryItemImage: React.FC<InventoryItemImageProps> = ({ item, className }) => {
  const [src, setSrc] = useState(() => {
    if (item.image && item.image.includes('://') && !item.image.includes('nui://')) return item.image;
    return `nui://ox_inventory/web/images/${item.name}.png`;
  });
  const [fallbackStep, setFallbackStep] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        title={`${item.label || item.name} (no image)`}
        className={cn(className ?? 'w-10 h-10', 'flex items-center justify-center text-red-400/60')}
      >
        <X className="w-[90%] h-[90%]" strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={item.label || item.name}
      className={className ?? 'w-10 h-10 object-contain'}
      onError={() => {
        if (fallbackStep === 0) {
          setSrc(`nui://qb-inventory/html/images/${item.name}.png`);
          setFallbackStep(1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
};
