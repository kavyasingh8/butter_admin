import React, { useState, useEffect, useMemo } from 'react';
import { Banknote, Bitcoin, Crown, Landmark, Loader2, TrendingUp, Wallet } from 'lucide-react';
import { useAdminMenu } from '../../../../../providers/AdminMenuContext';
import Pagination from '../../../../ui/Pagination';
import { cn } from '../../../../../utils/cn';
import { Avatar, Column, DataTable, EmptyState, Panel, PanelHeader, Segmented, StatStrip, formatMoney } from '../../ui';

const PODIUM = ['text-amber-400 bg-amber-400/10 border-amber-400/30', 'text-slate-300 bg-slate-300/10 border-slate-300/30', 'text-orange-400 bg-orange-400/10 border-orange-400/30'];

const ITEMS_PER_PAGE = 20;

type SortType = 'Total' | 'Bank' | 'Cash';

interface RankedPlayer {
  rank: number;
  name: string;
  amount: number;
  type: string;
}

const Economy: React.FC<{ searchQuery?: string }> = ({ searchQuery = '' }) => {
  const { economy, selectedPage, opened, requestData, t } = useAdminMenu();
  const [sortType, setSortType] = useState<SortType>('Total');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (opened && selectedPage === 'Database') requestData('economy').catch(() => {});
  }, [opened, selectedPage, requestData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortType]);

  // Ranks are taken before searching so a result keeps its real position.
  const ranked = useMemo<RankedPlayer[]>(() => {
    const list = (economy?.RichestPlayers[sortType] || []).map((p, i) => ({ ...p, rank: i + 1 }));
    const query = searchQuery.toLowerCase();
    return query ? list.filter((p) => p.name.toLowerCase().includes(query)) : list;
  }, [economy, sortType, searchQuery]);

  if (!economy) {
    return (
      <div className="flex h-full items-center justify-center text-primary/80">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  const sortTotal =
    sortType === 'Bank' ? economy.TotalBank : sortType === 'Cash' ? economy.TotalCash : economy.TotalBank + economy.TotalCash;
  const pageRows = ranked.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const maxBucket = Math.max(1, ...economy.WealthDistribution.map((d) => d.count));

  const columns: Column<RankedPlayer>[] = [
    {
      key: 'rank',
      header: '#',
      width: '64px',
      render: (p) => (
        <span
          className={cn(
            'w-8 h-8 rounded-lg border flex items-center justify-center font-rajdhani font-bold tabular-nums',
            PODIUM[p.rank - 1] ?? 'text-primary/80 bg-white/5 border-white/5',
          )}
        >
          {p.rank <= PODIUM.length ? <Crown size={14} /> : p.rank}
        </span>
      ),
    },
    {
      key: 'name',
      header: t('ui.pages.database.economy.player_header'),
      width: 'minmax(0,2fr)',
      render: (p) => (
        <span className="flex items-center gap-3 min-w-0">
          <Avatar name={p.name} />
          <span className="text-primary font-semibold truncate">{p.name}</span>
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('ui.pages.database.economy.balance_header'),
      width: 'minmax(0,1fr)',
      align: 'right',
      render: (p) => <span className="tabular-nums font-semibold text-success">{formatMoney(p.amount)}</span>,
    },
    {
      key: 'share',
      header: t('ui.pages.database.economy.share_header'),
      width: '90px',
      align: 'right',
      render: (p) => (
        <span className="font-mono text-sm text-primary/80 tabular-nums">
          {sortTotal > 0 ? `${((p.amount / sortTotal) * 100).toFixed(2)}%` : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      <StatStrip
        items={[
          {
            label: t('ui.pages.database.economy.total_cash'),
            value: formatMoney(economy.TotalCash),
            icon: <Banknote size={18} />,
            tone: 'success',
          },
          {
            label: t('ui.pages.database.economy.total_bank'),
            value: formatMoney(economy.TotalBank),
            icon: <Landmark size={18} />,
          },
          {
            label: t('ui.pages.database.economy.total_crypto'),
            value: economy.TotalCrypto.toLocaleString(),
            icon: <Bitcoin size={18} />,
            tone: 'warning',
          },
          {
            label: t('ui.pages.database.economy.combined_net_worth'),
            value: formatMoney(economy.TotalCash + economy.TotalBank),
            icon: <TrendingUp size={18} />,
            tone: 'success',
          },
        ]}
      />

      <div className="flex-1 min-h-0 flex gap-3">
        <Panel className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <PanelHeader
            title={t('ui.pages.database.economy.top_wealthy')}
            subtitle={t('ui.pages.database.result_count', ranked.length.toLocaleString())}
            actions={
              <Segmented
                value={sortType}
                onChange={setSortType}
                options={[
                  { id: 'Total', label: t('ui.pages.database.economy.net_worth') },
                  { id: 'Bank', label: t('ui.pages.database.economy.bank') },
                  { id: 'Cash', label: t('ui.pages.database.economy.cash') },
                ]}
              />
            }
          />
          <DataTable
            className="flex-1"
            columns={columns}
            rows={pageRows}
            rowKey={(p) => `${p.rank}-${p.name}`}
            empty={<EmptyState icon={<Wallet size={40} />} title={t('ui.pages.database.economy.no_results')} />}
          />
          {ranked.length > ITEMS_PER_PAGE && (
            <div className="px-4 py-2 border-t border-white/5">
              <Pagination
                currentPage={currentPage}
                totalItems={ranked.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                label={t('ui.pages.database.economy.players_label')}
              />
            </div>
          )}
        </Panel>

        <Panel className="w-[300px] shrink-0 flex flex-col overflow-hidden">
          <PanelHeader title={t('ui.pages.database.economy.distribution')} />
          <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
            {economy.WealthDistribution.map((bucket) => (
              <div key={bucket.range} className="rounded-lg bg-black/20 border border-white/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-primary/80">{bucket.range}</span>
                  <span className="text-base text-primary font-semibold tabular-nums">
                    {bucket.count} <span className="text-primary/80 font-normal">{t('ui.pages.database.economy.players_suffix')}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent"
                    style={{ width: `${(bucket.count / maxBucket) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Economy;
