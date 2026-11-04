import React, { useState, useMemo, useEffect } from 'react';
import { Car, Lock, Warehouse } from 'lucide-react';
import { useAdminMenu } from '../../../../../providers/AdminMenuContext';
import { SortSelect } from '../../../../ui/SortSelect';
import { CopyButton } from '../../../../ui/CopyButton';
import { vehicleStateTone } from '../Vehicles';
import {
  Column,
  DataTable,
  EmptyState,
  IconTile,
  ListHeader,
  ListItem,
  Meter,
  Panel,
  PanelHeader,
  Plate,
  Segmented,
  StatStrip,
  StatusDot,
  Toolbar,
  VehicleImage,
} from '../../ui';

type GarageFilter = 'all' | 'impounded' | 'empty';
type GarageSort = 'name' | 'vehicles';

interface GarageVehicle {
  plate: string;
  model: string;
  owner?: string;
  state: string;
  fuel?: number;
  engine?: number;
  image?: string;
}

interface GaragesProps {
  searchQuery: string;
}

const Garages: React.FC<GaragesProps> = ({ searchQuery }) => {
  const { garages, selectedPage, opened, requestData, t } = useAdminMenu();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [filter, setFilter] = useState<GarageFilter>('all');
  const [sort, setSort] = useState<GarageSort>('name');

  useEffect(() => {
    if (opened && selectedPage === 'Database') requestData('garages').catch(() => {});
  }, [opened, selectedPage, requestData]);

  // Search matches garage names and the vehicles parked in them.
  const visibleGarages = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const list = garages
      .map((garage) => {
        if (!query || garage.Name.toLowerCase().includes(query)) return garage;
        const vehicles = garage.Vehicles.filter((v) =>
          [v.model, v.plate, v.owner ?? ''].some((value) => value.toLowerCase().includes(query)),
        );
        return vehicles.length > 0 ? { ...garage, Vehicles: vehicles } : null;
      })
      .filter((garage): garage is (typeof garages)[number] => !!garage)
      .filter((garage) => {
        if (filter === 'impounded') return garage.Vehicles.some((v) => v.state === 'Impounded');
        if (filter === 'empty') return garage.Vehicles.length === 0;
        return true;
      });
    return sort === 'vehicles'
      ? list.sort((a, b) => b.Vehicles.length - a.Vehicles.length)
      : list.sort((a, b) => a.Name.localeCompare(b.Name));
  }, [garages, searchQuery, filter, sort]);

  const selected = visibleGarages.find((garage) => garage.Name === selectedName) ?? visibleGarages[0] ?? null;

  const totalVehicles = useMemo(() => garages.reduce((sum, g) => sum + g.Vehicles.length, 0), [garages]);
  const impounded = useMemo(
    () => garages.reduce((sum, g) => sum + g.Vehicles.filter((v) => v.state === 'Impounded').length, 0),
    [garages],
  );

  const columns: Column<GarageVehicle>[] = [
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
      header: t('ui.pages.database.garages.plate'),
      width: '150px',
      render: (v) => (
        <span className="flex items-center gap-1">
          <Plate plate={v.plate} />
          <CopyButton text={v.plate} size={11} className="opacity-0 group-hover:opacity-100" />
        </span>
      ),
    },
    {
      key: 'owner',
      header: t('ui.pages.database.garages.owner_cid'),
      width: 'minmax(0,1fr)',
      render: (v) => <span className="font-mono text-sm text-primary/80 truncate">{v.owner || '-'}</span>,
    },
    {
      key: 'state',
      header: t('ui.pages.database.vehicles.col_state'),
      width: '130px',
      render: (v) => <StatusDot tone={vehicleStateTone(v.state)} label={v.state} />,
    },
    {
      key: 'fuel',
      header: t('ui.pages.database.vehicles.fuel'),
      width: '120px',
      render: (v) => <Meter className="w-full" value={v.fuel ?? 0} />,
    },
    {
      key: 'engine',
      header: t('ui.pages.database.vehicles.engine'),
      width: '120px',
      render: (v) => <Meter className="w-full" value={(v.engine ?? 0) / 10} />,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      <StatStrip
        items={[
          { label: t('ui.pages.database.garages.total_garages'), value: garages.length, icon: <Warehouse size={18} /> },
          {
            label: t('ui.pages.database.garages.total_vehicles'),
            value: totalVehicles.toLocaleString(),
            icon: <Car size={18} />,
            tone: 'success',
          },
          { label: t('ui.pages.database.garages.impounded'), value: impounded, icon: <Lock size={18} />, tone: 'danger' },
        ]}
      />

      <Toolbar>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: t('ui.pages.database.filter_all') },
            { id: 'impounded', label: t('ui.pages.database.garages.with_impounded') },
            { id: 'empty', label: t('ui.pages.database.garages.empty') },
          ]}
        />
        <SortSelect
          value={sort}
          onChange={setSort}
          options={[
            { id: 'name', label: t('ui.pages.database.sort_name') },
            { id: 'vehicles', label: t('ui.pages.database.garages.sort_vehicles') },
          ]}
        />
      </Toolbar>

      <div className="flex-1 min-h-0 flex gap-3">
        <Panel className="w-[280px] shrink-0 flex flex-col overflow-hidden">
          <ListHeader left={t('ui.pages.database.garages.registered')} right={<span>{visibleGarages.length}</span>} />
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {visibleGarages.length === 0 ? (
              <EmptyState icon={<Warehouse size={40} />} title={t('ui.pages.database.garages.no_results')} />
            ) : (
              visibleGarages.map((garage) => {
                const impoundedHere = garage.Vehicles.filter((v) => v.state === 'Impounded').length;
                const active = selected?.Name === garage.Name;
                return (
                  <ListItem
                    key={garage.Name}
                    active={active}
                    onClick={() => setSelectedName(garage.Name)}
                    media={
                      <IconTile tone={active ? 'accent' : 'default'} className="w-9 h-9 rounded-lg">
                        <Warehouse size={15} />
                      </IconTile>
                    }
                    title={garage.Name}
                    subtitle={t('ui.pages.database.garages.registered_vehicles', String(garage.Vehicles.length))}
                    right={impoundedHere > 0 && <StatusDot tone="danger" label={impoundedHere} />}
                  />
                );
              })
            )}
          </div>
        </Panel>

        <Panel className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {selected ? (
            <>
              <PanelHeader
                media={
                  <IconTile className="w-10 h-10">
                    <Warehouse size={18} />
                  </IconTile>
                }
                title={selected.Name}
                subtitle={t('ui.pages.database.garages.registered_vehicles', String(selected.Vehicles.length))}
              />
              <DataTable
                className="flex-1"
                columns={columns}
                rows={selected.Vehicles}
                rowKey={(v) => v.plate}
                empty={<EmptyState icon={<Car size={40} />} title={t('ui.pages.database.garages.no_vehicles')} />}
              />
            </>
          ) : (
            <EmptyState className="flex-1" icon={<Warehouse size={40} />} title={t('ui.pages.database.garages.no_results')} />
          )}
        </Panel>
      </div>
    </div>
  );
};

export default Garages;
