import React, { useState, useEffect, useCallback } from 'react';
import { Car, Check, Lock, MapPin, Trash2, Warehouse } from 'lucide-react';
import { useAdminMenu } from '../../../../../providers/AdminMenuContext';
import { fetchNui } from '../../../../../utils/fetchNui';
import { PlayerVehicle } from '../../../../../types';
import Pagination from '../../../../ui/Pagination';
import { CopyButton } from '../../../../ui/CopyButton';
import { Select } from '../../../../ui/Select';
import {
  Button,
  Column,
  DataTable,
  EmptyState,
  Field,
  Label,
  Meter,
  Panel,
  PanelHeader,
  Plate,
  Section,
  Segmented,
  StatStrip,
  StatusDot,
  Tone,
  Toolbar,
  VehicleImage,
  inputClass,
} from '../../ui';

const ITEMS_PER_PAGE = 25;
const STATES = ['Stored', 'Out', 'Impounded'] as const;

type StateFilter = 'all' | (typeof STATES)[number];
type VehicleAction = 'ChangeState' | 'ChangePlate' | 'ChangeGarage' | 'DeleteVehicle';

interface VehicleActionData {
  NewState?: string;
  NewPlate?: string;
  NewGarage?: string;
}

export const vehicleStateTone = (state: string): Tone =>
  state === 'Stored' ? 'success' : state === 'Impounded' ? 'danger' : 'warning';

interface VehiclesProps {
  searchQuery: string;
}

const Vehicles: React.FC<VehiclesProps> = ({ searchQuery }) => {
  const { vehicles, vehiclesTotal, vehicleStateCounts, setVehicles, garages, t, selectedPage, opened, requestData } =
    useAdminMenu();
  const [selected, setSelected] = useState<PlayerVehicle | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [loading, setLoading] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newGarage, setNewGarage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<VehicleAction | null>(null);

  const refreshVehicles = useCallback(() => {
    setLoading(true);
    return requestData('vehicles', { page: currentPage, limit: ITEMS_PER_PAGE, search: searchQuery, state: stateFilter })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestData, currentPage, searchQuery, stateFilter]);

  useEffect(() => {
    if (!opened || selectedPage !== 'Database') return;
    const timer = setTimeout(refreshVehicles, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [opened, selectedPage, searchQuery, refreshVehicles]);

  // The garage list feeds the "Move to garage" select.
  useEffect(() => {
    if (opened && selectedPage === 'Database') requestData('garages').catch(() => {});
  }, [opened, selectedPage, requestData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, stateFilter]);

  const select = (vehicle: PlayerVehicle | null) => {
    setSelected(vehicle);
    setNewPlate(vehicle?.plate ?? '');
    setNewGarage(vehicle?.garage ?? '');
    setConfirmDelete(false);
  };

  const handleAction = async (action: VehicleAction, data: VehicleActionData = {}) => {
    if (!selected || busy) return;
    setBusy(action);

    const previousList = vehicles;
    const previousSelected = selected;
    const patch: Partial<PlayerVehicle> =
      action === 'ChangeState'
        ? { state: data.NewState }
        : action === 'ChangeGarage'
          ? { garage: data.NewGarage }
          : action === 'ChangePlate'
            ? { plate: data.NewPlate }
            : {};

    // Optimistic update, rolled back if the server refuses.
    if (action === 'DeleteVehicle') {
      setVehicles((prev) => prev.filter((v) => v.plate !== selected.plate));
      select(null);
    } else {
      setVehicles((prev) => prev.map((v) => (v.plate === selected.plate ? { ...v, ...patch } : v)));
      setSelected({ ...selected, ...patch });
    }

    try {
      const applied = await fetchNui<boolean>('vehicleAction', { action, plate: previousSelected.plate, data });
      if (!applied) {
        setVehicles(previousList);
        select(previousSelected);
      } else {
        refreshVehicles();
      }
    } catch {
      setVehicles(previousList);
      select(previousSelected);
    } finally {
      setBusy(null);
    }
  };

  const stateLabel = (state: string) =>
    state === 'Stored'
      ? t('ui.pages.database.vehicles.state_stored')
      : state === 'Impounded'
        ? t('ui.pages.database.vehicles.impounded')
        : t('ui.pages.database.vehicles.state_out');

  const columns: Column<PlayerVehicle>[] = [
    {
      key: 'model',
      header: t('ui.pages.database.vehicles.col_model'),
      width: 'minmax(0,1.6fr)',
      render: (v) => (
        <span className="flex items-center gap-3 min-w-0">
          <VehicleImage model={v.model} image={v.image} />
          <span className="text-primary font-semibold truncate capitalize">{v.model}</span>
        </span>
      ),
    },
    {
      key: 'plate',
      header: t('ui.pages.database.vehicles.plate'),
      width: '130px',
      render: (v) => <Plate plate={v.plate} />,
    },
    {
      key: 'owner',
      header: t('ui.pages.database.vehicles.col_owner'),
      width: 'minmax(0,1fr)',
      render: (v) => <span className="font-mono text-sm text-primary/80 truncate">{v.owner || '-'}</span>,
    },
    {
      key: 'garage',
      header: t('ui.pages.database.vehicles.col_garage'),
      width: 'minmax(0,1fr)',
      render: (v) => <span className="text-primary/80 truncate">{v.garage || '-'}</span>,
    },
    {
      key: 'state',
      header: t('ui.pages.database.vehicles.col_state'),
      width: '130px',
      render: (v) => <StatusDot tone={vehicleStateTone(v.state)} label={stateLabel(v.state)} />,
    },
    {
      key: 'fuel',
      header: t('ui.pages.database.vehicles.fuel'),
      width: '130px',
      render: (v) => <Meter className="w-full" value={v.fuel ?? 0} />,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      <StatStrip
        items={[
          {
            label: t('ui.pages.database.vehicles.total_vehicles'),
            value: STATES.reduce((sum, state) => sum + (vehicleStateCounts[state] ?? 0), 0).toLocaleString(),
            icon: <Car size={18} />,
          },
          {
            label: t('ui.pages.database.vehicles.state_stored'),
            value: vehicleStateCounts.Stored ?? 0,
            icon: <Warehouse size={18} />,
            tone: 'success',
          },
          {
            label: t('ui.pages.database.vehicles.state_out'),
            value: vehicleStateCounts.Out ?? 0,
            icon: <MapPin size={18} />,
            tone: 'warning',
          },
          {
            label: t('ui.pages.database.vehicles.impounded'),
            value: vehicleStateCounts.Impounded ?? 0,
            icon: <Lock size={18} />,
            tone: 'danger',
          },
        ]}
      />

      <Toolbar>
        <Segmented
          value={stateFilter}
          onChange={setStateFilter}
          options={[
            { id: 'all', label: t('ui.pages.database.filter_all') },
            ...STATES.map((state) => ({ id: state, label: stateLabel(state), count: vehicleStateCounts[state] })),
          ]}
        />
        <span className="ml-auto font-mono text-[13px] text-primary/80">
          {t('ui.pages.database.result_count', vehiclesTotal.toLocaleString())}
        </span>
      </Toolbar>

      <div className="flex-1 min-h-0 flex gap-3">
        <Panel className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <DataTable
            className="flex-1"
            columns={selected ? columns.filter((column) => !['owner', 'garage'].includes(column.key)) : columns}
            rows={vehicles}
            rowKey={(v) => v.plate}
            onRowClick={(v) => select(selected?.plate === v.plate ? null : v)}
            selectedKey={selected?.plate}
            loading={loading}
            empty={<EmptyState icon={<Car size={40} />} title={t('ui.pages.database.vehicles.no_results')} />}
          />
          {vehiclesTotal > ITEMS_PER_PAGE && (
            <div className="px-4 py-2 border-t border-white/5">
              <Pagination
                currentPage={currentPage}
                totalItems={vehiclesTotal}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                label={t('ui.pages.database.vehicles.label')}
              />
            </div>
          )}
        </Panel>

        {selected && (
          <Panel className="w-[320px] shrink-0 flex flex-col overflow-hidden animate-in slide-in-from-right-2 duration-200">
            <PanelHeader
              title={<span className="capitalize">{selected.model}</span>}
              subtitle={
                <span className="flex items-center gap-1 font-mono">
                  {selected.plate}
                  <CopyButton text={selected.plate} size={11} />
                </span>
              }
              onClose={() => select(null)}
            />
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
              <div className="relative">
                <VehicleImage model={selected.model} image={selected.image} className="w-full h-36 rounded-xl" />
                <StatusDot
                  className="absolute top-2 left-2"
                  tone={vehicleStateTone(selected.state)}
                  label={stateLabel(selected.state)}
                />
              </div>

              <Section title={t('ui.pages.database.vehicles.vehicle_info')}>
                <div>
                  <Field label={t('ui.pages.database.vehicles.col_owner')} mono>
                    {selected.owner || '-'}
                    {selected.owner && <CopyButton text={selected.owner} size={11} />}
                  </Field>
                  <Field label={t('ui.pages.database.vehicles.col_garage')}>{selected.garage || '-'}</Field>
                  <Field label={t('ui.pages.database.vehicles.fuel')}>
                    <Meter className="w-28" value={selected.fuel ?? 0} />
                  </Field>
                  <Field label={t('ui.pages.database.vehicles.engine')}>
                    <Meter className="w-28" value={(selected.engine ?? 0) / 10} />
                  </Field>
                  {selected.body !== undefined && (
                    <Field label={t('ui.pages.database.players.body')}>
                      <Meter className="w-28" value={selected.body / 10} />
                    </Field>
                  )}
                </div>
              </Section>

              <Section title={t('ui.pages.database.vehicles.set_status')}>
                <Segmented
                  fullWidth
                  value={selected.state as (typeof STATES)[number]}
                  onChange={(state) => state !== selected.state && handleAction('ChangeState', { NewState: state })}
                  options={STATES.map((state) => ({ id: state, label: stateLabel(state) }))}
                />
              </Section>

              <div>
                <Label>{t('ui.pages.database.vehicles.change_plate')}</Label>
                <div className="flex gap-2">
                  <input
                    className={`${inputClass} font-mono uppercase`}
                    value={newPlate}
                    maxLength={8}
                    placeholder={t('ui.pages.database.vehicles.enter_new_plate')}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  />
                  <Button
                    icon={<Check size={13} />}
                    busy={busy === 'ChangePlate'}
                    disabled={!newPlate.trim() || newPlate === selected.plate}
                    onClick={() => handleAction('ChangePlate', { NewPlate: newPlate.trim() })}
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
                    busy={busy === 'ChangeGarage'}
                    disabled={newGarage === (selected.garage ?? '')}
                    onClick={() => handleAction('ChangeGarage', { NewGarage: newGarage })}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/5">
              {confirmDelete ? (
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    busy={busy === 'DeleteVehicle'}
                    onClick={() => handleAction('DeleteVehicle')}
                  >
                    {t('ui.pages.database.vehicles.confirm_delete')}
                  </Button>
                </div>
              ) : (
                <Button variant="danger" className="w-full" icon={<Trash2 size={13} />} onClick={() => setConfirmDelete(true)}>
                  {t('ui.pages.database.vehicles.delete_vehicle')}
                </Button>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};

export default Vehicles;
