import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Player, PlayerProfile, PlayerVehicle } from '../../../../../types';
import { useAdminMenu } from '../../../../../providers/AdminMenuContext';
import { fetchNui } from '../../../../../utils/fetchNui';
import { cn } from '../../../../../utils/cn';
import { InventoryItemImage } from '../../../../ui/InventoryItemImage';
import { CopyButton } from '../../../../ui/CopyButton';
import { Select } from '../../../../ui/Select';
import { vehicleStateTone } from '../Vehicles';
import {
  Avatar,
  Button,
  Field,
  IconButton,
  Label,
  Meter,
  Modal,
  Panel,
  Segmented,
  StatusDot,
  VehicleImage,
  formatMoney,
  inputClass,
  membershipLabel,
} from '../../ui';

interface PlayerDetailViewProps {
  player: Player;
  onBack: () => void;
}

const STATES = ['Stored', 'Out', 'Impounded'] as const;

const SectionTitle: React.FC<{ title: string; count?: number }> = ({ title, count }) => (
  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5 shrink-0">
    <h4 className="text-lg font-semibold text-primary">{title}</h4>
    {count !== undefined && <span className="text-lg text-primary/50 tabular-nums">{count}</span>}
  </div>
);

const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-5 pt-5 pb-1.5 text-sm font-semibold uppercase tracking-wider text-primary/50">{children}</p>
);

const Row: React.FC<{ label: string; mono?: boolean; children: React.ReactNode }> = ({ label, mono, children }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-2 min-h-[46px]">
    <span className="text-lg text-primary/70 shrink-0">{label}</span>
    <span className={cn('min-w-0 flex items-center gap-1.5 text-primary', mono ? 'font-mono text-base' : 'text-lg')}>
      {children}
    </span>
  </div>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-5 py-6 text-lg text-primary/50">{children}</p>
);

const PlayerDetailView: React.FC<PlayerDetailViewProps> = ({ player: initialPlayer, onBack }) => {
  const { t, garages, jobs, gangs, players } = useAdminMenu();
  const [player, setPlayer] = useState<PlayerProfile>(initialPlayer);
  const [loading, setLoading] = useState(true);
  const [ipRevealed, setIpRevealed] = useState(false);

  const [vehicle, setVehicle] = useState<PlayerVehicle | null>(null);
  const [newPlate, setNewPlate] = useState('');
  const [newGarage, setNewGarage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [alignmentType, setAlignmentType] = useState<'job' | 'gang' | null>(null);
  const [target, setTarget] = useState<{ id: string; grade: number }>({ id: '', grade: 0 });

  const profileId = initialPlayer.CitizenId ?? initialPlayer.License;

  const refreshProfile = async () => {
    const updated = await fetchNui<PlayerProfile | false>('fetchPlayerProfile', { id: profileId });
    if (updated) setPlayer(updated);
  };

  useEffect(() => {
    setLoading(true);
    fetchNui<PlayerProfile | false>('fetchPlayerProfile', { id: initialPlayer.CitizenId ?? initialPlayer.License }, initialPlayer)
      .then((data) => {
        if (data && data.Name) setPlayer(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialPlayer]);

  const details = player.Details;
  const job = details?.job || player.job;
  const gang = details?.gang || player.gang;
  const money = details?.money || { cash: 0, bank: 0 };
  const vehicles = details?.vehicles || [];
  const properties = details?.properties || [];
  const inventory = details?.inventory || [];
  const isOnline = player.isOnline ?? (players || []).some((p) => p.CitizenId === player.CitizenId);

  const openVehicle = (v: PlayerVehicle | null) => {
    setVehicle(v);
    setNewPlate(v?.plate ?? '');
    setNewGarage(v?.garage ?? '');
    setConfirmDelete(false);
  };

  const vehicleAction = async (action: string, data: Record<string, string> = {}) => {
    if (!vehicle) return;
    const applied = await fetchNui<boolean>('vehicleAction', { action, plate: vehicle.plate, data });
    if (!applied) return;
    await refreshProfile();
    if (action === 'DeleteVehicle') return openVehicle(null);

    const patch: Partial<PlayerVehicle> = {};
    if (data.NewState) patch.state = data.NewState;
    if (data.NewPlate) patch.plate = data.NewPlate;
    if (data.NewGarage !== undefined) patch.garage = data.NewGarage;
    setVehicle({ ...vehicle, ...patch });
  };

  const startAlignment = (type: 'job' | 'gang') => {
    const membership = type === 'job' ? job : gang;
    const currentId = typeof membership === 'string' ? membership : (membership?.name ?? '');
    const currentGrade = typeof membership === 'object' ? (membership.grade?.level ?? 0) : 0;
    setTarget({ id: currentId, grade: currentGrade });
    setAlignmentType(type);
  };

  const saveAlignment = async () => {
    if (!alignmentType) return;
    const applied = await fetchNui<boolean>('updateAlignment', {
      citizenid: player.CitizenId,
      type: alignmentType,
      alignment: target.id,
      grade: target.grade,
    });
    if (!applied) return;
    await refreshProfile();
    setAlignmentType(null);
  };

  const alignmentGroups = alignmentType === 'gang' ? gangs : jobs;
  const targetGrades = alignmentGroups.find((group) => group.id === target.id)?.grades ?? [];

  const identifiers = [
    { label: t('ui.pages.database.players.license'), value: player.License },
    { label: 'Steam', value: player.Steam },
    { label: 'Discord', value: player.Discord },
    { label: 'FiveM', value: player.Fivem },
    { label: t('ui.pages.database.players.hardware_id'), value: player.HardwareId },
  ].filter((identifier) => identifier.value);

  const jobLabel = membershipLabel(job, t('ui.pages.database.jobs_gangs.unemployed'));
  const gangLabel = membershipLabel(gang, t('ui.pages.database.players.no_gang'));
  const citizenId = player.CitizenId || player.License;

  const summary = [
    { key: 'cash', label: t('ui.pages.database.economy.cash'), value: formatMoney(money.cash) },
    { key: 'bank', label: t('ui.pages.database.economy.bank'), value: formatMoney(money.bank) },
    ...(money.crypto !== undefined
      ? [{ key: 'crypto', label: t('ui.pages.database.players.crypto'), value: Number(money.crypto).toLocaleString() }]
      : []),
    {
      key: 'worth',
      label: t('ui.pages.database.economy.net_worth'),
      value: formatMoney((Number(money.cash) || 0) + (Number(money.bank) || 0)),
    },
    { key: 'vehicles', label: t('ui.pages.database.players.owned_vehicles'), value: String(vehicles.length) },
    { key: 'properties', label: t('ui.pages.database.players.owned_properties'), value: String(properties.length) },
  ];

  return (
    <div className="flex flex-col h-full gap-4 relative">
      <Panel className="shrink-0 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4">
          <IconButton className="p-2" onClick={onBack} title={t('ui.pages.database.players.back')}>
            <ArrowLeft size={18} />
          </IconButton>
          <Avatar name={player.Name || '?'} src={player.AvatarUrl} online={isOnline} className="w-16 h-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <h3 className="text-3xl font-semibold text-primary leading-tight truncate">{player.Name}</h3>
            <div className="flex items-center gap-2.5 mt-1 text-lg text-primary/70 min-w-0">
              <span className="flex items-center gap-1.5 shrink-0">
                <StatusDot tone={isOnline ? 'success' : 'default'} />
                {isOnline ? t('ui.pages.database.players.online_now') : t('ui.pages.database.players.offline')}
              </span>
              {isOnline && player.ServerId > 0 && (
                <>
                  <span className="text-primary/30">|</span>
                  <span className="shrink-0">ID {player.ServerId}</span>
                </>
              )}
              <span className="text-primary/30">|</span>
              <span className="flex items-center gap-1 font-mono text-base shrink-0">
                {citizenId}
                <CopyButton text={citizenId} size={12} />
              </span>
              <span className="text-primary/30">|</span>
              <span className="truncate">{jobLabel}</span>
            </div>
          </div>
          {loading && <Loader2 size={18} className="animate-spin text-primary/60" />}
        </div>

        <div
          className="grid border-t border-white/5 divide-x divide-white/5"
          style={{ gridTemplateColumns: `repeat(${summary.length}, minmax(0, 1fr))` }}
        >
          {summary.map((item) => (
            <div key={item.key} className="px-5 py-3 min-w-0">
              <p className="text-base text-primary/60 truncate">{item.label}</p>
              <p className="text-2xl font-semibold text-primary tabular-nums truncate mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex-1 min-h-0 flex gap-4">
        <Panel className="w-[360px] shrink-0 overflow-y-auto custom-scrollbar pb-3">
          <GroupLabel>{t('ui.pages.database.players.basic_info')}</GroupLabel>
          <Row label={t('ui.pages.database.players.dob')}>{details?.dob || '-'}</Row>
          <Row label={t('ui.pages.database.players.blood_group')}>{details?.bloodgroup || '-'}</Row>
          <Row label={t('ui.pages.database.players.phone_number')}>
            {details?.phone || '-'}
            {details?.phone && <CopyButton text={details.phone} size={13} />}
          </Row>
          <Row label={t('ui.pages.database.players.job')}>
            <span className="truncate">{jobLabel}</span>
            <IconButton className="p-1" title={t('ui.pages.database.players.change_job')} onClick={() => startAlignment('job')}>
              <Pencil size={13} />
            </IconButton>
          </Row>
          <Row label={t('ui.pages.database.players.gang')}>
            <span className="truncate">{gangLabel}</span>
            <IconButton className="p-1" title={t('ui.pages.database.players.change_gang')} onClick={() => startAlignment('gang')}>
              <Pencil size={13} />
            </IconButton>
          </Row>

          {isOnline && (
            <>
              <GroupLabel>{t('ui.pages.database.players.live_status')}</GroupLabel>
              {player.Health !== undefined && (
                <Row label={t('ui.pages.database.players.health')}>
                  <Meter className="w-40" value={(player.Health / 200) * 100} />
                </Row>
              )}
              {player.Armor !== undefined && (
                <Row label={t('ui.pages.database.players.armor')}>
                  <Meter className="w-40" value={player.Armor} />
                </Row>
              )}
              {player.Ping !== undefined && (
                <Row label={t('ui.pages.database.players.ping')}>
                  <span className="tabular-nums">{player.Ping} ms</span>
                </Row>
              )}
              <Row label={t('ui.pages.database.players.radio')}>
                {player.Radio ? `${player.Radio} MHz` : t('ui.pages.database.players.radio_off')}
              </Row>
            </>
          )}

          <GroupLabel>{t('ui.pages.database.players.identifiers')}</GroupLabel>
          {identifiers.map((identifier) => (
            <Row key={identifier.label} label={identifier.label} mono>
              <span className="truncate">{identifier.value}</span>
              <CopyButton text={identifier.value || ''} size={13} />
            </Row>
          ))}
          {player.IP && (
            <Row label={t('ui.pages.database.players.ip')} mono>
              <span className="truncate">{ipRevealed ? player.IP : '••••••••••'}</span>
              <IconButton className="p-1" onClick={() => setIpRevealed((value) => !value)}>
                {ipRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
              </IconButton>
            </Row>
          )}

          {player.Note && (
            <>
              <GroupLabel>{t('ui.pages.database.players.staff_note')}</GroupLabel>
              <p className="px-5 py-1 text-lg text-primary whitespace-pre-wrap break-words">{player.Note}</p>
            </>
          )}
        </Panel>

        <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          <Panel className="overflow-hidden">
            <SectionTitle title={t('ui.pages.database.players.owned_vehicles')} count={vehicles.length} />
            {vehicles.length === 0 ? (
              <Empty>{t('ui.pages.database.players.no_vehicles_registered')}</Empty>
            ) : (
              <>
                <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_120px_repeat(3,minmax(0,0.8fr))] gap-5 px-5 py-2.5 border-b border-white/5 text-base text-primary/60">
                  <span>{t('ui.pages.database.vehicles.col_model')}</span>
                  <span>{t('ui.pages.database.vehicles.col_garage')}</span>
                  <span>{t('ui.pages.database.vehicles.col_state')}</span>
                  <span>{t('ui.pages.database.vehicles.fuel')}</span>
                  <span>{t('ui.pages.database.vehicles.engine')}</span>
                  <span>{t('ui.pages.database.players.body')}</span>
                </div>
                {vehicles.map((v) => (
                  <button
                    key={v.plate}
                    onClick={() => openVehicle(v)}
                    className="w-full grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_120px_repeat(3,minmax(0,0.8fr))] items-center gap-5 px-5 py-3 border-b border-white/5 last:border-0 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <VehicleImage model={v.model} image={v.image} className="w-40 h-[86px] rounded-md" />
                      <span className="min-w-0">
                        <span className="block text-lg font-semibold text-primary capitalize truncate">{v.model}</span>
                        <span className="block font-mono text-base text-primary/60 truncate">{v.plate}</span>
                      </span>
                    </span>
                    <span className="text-lg text-primary truncate">{v.garage || '-'}</span>
                    <span className="flex items-center gap-2 text-lg text-primary">
                      <StatusDot tone={vehicleStateTone(v.state)} />
                      {v.state}
                    </span>
                    <Meter value={v.fuel ?? 0} />
                    <Meter value={(v.engine ?? 1000) / 10} />
                    <Meter value={(v.body ?? 1000) / 10} />
                  </button>
                ))}
              </>
            )}
          </Panel>

          <Panel className="overflow-hidden">
            <SectionTitle title={t('ui.pages.database.players.owned_properties')} count={properties.length} />
            {properties.length === 0 ? (
              <Empty>{t('ui.pages.database.players.no_properties_owned')}</Empty>
            ) : (
              properties.map((p) => (
                <div
                  key={String(p.id ?? p.label)}
                  className="flex items-center justify-between gap-4 px-5 py-3 border-b border-white/5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-primary truncate">{p.label}</p>
                    <p className="text-lg text-primary/60 truncate">{p.address}</p>
                  </div>
                  <span className="text-lg text-primary/70 capitalize shrink-0">{p.type}</span>
                </div>
              ))
            )}
          </Panel>

          <Panel className="overflow-hidden">
            <SectionTitle title={t('ui.pages.database.players.player_inventory')} count={inventory.length} />
            {inventory.length === 0 ? (
              <Empty>{t('ui.pages.database.inventory.empty_sector_desc')}</Empty>
            ) : (
              <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5">
                {[...inventory]
                  .sort((a, b) => a.slot - b.slot)
                  .map((item) => (
                    <div
                      key={`${item.slot}-${item.name}`}
                      className="flex flex-col items-center rounded-lg border border-white/5 bg-black/20 p-3"
                      title={item.name}
                    >
                      <InventoryItemImage item={item} className="w-16 h-16 object-contain" />
                      <p className="mt-2 w-full text-center text-lg text-primary truncate">{item.label || item.name}</p>
                      <p className="text-base text-primary/60 tabular-nums">x{item.count}</p>
                    </div>
                  ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {vehicle && (
        <Modal
          title={vehicle.model.charAt(0).toUpperCase() + vehicle.model.slice(1)}
          subtitle={`${vehicle.plate} · ${vehicle.garage || '-'}`}
          onClose={() => openVehicle(null)}
          footer={
            confirmDelete ? (
              <>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="danger" onClick={() => vehicleAction('DeleteVehicle')}>
                  {t('ui.pages.database.vehicles.confirm_delete')}
                </Button>
              </>
            ) : (
              <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => setConfirmDelete(true)}>
                {t('ui.pages.database.vehicles.delete_vehicle')}
              </Button>
            )
          }
        >
          <div className="space-y-4">
            <VehicleImage model={vehicle.model} image={vehicle.image} className="w-full h-40 rounded-xl" />
            <div>
              <Field label={t('ui.pages.database.vehicles.engine')}>
                <Meter className="w-32" value={(vehicle.engine ?? 1000) / 10} />
              </Field>
              <Field label={t('ui.pages.database.players.body')}>
                <Meter className="w-32" value={(vehicle.body ?? 1000) / 10} />
              </Field>
              <Field label={t('ui.pages.database.vehicles.fuel')}>
                <Meter className="w-32" value={vehicle.fuel ?? 100} />
              </Field>
            </div>
            <div>
              <Label>{t('ui.pages.database.vehicles.set_status')}</Label>
              <Segmented
                fullWidth
                value={vehicle.state as (typeof STATES)[number]}
                onChange={(state) => state !== vehicle.state && vehicleAction('ChangeState', { NewState: state })}
                options={STATES.map((state) => ({ id: state, label: state }))}
              />
            </div>
            <div>
              <Label>{t('ui.pages.database.vehicles.change_plate')}</Label>
              <div className="flex gap-2">
                <input
                  className={`${inputClass} font-mono uppercase`}
                  value={newPlate}
                  maxLength={8}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                />
                <Button
                  icon={<Check size={13} />}
                  disabled={!newPlate.trim() || newPlate === vehicle.plate}
                  onClick={() => vehicleAction('ChangePlate', { NewPlate: newPlate.trim() })}
                />
              </div>
            </div>
            <div>
              <Label>{t('ui.pages.database.vehicles.garage_relocation')}</Label>
              <div className="flex gap-2">
                <Select
                  className="flex-1"
                  triggerClassName={inputClass}
                  value={newGarage}
                  onChange={setNewGarage}
                  options={[
                    { id: '', label: t('ui.pages.database.vehicles.deregistered_none') },
                    ...garages.map((garage) => ({ id: garage.Name, label: garage.Name })),
                  ]}
                />
                <Button
                  icon={<Check size={13} />}
                  disabled={newGarage === (vehicle.garage ?? '')}
                  onClick={() => vehicleAction('ChangeGarage', { NewGarage: newGarage })}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {alignmentType && (
        <Modal
          title={alignmentType === 'job' ? t('ui.pages.database.players.change_job') : t('ui.pages.database.players.change_gang')}
          subtitle={player.Name}
          onClose={() => setAlignmentType(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setAlignmentType(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" disabled={!target.id} onClick={saveAlignment}>
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
                options={alignmentGroups.map((group) => ({ id: group.id, label: `${group.label} (${group.id})` }))}
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

export default PlayerDetailView;
