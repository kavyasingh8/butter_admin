import React, { useState } from 'react';
import { Car, Loader2, X } from 'lucide-react';
import { FactionMembership } from '../../../types';
import { cn } from '../../../utils/cn';
import { SubTabs } from '../../ui/SubTabs';

// Shared building blocks so every Database tab looks and behaves the same.

export type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

const TONE_TEXT: Record<Tone, string> = {
  default: 'text-primary',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

const TONE_BORDER: Record<Tone, string> = {
  default: 'border-white/10',
  accent: 'border-accent/30',
  success: 'border-success/30',
  warning: 'border-warning/30',
  danger: 'border-danger/30',
};

const TONE_DOT: Record<Tone, string> = {
  default: 'bg-muted/60',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

const TONE_TILE: Record<Tone, string> = {
  default: 'bg-white/5 border-white/10 text-primary/80',
  accent: 'bg-accent/10 border-accent/20 text-accent',
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  danger: 'bg-danger/10 border-danger/20 text-danger',
};

const TONE_PILL: Record<Tone, string> = {
  default: 'bg-white/5 text-primary/80',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

export const inputClass =
  'w-full bg-black/30 border border-white/5 hover:border-white/10 focus:border-accent/40 rounded-lg px-3 py-2.5 text-base text-primary placeholder:text-white/60 outline-none transition-colors';

export const Panel: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('bg-black/20 border border-white/5 rounded-xl', className)}>{children}</div>
);

export const IconTile: React.FC<{ tone?: Tone; className?: string; children: React.ReactNode }> = ({
  tone = 'accent',
  className,
  children,
}) => (
  <div className={cn('rounded-xl border flex items-center justify-center shrink-0', TONE_TILE[tone], className ?? 'w-10 h-10')}>
    {children}
  </div>
);

export interface StatItem {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  hint?: string;
}

export const StatStrip: React.FC<{ items: StatItem[] }> = ({ items }) => (
  <div className="flex gap-3 shrink-0">
    {items.map((item) => (
      <div
        key={item.label}
        className="flex items-center gap-3 rounded-xl bg-black/30 border border-white/5 px-4 py-3 flex-1 min-w-0"
      >
        {item.icon && (
          <IconTile tone={item.tone ?? 'accent'} className="w-10 h-10 rounded-lg">
            {item.icon}
          </IconTile>
        )}
        <div className="min-w-0 leading-none">
          <p
            className={cn(
              'font-rajdhani font-bold text-2xl tabular-nums truncate',
              item.icon ? 'text-primary' : TONE_TEXT[item.tone ?? 'default'],
            )}
          >
            {item.value}
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-primary/80 mt-1.5 truncate">{item.label}</p>
          {item.hint && <p className="text-sm text-primary/80 truncate mt-1">{item.hint}</p>}
        </div>
      </div>
    ))}
  </div>
);

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  className,
  fullWidth,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  fullWidth?: boolean;
}) => (
  <SubTabs
    tabs={options}
    activeTab={value}
    onChange={onChange}
    className={className}
    tabClassName="px-3.5 py-2 text-sm"
    fullWidth={fullWidth}
  />
);

export const Toolbar: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('flex items-center gap-2 flex-wrap shrink-0', className)}>{children}</div>
);

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  default: 'bg-white/5 border-white/10 text-primary hover:bg-white/10',
  primary: 'bg-accent border-accent text-white hover:bg-accent/80',
  danger: 'bg-danger/10 border-danger/20 text-danger hover:bg-danger hover:text-white',
  ghost: 'bg-transparent border-transparent text-primary/80 hover:text-primary hover:bg-white/5',
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; icon?: React.ReactNode; busy?: boolean }
> = ({ variant = 'default', icon, busy, className, children, disabled, ...props }) => (
  <button
    {...props}
    disabled={disabled || busy}
    className={cn(
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-rajdhani font-bold uppercase tracking-wider text-sm transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none',
      BUTTON_VARIANTS[variant],
      className,
    )}
  >
    {busy ? <Loader2 size={13} className="animate-spin" /> : icon}
    {children}
  </button>
);

export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger'; spinning?: boolean }
> = ({ tone = 'default', spinning, className, children, ...props }) => (
  <button
    {...props}
    className={cn(
      'p-1.5 rounded-lg transition-colors disabled:opacity-40',
      tone === 'danger' ? 'text-primary/80 hover:text-danger hover:bg-danger/10' : 'text-primary/80 hover:text-primary hover:bg-white/10',
      spinning && '[&>svg]:animate-spin',
      className,
    )}
  >
    {children}
  </button>
);

/** A bare dot, or a tinted pill when given a label. */
export const StatusDot: React.FC<{ tone: Tone; label?: React.ReactNode; className?: string }> = ({
  tone,
  label,
  className,
}) => {
  const dot = <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', TONE_DOT[tone])} />;
  if (label === undefined) return <span className={cn('inline-flex', className)}>{dot}</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider leading-none whitespace-nowrap',
        TONE_PILL[tone],
        className,
      )}
    >
      {dot}
      {label}
    </span>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; tone?: Tone; className?: string }> = ({
  children,
  tone = 'default',
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center px-2 py-1 rounded-md border font-mono text-xs font-bold uppercase tracking-wider leading-none whitespace-nowrap',
      TONE_BORDER[tone],
      tone === 'default' ? 'text-primary/80 bg-white/5' : TONE_TEXT[tone],
      className,
    )}
  >
    {children}
  </span>
);

export const Plate: React.FC<{ plate: string }> = ({ plate }) => (
  <span className="font-mono text-sm font-bold tracking-wider px-2 py-1 rounded-md bg-white/5 border border-white/10 text-primary whitespace-nowrap">
    {plate}
  </span>
);

/** Thin bar for 0-100 values like fuel or engine health. */
export const Meter: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const clamped = Math.max(0, Math.min(100, value));
  const tone = clamped < 25 ? 'bg-danger' : clamped < 60 ? 'bg-warning' : 'bg-success';
  return (
    <span className={cn('flex items-center gap-2 min-w-0', className)}>
      <span className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
        <span className={cn('block h-full rounded-full', tone)} style={{ width: `${clamped}%` }} />
      </span>
      <span className="text-base font-mono text-primary/90 tabular-nums w-11 text-right">{Math.round(clamped)}%</span>
    </span>
  );
};

const initialsOf = (name: string) =>
  name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

/** Profile picture with an initials fallback and an optional online marker. */
export const Avatar: React.FC<{ name: string; src?: string; online?: boolean; className?: string }> = ({
  name,
  src,
  online,
  className,
}) => {
  const [failedSrc, setFailedSrc] = useState<string>();
  const showImage = !!src && src !== failedSrc;
  return (
    <div
      className={cn(
        'relative shrink-0 rounded-xl bg-accent/10 border border-accent/20 text-accent font-rajdhani font-bold flex items-center justify-center',
        className ?? 'w-9 h-9 text-base',
      )}
    >
      {showImage ? (
        <img src={src} alt={name} className="w-full h-full object-cover rounded-xl" onError={() => setFailedSrc(src)} />
      ) : (
        initialsOf(name)
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-primary',
            online ? 'bg-success' : 'bg-muted/50',
          )}
        />
      )}
    </div>
  );
};

/**
 * Vehicle render from the FiveM docs, keyed by spawn name. Addon vehicles
 * have no render there, so they fall back to a car icon.
 */
export const VehicleImage: React.FC<{ model: string; image?: string; className?: string }> = ({
  model,
  image,
  className,
}) => {
  const src = image || `https://docs.fivem.net/vehicles/${encodeURIComponent(model.toLowerCase())}.webp`;
  const [failedSrc, setFailedSrc] = useState<string>();
  return (
    <div
      className={cn(
        'shrink-0 rounded-lg bg-gradient-to-br from-white/[0.07] to-white/[0.01] border border-white/5 flex items-center justify-center overflow-hidden',
        className ?? 'w-36 h-20',
      )}
    >
      {failedSrc === src ? (
        <Car className="w-1/2 h-1/2 text-white/40" strokeWidth={1.5} />
      ) : (
        <img src={src} alt={model} loading="lazy" className="w-full h-full object-contain" onError={() => setFailedSrc(src)} />
      )}
    </div>
  );
};

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; hint?: string; className?: string }> = ({
  icon,
  title,
  hint,
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6 text-primary/80', className)}>
    {icon && <div className="mb-4 opacity-20">{icon}</div>}
    <p className="font-rajdhani font-bold uppercase tracking-widest text-primary/90">{title}</p>
    {hint && <p className="text-sm mt-1.5 max-w-xs">{hint}</p>}
  </div>
);

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** CSS grid track, e.g. "1fr", "120px", "minmax(0,2fr)". */
  width?: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
}

const ALIGN = { left: 'justify-start text-left', right: 'justify-end text-right', center: 'justify-center text-center' };

export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  loading,
  empty,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  loading?: boolean;
  empty?: React.ReactNode;
  className?: string;
}) => {
  const template = columns.map((column) => column.width ?? 'minmax(0,1fr)').join(' ');
  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div
        className="grid gap-4 px-5 py-3 border-b border-white/5 font-mono text-xs font-bold uppercase tracking-widest text-primary/80 shrink-0 bg-black/20"
        style={{ gridTemplateColumns: template }}
      >
        {columns.map((column) => (
          <div key={column.key} className={cn('flex items-center truncate', ALIGN[column.align ?? 'left'])}>
            {column.header}
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-primary/80">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          empty
        ) : (
          rows.map((row) => {
            const key = rowKey(row);
            const selected = selectedKey === key;
            return (
              <div
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'group grid gap-4 px-5 py-2.5 min-h-[56px] border-b border-white/[0.04] text-base items-center transition-colors',
                  onRowClick && 'cursor-pointer',
                  selected ? 'bg-accent/10 shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'hover:bg-white/[0.04]',
                )}
                style={{ gridTemplateColumns: template }}
              >
                {columns.map((column) => (
                  <div key={column.key} className={cn('flex items-center min-w-0', ALIGN[column.align ?? 'left'])}>
                    {column.render(row)}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/** Selectable row for the left-hand lists (garages, factions, containers). */
export const ListItem: React.FC<{
  active: boolean;
  onClick: () => void;
  media?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}> = ({ active, onClick, media, title, subtitle, right }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-200',
      active ? 'bg-accent/10 border-accent/30' : 'border-transparent hover:bg-white/5 hover:border-white/5',
    )}
  >
    {media}
    <span className="flex-1 min-w-0">
      <span className={cn('block text-base font-semibold truncate', active ? 'text-primary' : 'text-primary/90')}>{title}</span>
      {subtitle && <span className="block font-mono text-[13px] text-primary/80 truncate mt-0.5">{subtitle}</span>}
    </span>
    {right}
  </button>
);

export const ListHeader: React.FC<{ left: React.ReactNode; right?: React.ReactNode }> = ({ left, right }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 font-mono text-xs font-bold uppercase tracking-widest text-primary/80 shrink-0">
    <span>{left}</span>
    {right}
  </div>
);

export const PanelHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  media?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
}> = ({ title, subtitle, media, actions, onClose }) => (
  <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5 shrink-0">
    <div className="flex items-center gap-3 min-w-0">
      {media}
      <div className="min-w-0">
        <div className="font-rajdhani font-bold text-lg uppercase tracking-wide text-primary leading-tight truncate">
          {title}
        </div>
        {subtitle && <div className="text-sm font-mono text-primary/80 truncate mt-1">{subtitle}</div>}
      </div>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      {actions}
      {onClose && (
        <IconButton onClick={onClose}>
          <X size={15} />
        </IconButton>
      )}
    </div>
  </div>
);

export const Section: React.FC<{ title: React.ReactNode; right?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  right,
  className,
  children,
}) => (
  <div className={cn('space-y-2', className)}>
    <div className="flex items-center justify-between">
      <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-primary/80">{title}</h4>
      {right}
    </div>
    {children}
  </div>
);

export const Field: React.FC<{ label: React.ReactNode; children: React.ReactNode; mono?: boolean }> = ({
  label,
  children,
  mono,
}) => (
  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0 text-base">
    <span className="text-primary/80 shrink-0">{label}</span>
    <span className={cn('text-primary min-w-0 truncate text-right flex items-center gap-1', mono && 'font-mono text-sm')}>
      {children}
    </span>
  </div>
);

export const Modal: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  width?: string;
  media?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, footer, width = 'max-w-md', media, children }) => (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200"
    onClick={onClose}
  >
    <div
      className={cn(
        'w-full bg-sidebar border border-white/10 rounded-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200',
        width,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <PanelHeader title={title} subtitle={subtitle} media={media} onClose={onClose} />
      <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
      {footer && <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/5">{footer}</div>}
    </div>
  </div>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block font-mono text-xs font-bold uppercase tracking-widest text-primary/80 mb-2">{children}</label>
);

export const formatMoney = (value: number) => `$${(Number(value) || 0).toLocaleString()}`;

export const membershipLabel = (membership: FactionMembership | string | undefined, fallback: string) => {
  if (!membership) return fallback;
  if (typeof membership === 'string') return membership;
  const name = membership.label || membership.name || fallback;
  const grade = membership.grade?.label || membership.grade?.name;
  return grade ? `${name} (${grade})` : name;
};
