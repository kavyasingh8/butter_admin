import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAdminMenu } from '../../../../../providers/AdminMenuContext';
import { InventoryItem } from '../../../../../types';
import { InventoryItemImage } from '../../../../ui/InventoryItemImage';
import { CopyButton } from '../../../../ui/CopyButton';
import { Button, Field, Label, Panel, PanelHeader, Section, inputClass } from '../../ui';

/** Lua encodes an empty table as [], so anything that is not a plain object counts as no metadata. */
export const metadataEntries = (item: InventoryItem): [string, unknown][] => {
  const { metadata } = item;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  return Object.entries(metadata);
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

interface ItemInspectorProps {
  item: InventoryItem;
  onClose: () => void;
  onRemove: (count: number) => void;
}

export const ItemInspector: React.FC<ItemInspectorProps> = ({ item, onClose, onRemove }) => {
  const { t } = useAdminMenu();
  const [amount, setAmount] = useState(item.count);
  const metadata = metadataEntries(item);

  return (
    <Panel className="w-[280px] shrink-0 flex flex-col overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200">
      <PanelHeader title={t('ui.pages.database.inventory.item_details')} onClose={onClose} />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        <div className="relative h-36 rounded-xl border border-white/5 bg-gradient-to-br from-accent/[0.08] via-white/[0.02] to-transparent flex items-center justify-center">
          <InventoryItemImage key={item.name} item={item} className="w-24 h-24 object-contain drop-shadow-xl" />
          <span className="absolute top-2.5 left-3 font-mono text-xs text-primary/60 tabular-nums">#{item.slot}</span>
          <span className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-md bg-accent/15 text-accent font-rajdhani font-bold text-lg tabular-nums">
            x{item.count}
          </span>
        </div>

        <div className="min-w-0">
          <p className="font-rajdhani font-bold text-xl uppercase tracking-wide text-primary truncate" title={item.label || item.name}>
            {item.label || item.name}
          </p>
          <p className="flex items-center gap-1 font-mono text-sm text-primary/80">
            <span className="truncate">{item.name}</span>
            <CopyButton text={item.name} size={11} />
          </p>
        </div>

        <Section title={t('ui.pages.database.inventory.metadata')}>
          {metadata.length === 0 ? (
            <p className="text-sm text-primary/60">{t('ui.pages.database.inventory.no_metadata')}</p>
          ) : (
            <div className="rounded-lg bg-black/20 border border-white/5 px-3">
              {metadata.map(([key, value]) => (
                <Field key={key} label={key} mono>
                  <span className="truncate" title={formatValue(value)}>
                    {formatValue(value)}
                  </span>
                </Field>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="p-4 border-t border-white/5 space-y-3">
        <div>
          <Label>{t('ui.pages.database.inventory.remove_amount')}</Label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={item.count}
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(Math.min(item.count, Math.max(1, parseInt(e.target.value) || 1)))}
            />
            <Button className="shrink-0" onClick={() => setAmount(item.count)}>
              {t('ui.pages.database.inventory.remove_all')}
            </Button>
          </div>
        </div>
        <Button variant="danger" className="w-full" icon={<Trash2 size={13} />} onClick={() => onRemove(amount)}>
          {t('ui.pages.database.inventory.remove_item')}
        </Button>
      </div>
    </Panel>
  );
};
