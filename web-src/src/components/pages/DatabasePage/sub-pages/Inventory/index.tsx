import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Archive,
  Box,
  Car,
  Eraser,
  Layers,
  LayoutGrid,
  List,
  LucideIcon,
  Package,
  Plus,
  RefreshCw,
  Search,
  Shapes,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import { useAdminMenu, toArray } from '../../../../../providers/AdminMenuContext';
import { Inventory, InventoryItem } from '../../../../../types';
import { fetchNui } from '../../../../../utils/fetchNui';
import { cn } from '../../../../../utils/cn';
import Pagination from '../../../../ui/Pagination';
import { InventoryItemImage } from '../../../../ui/InventoryItemImage';
import { SearchField } from '../../../../ui/SearchField';
import { SortSelect } from '../../../../ui/SortSelect';
import { CopyButton } from '../../../../ui/CopyButton';
import { ItemInspector, metadataEntries } from './ItemInspector';
import {
  Badge,
  Button,
  Column,
  DataTable,
  EmptyState,
  IconButton,
  IconTile,
  Label,
  ListHeader,
  ListItem,
  Modal,
  Panel,
  PanelHeader,
  StatusDot,
  Toolbar,
  inputClass,
} from '../../ui';

type ContainerType = 'player' | 'stash' | 'trunk' | 'glovebox';
type ItemSort = 'slot' | 'name' | 'count';
type ViewMode = 'grid' | 'list';

const CONTAINERS_PER_PAGE = 15;
const CONTAINER_TYPES: ContainerType[] = ['player', 'stash', 'trunk', 'glovebox'];
const QUICK_AMOUNTS = [1, 5, 10, 50];

const CONTAINER_ICONS: Record<ContainerType, LucideIcon> = {
  player: User,
  stash: Archive,
  trunk: Car,
  glovebox: Box,
};

const VIEW_MODES: { id: ViewMode; icon: LucideIcon; label: string }[] = [
  { id: 'grid', icon: LayoutGrid, label: 'ui.pages.database.inventory.grid_view' },
  { id: 'list', icon: List, label: 'ui.pages.database.inventory.list_view' },
];

// The server tags online players by appending this to the inventory label.
const ONLINE_SUFFIX = ' [ONLINE]';

const splitLabel = (label: string) =>
  label.endsWith(ONLINE_SUFFIX)
    ? { name: label.slice(0, -ONLINE_SUFFIX.length), online: true }
    : { name: label, online: false };

const itemKey = (item: InventoryItem) => `${item.slot}-${item.name}`;

const ItemSlot: React.FC<{ item: InventoryItem; active: boolean; onClick: () => void }> = ({ item, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'group relative flex flex-col min-w-0 overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200',
      active
        ? 'border-accent/50 bg-accent/10 shadow-[0_0_0_1px_rgb(var(--accent)/0.25)]'
        : 'border-white/5 bg-gradient-to-b from-white/[0.05] to-white/[0.01] hover:border-white/15 hover:from-white/[0.08]',
    )}
  >
    <span className="absolute top-2 left-2.5 flex items-center gap-1 font-mono text-xs text-primary/60 tabular-nums">
      {item.slot}
      {metadataEntries(item).length > 0 && <Tag size={10} className="text-accent/80" />}
    </span>
    <span className="absolute top-1.5 right-1.5 px-1.5 py-1 rounded-md bg-accent/15 font-rajdhani font-bold text-sm text-accent tabular-nums leading-none">
      x{item.count}
    </span>
    <span className="h-24 pt-4 flex items-center justify-center">
      <InventoryItemImage
        item={item}
        className="w-14 h-14 object-contain drop-shadow-lg transition-transform duration-200 group-hover:scale-110"
      />
    </span>
    <span className="block text-sm font-semibold text-primary truncate" title={item.label || item.name}>
      {item.label || item.name}
    </span>
    <span className="block font-mono text-xs text-primary/60 truncate" title={item.name}>
      {item.name}
    </span>
  </button>
);

const EmptySlot: React.FC<{ slot: number }> = ({ slot }) => (
  <div className="rounded-xl border border-dashed border-white/[0.07] bg-black/10 p-2.5 min-h-[152px]">
    <span className="font-mono text-xs text-primary/30 tabular-nums">{slot}</span>
  </div>
);

interface InventoryProps {
  searchQuery: string;
}

const InventoryHub: React.FC<InventoryProps> = ({ searchQuery }) => {
  const { opened, selectedPage, t } = useAdminMenu();

  const [category, setCategory] = useState<ContainerType>('player');
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [containerSearch, setContainerSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Inventory | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemSort, setItemSort] = useState<ItemSort>('slot');
  const [view, setView] = useState<ViewMode>('grid');
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', count: 1 });
  const [removing, setRemoving] = useState<{ item: InventoryItem; count: number } | null>(null);
  const [clearing, setClearing] = useState(false);

  const activeSearch = containerSearch || searchQuery;

  const loadContainers = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const res = await fetchNui<{ inventories: Inventory[]; totalCount: number } | false>('fetchInventories', {
          type: category,
          offset: (page - 1) * CONTAINERS_PER_PAGE,
          limit: CONTAINERS_PER_PAGE,
          search: activeSearch,
        });
        setInventories(res ? toArray<Inventory>(res.inventories) : []);
        setTotalCount(res ? Number(res.totalCount) || 0 : 0);
      } catch {
        setInventories([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [category, activeSearch],
  );

  const loadItems = useCallback(async (invId: string) => {
    setItemsLoading(true);
    try {
      setItems(toArray(await fetchNui<InventoryItem[]>('fetchInventoryItems', { invId }, [])));
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelected(null);
  }, [category, activeSearch]);

  useEffect(() => {
    if (!opened || selectedPage !== 'Database') return;
    const timer = setTimeout(() => loadContainers(currentPage), activeSearch ? 300 : 0);
    return () => clearTimeout(timer);
  }, [opened, selectedPage, currentPage, activeSearch, loadContainers]);

  const selectedId = selected?.id;
  useEffect(() => {
    setItemSearch('');
    setSelectedItemKey(null);
    if (selectedId) loadItems(selectedId);
    else setItems([]);
  }, [selectedId, loadItems]);

  const visibleItems = useMemo(() => {
    const query = itemSearch.toLowerCase();
    const list = items.filter(
      (item) => !query || item.name.toLowerCase().includes(query) || item.label?.toLowerCase().includes(query),
    );
    if (itemSort === 'name') return list.sort((a, b) => (a.label || a.name).localeCompare(b.label || b.name));
    if (itemSort === 'count') return list.sort((a, b) => b.count - a.count);
    return list.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  }, [items, itemSearch, itemSort]);

  // In slot order the grid mirrors the real inventory, so gaps show up as empty slots.
  const gridCells = useMemo<(InventoryItem | number)[]>(() => {
    if (itemSort !== 'slot' || itemSearch) return visibleItems;
    const bySlot = new Map(visibleItems.map((item) => [item.slot, item]));
    const slotted = visibleItems.every((item) => Number.isInteger(item.slot) && item.slot > 0);
    if (!slotted || bySlot.size !== visibleItems.length) return visibleItems;
    const lastSlot = Math.max(0, ...bySlot.keys());
    return Array.from({ length: lastSlot }, (_, i) => bySlot.get(i + 1) ?? i + 1);
  }, [visibleItems, itemSort, itemSearch]);

  const stats = useMemo(
    () => ({
      total: items.reduce((sum, item) => sum + (Number(item.count) || 0), 0),
      unique: new Set(items.map((item) => item.name)).size,
      withMetadata: items.filter((item) => metadataEntries(item).length > 0).length,
    }),
    [items],
  );

  const selectedItem = items.find((item) => itemKey(item) === selectedItemKey) ?? null;
  const selectedLabel = selected ? splitLabel(selected.label) : null;
  const SelectedIcon = CONTAINER_ICONS[selected?.type ?? 'player'];

  const runAction = async (action: 'AddItem' | 'RemoveItem' | 'Wipe', data: Record<string, unknown> = {}) => {
    if (!selected) return false;
    const applied = await fetchNui<boolean>('inventoryAction', { action, invId: selected.id, data }).catch(() => false);
    if (applied) loadItems(selected.id);
    return !!applied;
  };

  const addItem = async () => {
    if (!newItem.name.trim()) return;
    if (await runAction('AddItem', { item: newItem.name.trim(), count: newItem.count })) {
      setAddOpen(false);
      setNewItem({ name: '', count: 1 });
    }
  };

  const removeItem = async () => {
    if (!removing) return;
    const { item, count } = removing;
    if (await runAction('RemoveItem', { item: item.name, slot: item.slot, count })) setRemoving(null);
  };

  const clearInventory = async () => {
    if (await runAction('Wipe')) setClearing(false);
  };

  const toggleItem = (item: InventoryItem) => {
    const key = itemKey(item);
    setSelectedItemKey((current) => (current === key ? null : key));
  };

  const columns: Column<InventoryItem>[] = [
    {
      key: 'slot',
      header: t('ui.pages.database.inventory.sort_slot'),
      width: '48px',
      render: (item) => <span className="font-mono text-sm text-primary/70 tabular-nums">#{item.slot}</span>,
    },
    {
      key: 'item',
      header: t('ui.pages.database.inventory.item_header'),
      width: 'minmax(0,1fr)',
      render: (item) => (
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center shrink-0">
            <InventoryItemImage item={item} className="w-8 h-8 object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-primary truncate">{item.label || item.name}</span>
            <span className="block font-mono text-[13px] text-primary/70 truncate">{item.name}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'metadata',
      header: t('ui.pages.database.inventory.metadata'),
      width: '96px',
      render: (item) => {
        const count = metadataEntries(item).length;
        if (!count) return <span className="text-primary/40">-</span>;
        return (
          <Badge tone="accent" className="gap-1">
            <Tag size={10} />
            {count}
          </Badge>
        );
      },
    },
    {
      key: 'count',
      header: t('ui.pages.database.inventory.sort_count'),
      width: '72px',
      align: 'right',
      render: (item) => <span className="font-rajdhani font-bold text-lg text-accent tabular-nums">x{item.count}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '44px',
      align: 'right',
      render: (item) => (
        <IconButton
          tone="danger"
          title={t('ui.pages.database.inventory.delete')}
          onClick={(e) => {
            e.stopPropagation();
            setRemoving({ item, count: item.count });
          }}
        >
          <Trash2 size={14} />
        </IconButton>
      ),
    },
  ];

  const renderItems = () => {
    if (itemsLoading && items.length === 0) {
      return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-2.5 p-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-[152px] rounded-xl border border-white/5 bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          className="flex-1"
          icon={<Package size={40} />}
          title={t('ui.pages.database.inventory.empty_sector')}
          hint={t('ui.pages.database.inventory.empty_sector_desc')}
        />
      );
    }
    if (visibleItems.length === 0) {
      return (
        <EmptyState className="flex-1" icon={<Search size={40} />} title={t('ui.pages.database.inventory.no_matching_items')} />
      );
    }
    if (view === 'list') {
      return (
        <DataTable
          className="flex-1"
          columns={columns}
          rows={visibleItems}
          rowKey={itemKey}
          selectedKey={selectedItemKey}
          onRowClick={toggleItem}
        />
      );
    }
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-2.5">
          {gridCells.map((cell) =>
            typeof cell === 'number' ? (
              <EmptySlot key={`empty-${cell}`} slot={cell} />
            ) : (
              <ItemSlot
                key={itemKey(cell)}
                item={cell}
                active={itemKey(cell) === selectedItemKey}
                onClick={() => toggleItem(cell)}
              />
            ),
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full gap-4">
      <Panel className="w-[300px] shrink-0 flex flex-col overflow-hidden">
        <div className="p-2 space-y-2 border-b border-white/5">
          <div className="grid grid-cols-4 gap-1">
            {CONTAINER_TYPES.map((type) => {
              const Icon = CONTAINER_ICONS[type];
              const active = category === type;
              return (
                <button
                  key={type}
                  onClick={() => setCategory(type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-2.5 rounded-lg border font-rajdhani font-bold text-xs uppercase tracking-wider transition-all duration-200',
                    active
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'border-transparent text-primary/70 hover:text-primary hover:bg-white/5',
                  )}
                >
                  <Icon size={16} />
                  {t(`ui.pages.database.inventory.${type}_tab`)}
                </button>
              );
            })}
          </div>
          <SearchField
            value={containerSearch}
            onChange={setContainerSearch}
            placeholder={t('ui.pages.database.inventory.search_containers_placeholder')}
          />
        </div>

        <ListHeader
          left={t('ui.pages.database.inventory.total_nodes')}
          right={
            <span className="flex items-center gap-1 tabular-nums">
              {totalCount}
              <IconButton className="p-1" spinning={loading} onClick={() => loadContainers(currentPage)}>
                <RefreshCw size={11} />
              </IconButton>
            </span>
          }
        />
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {inventories.length === 0 ? (
            <EmptyState
              icon={<Package size={40} />}
              title={
                loading ? t('ui.pages.database.inventory.syncing_registry') : t('ui.pages.database.inventory.zero_nodes')
              }
            />
          ) : (
            inventories.map((inv) => {
              const active = selected?.id === inv.id;
              const Icon = CONTAINER_ICONS[inv.type];
              const { name, online } = splitLabel(inv.label);
              return (
                <ListItem
                  key={inv.id}
                  active={active}
                  onClick={() => setSelected(inv)}
                  media={
                    <IconTile tone={active ? 'accent' : 'default'} className="w-9 h-9 rounded-lg">
                      <Icon size={15} />
                    </IconTile>
                  }
                  title={name}
                  subtitle={inv.id}
                  right={online ? <StatusDot tone="success" /> : undefined}
                />
              );
            })
          )}
        </div>
        {totalCount > CONTAINERS_PER_PAGE && (
          <div className="px-3 py-2 border-t border-white/5">
            <Pagination
              currentPage={currentPage}
              totalItems={totalCount}
              itemsPerPage={CONTAINERS_PER_PAGE}
              onPageChange={setCurrentPage}
              label={t('ui.pages.database.inventory.nodes_pagination')}
              stacked
            />
          </div>
        )}
      </Panel>

      <Panel className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {!selected || !selectedLabel ? (
          <EmptyState
            className="flex-1"
            icon={<Package size={40} />}
            title={t('ui.pages.database.inventory.access_restricted')}
            hint={t('ui.pages.database.inventory.access_restricted_desc')}
          />
        ) : (
          <>
            <PanelHeader
              media={
                <IconTile className="w-11 h-11">
                  <SelectedIcon size={19} />
                </IconTile>
              }
              title={
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate min-w-0">{selectedLabel.name}</span>
                  <Badge>{t(`ui.pages.database.inventory.${selected.type}_tab`)}</Badge>
                  {selectedLabel.online && <StatusDot tone="success" label={t('ui.pages.database.inventory.online')} />}
                </span>
              }
              subtitle={
                <span className="flex items-center gap-1">
                  {selected.id}
                  <CopyButton text={selected.id} size={11} />
                </span>
              }
              actions={
                <>
                  <IconButton spinning={itemsLoading} onClick={() => loadItems(selected.id)}>
                    <RefreshCw size={14} />
                  </IconButton>
                  <IconButton
                    tone="danger"
                    title={t('ui.pages.database.inventory.clear_inventory')}
                    disabled={items.length === 0}
                    onClick={() => setClearing(true)}
                  >
                    <Eraser size={14} />
                  </IconButton>
                  <Button variant="primary" icon={<Plus size={13} />} onClick={() => setAddOpen(true)}>
                    {t('ui.pages.database.inventory.add_item')}
                  </Button>
                </>
              }
            />

            <div className="flex flex-wrap gap-x-8 gap-y-3 px-5 py-3 border-b border-white/5 shrink-0">
              {[
                { label: t('ui.pages.database.inventory.stacks'), value: items.length, icon: Layers },
                { label: t('ui.pages.database.inventory.total_items'), value: stats.total, icon: Package },
                { label: t('ui.pages.database.inventory.unique_items'), value: stats.unique, icon: Shapes },
                { label: t('ui.pages.database.inventory.with_metadata'), value: stats.withMetadata, icon: Tag },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon size={16} className="text-accent shrink-0" />
                  <div className="min-w-0 leading-none">
                    <p className="font-rajdhani font-bold text-xl text-primary tabular-nums">{value}</p>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-primary/70 mt-1 whitespace-nowrap">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <Toolbar className="px-4 py-3 border-b border-white/5">
              <SearchField
                className="flex-1 max-w-xs"
                value={itemSearch}
                onChange={setItemSearch}
                placeholder={t('ui.pages.database.inventory.search_items_placeholder')}
              />
              <SortSelect
                value={itemSort}
                onChange={setItemSort}
                options={[
                  { id: 'slot', label: t('ui.pages.database.inventory.sort_slot') },
                  { id: 'name', label: t('ui.pages.database.sort_name') },
                  { id: 'count', label: t('ui.pages.database.inventory.sort_count') },
                ]}
              />
              <div className="ml-auto flex gap-1 p-1 rounded-lg bg-black/30 border border-white/5">
                {VIEW_MODES.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    title={t(label)}
                    onClick={() => setView(id)}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      view === id ? 'bg-accent text-white' : 'text-primary/70 hover:text-primary hover:bg-white/5',
                    )}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </Toolbar>

            {renderItems()}
          </>
        )}
      </Panel>

      {selectedItem && (
        <ItemInspector
          key={`${itemKey(selectedItem)}-${selectedItem.count}`}
          item={selectedItem}
          onClose={() => setSelectedItemKey(null)}
          onRemove={(count) => setRemoving({ item: selectedItem, count })}
        />
      )}

      {addOpen && (
        <Modal
          title={t('ui.pages.database.inventory.asset_dispatch')}
          subtitle={selectedLabel?.name}
          media={
            <IconTile className="w-10 h-10">
              <Plus size={18} />
            </IconTile>
          }
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                {t('ui.pages.database.inventory.cancel')}
              </Button>
              <Button variant="primary" disabled={!newItem.name.trim()} onClick={addItem}>
                {t('ui.pages.database.inventory.confirm_dispatch')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label>{t('ui.pages.database.inventory.asset_identifier')}</Label>
              <input
                autoFocus
                className={inputClass}
                placeholder={t('ui.pages.database.inventory.asset_identifier_placeholder')}
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
              />
            </div>
            <div>
              <Label>{t('ui.pages.database.inventory.quantity_factor')}</Label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={newItem.count}
                  onChange={(e) => setNewItem({ ...newItem, count: Math.max(1, parseInt(e.target.value) || 1) })}
                />
                {QUICK_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    className={cn('shrink-0 px-3', newItem.count === amount && 'border-accent/40 text-accent')}
                    onClick={() => setNewItem({ ...newItem, count: amount })}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {removing && (
        <Modal
          title={t('ui.pages.database.inventory.destroy_asset')}
          onClose={() => setRemoving(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                {t('ui.pages.database.inventory.cancel')}
              </Button>
              <Button variant="danger" onClick={removeItem}>
                {t('ui.pages.database.inventory.confirm_destruction')}
              </Button>
            </>
          }
        >
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-black/30 border border-white/5 flex items-center justify-center shrink-0">
              <InventoryItemImage item={removing.item} className="w-12 h-12 object-contain" />
            </div>
            <p className="text-base text-primary/80">
              {t(
                'ui.pages.database.inventory.destroy_asset_confirm',
                `${removing.count}x ${removing.item.label || removing.item.name}`,
              )}
            </p>
          </div>
        </Modal>
      )}

      {clearing && selectedLabel && (
        <Modal
          title={t('ui.pages.database.inventory.confirm_clear')}
          media={
            <IconTile tone="danger" className="w-10 h-10">
              <Eraser size={18} />
            </IconTile>
          }
          onClose={() => setClearing(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setClearing(false)}>
                {t('ui.pages.database.inventory.cancel')}
              </Button>
              <Button variant="danger" onClick={clearInventory}>
                {t('ui.pages.database.inventory.confirm_clear')}
              </Button>
            </>
          }
        >
          <p className="text-base text-primary/80">
            {t(
              'ui.pages.database.inventory.clear_inventory_confirm',
              String(stats.total),
              selectedLabel.name,
            )}
          </p>
        </Modal>
      )}
    </div>
  );
};

export default InventoryHub;
