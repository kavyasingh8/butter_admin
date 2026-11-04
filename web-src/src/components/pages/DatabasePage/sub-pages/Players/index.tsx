import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Users } from 'lucide-react';
import { useAdminMenu } from '../../../../../providers/AdminMenuContext';
import { Player } from '../../../../../types';
import PlayerDetailView from './PlayerDetailView';
import Pagination from '../../../../ui/Pagination';
import { CopyButton } from '../../../../ui/CopyButton';
import { Avatar, Column, DataTable, EmptyState, Panel, Segmented, StatStrip, StatusDot, Toolbar, membershipLabel } from '../../ui';

const ITEMS_PER_PAGE = 25;

type StatusFilter = 'all' | 'online' | 'offline';

interface PlayersProps {
  searchQuery: string;
}

const Players: React.FC<PlayersProps> = ({ searchQuery }) => {
  const { dbPlayers, dbPlayersTotal, players, selectedPage, opened, requestData, t } = useAdminMenu();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opened || selectedPage !== 'Database') return;
    const timer = setTimeout(
      () => {
        setLoading(true);
        requestData('players', { includeDb: true, page: currentPage, limit: ITEMS_PER_PAGE, search: searchQuery, status })
          .catch(() => {})
          .finally(() => setLoading(false));
      },
      searchQuery ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [opened, selectedPage, currentPage, searchQuery, status, requestData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, status]);

  if (selectedPlayer) {
    return <PlayerDetailView player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />;
  }

  const onlineCount = players?.length || 0;

  const columns: Column<Player>[] = [
    {
      key: 'name',
      header: t('ui.pages.database.players.col_name'),
      width: 'minmax(0,2fr)',
      render: (p) => (
        <span className="flex items-center gap-3 min-w-0">
          <Avatar name={p.Name || '?'} online={!!p.isOnline} />
          <span className="min-w-0">
            <span className="block text-primary font-semibold truncate">{p.Name}</span>
            <span className="flex items-center gap-1 font-mono text-[13px] text-primary/80">
              <span className="truncate">{p.CitizenId || '-'}</span>
              {p.CitizenId && <CopyButton text={p.CitizenId} size={10} className="opacity-0 group-hover:opacity-100" />}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'job',
      header: t('ui.pages.database.players.job'),
      width: 'minmax(0,1.2fr)',
      render: (p) => (
        <span className="text-primary/80 truncate">{membershipLabel(p.job, t('ui.pages.database.jobs_gangs.unemployed'))}</span>
      ),
    },
    {
      key: 'license',
      header: t('ui.pages.database.players.col_license'),
      width: 'minmax(0,1.8fr)',
      render: (p) => <span className="font-mono text-sm text-primary/80 truncate">{p.License || '-'}</span>,
    },
    {
      key: 'status',
      header: t('ui.pages.database.players.col_status'),
      width: '140px',
      render: (p) =>
        p.isOnline ? (
          <StatusDot tone="success" label={t('ui.pages.database.players.online_now')} />
        ) : (
          <StatusDot tone="default" label={t('ui.pages.database.players.offline')} />
        ),
    },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      <StatStrip
        items={[
          {
            label: t('ui.pages.database.players.total_characters'),
            value: dbPlayersTotal.toLocaleString(),
            icon: <Users size={18} />,
          },
          {
            label: t('ui.pages.database.players.online_now'),
            value: onlineCount,
            icon: <UserCheck size={18} />,
            tone: 'success',
          },
          {
            label: t('ui.pages.database.players.offline'),
            value: Math.max(0, dbPlayersTotal - onlineCount),
            icon: <UserX size={18} />,
            tone: 'default',
          },
        ]}
      />

      <Toolbar>
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { id: 'all', label: t('ui.pages.database.filter_all') },
            { id: 'online', label: t('ui.pages.database.players.online_now'), count: onlineCount },
            { id: 'offline', label: t('ui.pages.database.players.offline') },
          ]}
        />
        <span className="ml-auto font-mono text-[13px] text-primary/80">
          {searchQuery
            ? t('ui.pages.database.players.results_found', searchQuery, String(dbPlayersTotal))
            : t('ui.pages.database.result_count', dbPlayersTotal.toLocaleString())}
        </span>
      </Toolbar>

      <Panel className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTable
          className="flex-1"
          columns={columns}
          rows={dbPlayers}
          rowKey={(p) => p.CitizenId || p.License}
          onRowClick={setSelectedPlayer}
          loading={loading}
          empty={<EmptyState icon={<Users size={40} />} title={t('ui.pages.database.players.no_results')} />}
        />
        {dbPlayersTotal > ITEMS_PER_PAGE && (
          <div className="px-4 py-2 border-t border-white/5">
            <Pagination
              currentPage={currentPage}
              totalItems={dbPlayersTotal}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              label={t('ui.pages.database.players.characters_label')}
            />
          </div>
        )}
      </Panel>
    </div>
  );
};

export default Players;
