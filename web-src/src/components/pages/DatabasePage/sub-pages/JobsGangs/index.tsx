import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Briefcase, Pencil, Search, ShieldCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { useAdminMenu, toArray } from '../../../../../providers/AdminMenuContext';
import { Player, FactionMembership, Job } from '../../../../../types';
import { fetchNui } from '../../../../../utils/fetchNui';
import { SearchField } from '../../../../ui/SearchField';
import { SortSelect } from '../../../../ui/SortSelect';
import { Select } from '../../../../ui/Select';
import { CopyButton } from '../../../../ui/CopyButton';
import { cn } from '../../../../../utils/cn';
import {
  Avatar,
  Badge,
  Button,
  Column,
  DataTable,
  EmptyState,
  IconButton,
  Label,
  ListHeader,
  ListItem,
  Modal,
  Panel,
  PanelHeader,
  Segmented,
  StatStrip,
  Toolbar,
  inputClass,
} from '../../ui';

type Category = 'Jobs' | 'Gangs';
type FactionSort = 'name' | 'members';
type Grade = NonNullable<Job['grades']>[number];

/** The player's job or gang, which the server sends as a name or a full object. */
const getMembership = (player: Player, category: Category): FactionMembership | string | undefined =>
  category === 'Jobs' ? player.Details?.job || player.job : player.Details?.gang || player.gang;

interface PlayersResponse {
  All?: Player[];
}

interface JobsGangsProps {
  searchQuery: string;
}

const JobsGangs: React.FC<JobsGangsProps> = ({ searchQuery }) => {
  const { jobs, gangs, players, admins, t, selectedPage, opened, requestData } = useAdminMenu();

  const [category, setCategory] = useState<Category>('Jobs');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'Members' | 'Grades'>('Members');
  const [sort, setSort] = useState<FactionSort>('name');
  const [hideEmpty, setHideEmpty] = useState(false);

  const [roster, setRoster] = useState<Player[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  const [editing, setEditing] = useState<Player | null>(null);
  const [target, setTarget] = useState<{ id: string; grade: number }>({ id: '', grade: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerResults, setPickerResults] = useState<Player[]>([]);

  const groups = (category === 'Jobs' ? jobs : gangs) || [];

  const refreshFactions = useCallback(() => {
    requestData('jobs').catch(() => {});
    requestData('gangs').catch(() => {});
  }, [requestData]);

  useEffect(() => {
    if (opened && selectedPage === 'Database') refreshFactions();
  }, [opened, selectedPage, refreshFactions]);

  const visibleGroups = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const list = groups.filter((group) => {
      if (hideEmpty && !group.totalPlayers) return false;
      return !query || [group.label, group.name, group.id].some((value) => value?.toLowerCase().includes(query));
    });
    return sort === 'members'
      ? list.sort((a, b) => (b.totalPlayers || 0) - (a.totalPlayers || 0))
      : list.sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));
  }, [groups, searchQuery, hideEmpty, sort]);

  const selected = groups.find((group) => group.id === selectedId) ?? visibleGroups[0] ?? null;
  const activeId = selected?.id ?? null;

  // Rosters come straight from the server; the paged player list only holds a slice of members.
  const loadRoster = useCallback((id: string | null, type: Category) => {
    if (!id) {
      setRoster([]);
      return;
    }
    setLoadingRoster(true);
    fetchNui<Player[]>('fetchFactionMembers', { type: type.toLowerCase(), name: id })
      .then((list) => setRoster(toArray(list)))
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, []);

  useEffect(() => {
    setRosterSearch('');
    loadRoster(activeId, category);
  }, [activeId, category, loadRoster]);

  // The hire picker searches the whole database, not just the loaded page of players.
  useEffect(() => {
    if (!pickerOpen) return;
    const timer = setTimeout(() => {
      fetchNui<PlayersResponse | false>('fetchPlayers', { includeDb: true, search: pickerSearch, limit: 50 })
        .then((result) => setPickerResults(result ? toArray(result.All) : []))
        .catch(() => setPickerResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [pickerOpen, pickerSearch]);

  const onlineIds = useMemo(() => new Set((players || []).map((p) => p.CitizenId)), [players]);

  const gradeOf = (player: Player) => {
    const membership = getMembership(player, category);
    return typeof membership === 'object' ? membership.grade : undefined;
  };

  const visibleRoster = useMemo(() => {
    const query = rosterSearch.toLowerCase();
    if (!query) return roster;
    return roster.filter((p) => p.Name?.toLowerCase().includes(query) || p.CitizenId?.toLowerCase().includes(query));
  }, [roster, rosterSearch]);

  const gradeCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const member of roster) {
      const membership = getMembership(member, category);
      const level = typeof membership === 'object' ? membership.grade?.level : undefined;
      if (level !== undefined) counts[level] = (counts[level] ?? 0) + 1;
    }
    return counts;
  }, [roster, category]);

  const pickerPlayers = pickerResults.filter((p) => {
    const membership = getMembership(p, category);
    return (typeof membership === 'string' ? membership : membership?.name) !== activeId;
  });

  const startEdit = (player: Player, groupId?: string) => {
    const membership = getMembership(player, category);
    const currentId = typeof membership === 'string' ? membership : (membership?.name ?? '');
    setTarget({ id: groupId ?? currentId, grade: groupId ? 0 : (gradeOf(player)?.level ?? 0) });
    setEditing(player);
  };

  const updateMembership = (player: Player, alignment: string, grade: number) =>
    fetchNui<boolean>('updateAlignment', {
      citizenid: player.CitizenId,
      type: category.toLowerCase(),
      alignment,
      grade,
    })
      .then((applied) => {
        if (!applied) return false;
        refreshFactions();
        loadRoster(activeId, category);
        return true;
      })
      .catch(() => false);

  const saveEdit = async () => {
    if (!editing) return;
    if (await updateMembership(editing, target.id, target.grade)) setEditing(null);
  };

  const removeMember = (player: Player) => updateMembership(player, category === 'Jobs' ? 'unemployed' : 'none', 0);

  const totalMembers = groups.reduce((sum, group) => sum + (group.totalPlayers || 0), 0);
  const targetGrades = groups.find((group) => group.id === target.id)?.grades ?? [];

  const memberColumns: Column<Player>[] = [
    {
      key: 'name',
      header: t('ui.pages.database.players.col_name'),
      width: 'minmax(0,1.5fr)',
      render: (p) => (
        <span className="flex items-center gap-3 min-w-0">
          <Avatar name={p.Name || '?'} online={onlineIds.has(p.CitizenId)} />
          <span className="text-primary font-semibold truncate">{p.Name}</span>
        </span>
      ),
    },
    {
      key: 'cid',
      header: t('ui.pages.database.players.citizen_id'),
      width: 'minmax(0,1fr)',
      render: (p) => (
        <span className="flex items-center gap-1 min-w-0">
          <span className="font-mono text-sm text-primary/80 truncate">{p.CitizenId || '-'}</span>
          {p.CitizenId && <CopyButton text={p.CitizenId} size={11} className="opacity-0 group-hover:opacity-100" />}
        </span>
      ),
    },
    {
      key: 'grade',
      header: t('ui.pages.database.jobs_gangs.rank_grade'),
      width: 'minmax(0,1fr)',
      render: (p) => {
        const grade = gradeOf(p);
        return (
          <span className="flex items-center gap-2 min-w-0">
            {grade?.level !== undefined && <Badge tone="accent">{grade.level}</Badge>}
            <span className="text-primary/80 truncate">
              {grade?.label ?? grade?.name ?? t('ui.pages.database.jobs_gangs.unknown')}
            </span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '72px',
      align: 'right',
      render: (p) => (
        <span className="flex gap-0.5 opacity-0 group-hover:opacity-100">
          <IconButton title={t('ui.pages.database.jobs_gangs.reassign_rank')} onClick={() => startEdit(p)}>
            <Pencil size={13} />
          </IconButton>
          <IconButton tone="danger" title={t('ui.pages.database.jobs_gangs.fire_remove')} onClick={() => removeMember(p)}>
            <UserMinus size={13} />
          </IconButton>
        </span>
      ),
    },
  ];

  const gradeColumns: Column<Grade>[] = [
    {
      key: 'level',
      header: t('ui.pages.database.jobs_gangs.level_header'),
      width: '80px',
      render: (g) => <Badge tone="accent">{g.level}</Badge>,
    },
    {
      key: 'label',
      header: t('ui.pages.database.jobs_gangs.grade_label'),
      width: 'minmax(0,1.5fr)',
      render: (g) => <span className="text-primary font-semibold truncate">{g.label}</span>,
    },
    {
      key: 'name',
      header: t('ui.pages.database.jobs_gangs.grade_name'),
      width: 'minmax(0,1fr)',
      render: (g) => <span className="font-mono text-sm text-primary/80 truncate">{g.name}</span>,
    },
    {
      key: 'assigned',
      header: t('ui.pages.database.jobs_gangs.assigned_header'),
      width: '110px',
      align: 'right',
      render: (g) => <span className="tabular-nums font-semibold">{gradeCounts[g.level] ?? 0}</span>,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      <StatStrip
        items={[
          {
            label: t('ui.pages.database.jobs_gangs.registered_units'),
            value: groups.length,
            icon: <Briefcase size={18} />,
          },
          {
            label: t('ui.pages.database.jobs_gangs.active_personnel'),
            value: totalMembers.toLocaleString(),
            icon: <Users size={18} />,
            tone: 'success',
          },
          {
            label: t('ui.pages.database.jobs_gangs.admin_oversight'),
            value: admins?.length || 0,
            icon: <ShieldCheck size={18} />,
            tone: 'warning',
          },
        ]}
      />

      <Toolbar>
        <Segmented
          value={category}
          onChange={(value) => {
            setCategory(value);
            setSelectedId(null);
          }}
          options={[
            { id: 'Jobs', label: t('ui.pages.database.jobs_gangs.jobs_tab'), count: jobs?.length || 0 },
            { id: 'Gangs', label: t('ui.pages.database.jobs_gangs.gangs_tab'), count: gangs?.length || 0 },
          ]}
        />
        <SortSelect
          value={sort}
          onChange={setSort}
          options={[
            { id: 'name', label: t('ui.pages.database.sort_name') },
            { id: 'members', label: t('ui.pages.database.jobs_gangs.sort_members') },
          ]}
        />
        <Button variant={hideEmpty ? 'primary' : 'default'} onClick={() => setHideEmpty((value) => !value)}>
          {t('ui.pages.database.jobs_gangs.hide_empty')}
        </Button>
      </Toolbar>

      <div className="flex-1 min-h-0 flex gap-3">
        <Panel className="w-[280px] shrink-0 flex flex-col overflow-hidden">
          <ListHeader
            left={category === 'Jobs' ? t('ui.pages.database.jobs_gangs.jobs_tab') : t('ui.pages.database.jobs_gangs.gangs_tab')}
            right={<span>{t('ui.pages.database.jobs_gangs.members')}</span>}
          />
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {visibleGroups.length === 0 ? (
              <EmptyState icon={<Briefcase size={40} />} title={t('ui.pages.database.jobs_gangs.no_entries_found')} />
            ) : (
              visibleGroups.map((group) => (
                <ListItem
                  key={group.id}
                  active={selected?.id === group.id}
                  onClick={() => setSelectedId(group.id)}
                  media={<Avatar name={group.label || group.id} />}
                  title={group.label}
                  subtitle={group.id}
                  right={
                    <span
                      className={cn(
                        'min-w-[28px] px-1.5 py-1 rounded-md text-center font-mono text-[13px] font-bold tabular-nums',
                        group.totalPlayers ? 'bg-accent/10 text-accent' : 'bg-white/5 text-primary/80',
                      )}
                    >
                      {group.totalPlayers || 0}
                    </span>
                  }
                />
              ))
            )}
          </div>
        </Panel>

        <Panel className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {selected ? (
            <>
              <PanelHeader
                media={<Avatar name={selected.label || selected.id} className="w-10 h-10 text-base" />}
                title={selected.label}
                subtitle={
                  <span className="font-mono">
                    {selected.id} · {t('ui.pages.database.jobs_gangs.member_count', String(selected.totalPlayers || 0))}
                  </span>
                }
                actions={
                  <Segmented
                    value={detailTab}
                    onChange={setDetailTab}
                    options={[
                      { id: 'Members', label: t('ui.pages.database.jobs_gangs.personnel_tab') },
                      {
                        id: 'Grades',
                        label: t('ui.pages.database.jobs_gangs.grades_tab'),
                        count: selected.grades?.length ?? 0,
                      },
                    ]}
                  />
                }
              />
              {detailTab === 'Members' ? (
                <>
                  <Toolbar className="px-4 py-3 border-b border-white/5">
                    <SearchField
                      className="flex-1 max-w-xs"
                      value={rosterSearch}
                      onChange={setRosterSearch}
                      placeholder={t('ui.pages.database.jobs_gangs.search_placeholder')}
                    />
                    <Button
                      variant="primary"
                      className="ml-auto"
                      icon={<UserPlus size={13} />}
                      onClick={() => {
                        setPickerSearch('');
                        setPickerOpen(true);
                      }}
                    >
                      {t('ui.pages.database.jobs_gangs.hire_new_member')}
                    </Button>
                  </Toolbar>
                  <DataTable
                    className="flex-1"
                    columns={memberColumns}
                    rows={visibleRoster}
                    rowKey={(p) => p.CitizenId || p.License}
                    loading={loadingRoster}
                    empty={
                      <EmptyState
                        icon={<Users size={40} />}
                        title={
                          rosterSearch
                            ? t('ui.pages.database.jobs_gangs.no_players_found')
                            : t('ui.pages.database.jobs_gangs.no_members')
                        }
                      />
                    }
                  />
                </>
              ) : (
                <DataTable
                  className="flex-1"
                  columns={gradeColumns}
                  rows={[...(selected.grades ?? [])].sort((a, b) => a.level - b.level)}
                  rowKey={(g) => String(g.level)}
                  empty={<EmptyState title={t('ui.pages.database.jobs_gangs.no_grades')} />}
                />
              )}
            </>
          ) : (
            <EmptyState
              className="flex-1"
              icon={<Briefcase size={40} />}
              title={t('ui.pages.database.jobs_gangs.registry_intelligence')}
              hint={t('ui.pages.database.jobs_gangs.select_group_desc')}
            />
          )}
        </Panel>
      </div>

      {pickerOpen && (
        <Modal
          title={t('ui.pages.database.jobs_gangs.select_player')}
          subtitle={t('ui.pages.database.jobs_gangs.search_player_desc', selected?.label || '')}
          onClose={() => setPickerOpen(false)}
          width="max-w-lg"
        >
          <SearchField
            autoFocus
            value={pickerSearch}
            onChange={setPickerSearch}
            placeholder={t('ui.pages.database.jobs_gangs.search_placeholder')}
          />
          <div className="mt-3 border border-white/5 bg-black/20 rounded-lg max-h-80 overflow-y-auto custom-scrollbar">
            {pickerPlayers.length === 0 ? (
              <EmptyState icon={<Search size={22} />} title={t('ui.pages.database.jobs_gangs.no_players_found')} />
            ) : (
              pickerPlayers.map((p) => {
                const membership = getMembership(p, category);
                const current = typeof membership === 'object' ? membership.label || membership.name : membership;
                return (
                  <button
                    key={p.CitizenId || p.License}
                    onClick={() => {
                      setPickerOpen(false);
                      if (selected) startEdit(p, selected.id);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0 text-left hover:bg-white/[0.04] transition-colors"
                  >
                    <Avatar name={p.Name || '?'} online={onlineIds.has(p.CitizenId)} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-base font-semibold text-primary truncate">{p.Name}</span>
                      <span className="block font-mono text-[13px] text-primary/80 truncate">{p.CitizenId}</span>
                    </span>
                    <span className="text-sm text-primary/80 truncate max-w-[40%]">
                      {current || t('ui.pages.database.jobs_gangs.unemployed')}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Modal>
      )}

      {editing && (
        <Modal
          title={t('ui.pages.database.jobs_gangs.update_alignment')}
          subtitle={`${editing.Name} (${editing.CitizenId})`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" disabled={!target.id} onClick={saveEdit}>
                {t('ui.pages.access.ranks.commit')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label>{t('ui.pages.database.jobs_gangs.assigned_group')}</Label>
              <Select
                triggerClassName={inputClass}
                value={target.id}
                onChange={(id) => setTarget({ id, grade: 0 })}
                options={groups.map((group) => ({ id: group.id, label: group.label }))}
              />
            </div>
            <div>
              <Label>{t('ui.pages.database.jobs_gangs.rank_grade')}</Label>
              {targetGrades.length > 0 ? (
                <div className="border border-white/5 bg-black/20 rounded-lg max-h-56 overflow-y-auto custom-scrollbar">
                  {[...targetGrades]
                    .sort((a, b) => a.level - b.level)
                    .map((grade) => (
                      <button
                        key={grade.level}
                        onClick={() => setTarget({ ...target, grade: grade.level })}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 border-b border-white/5 last:border-0 text-left text-base transition-colors',
                          target.grade === grade.level ? 'bg-accent/10 text-primary' : 'text-primary/80 hover:bg-white/[0.04]',
                        )}
                      >
                        <span className="w-6 tabular-nums text-base">{grade.level}</span>
                        <span className="flex-1 truncate">{grade.label}</span>
                        {target.grade === grade.level && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                      </button>
                    ))}
                </div>
              ) : (
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={target.grade}
                  onChange={(e) => setTarget({ ...target, grade: parseInt(e.target.value) || 0 })}
                />
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JobsGangs;
