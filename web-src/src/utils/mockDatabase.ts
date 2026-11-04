import { Player, PlayerVehicle, Property, Garage, EconomyStats, Job, Gang, Inventory, InventoryItem } from '../types';
export const MOCK_DB_COUNT = 120;

const MOCK_ITEM_POOL = [
  { name: 'water_bottle', label: 'Water Bottle' },
  { name: 'sandwich', label: 'Sandwich' },
  { name: 'phone', label: 'Phone' },
  { name: 'weapon_pistol', label: 'Pistol' },
  { name: 'weapon_smg', label: 'SMG' },
  { name: 'lockpick', label: 'Lockpick' },
  { name: 'markedbills', label: 'Marked Bills' },
  { name: 'coffee', label: 'Coffee' },
  { name: 'medkit', label: 'Medkit' },
  { name: 'radio', label: 'Radio' },
];

const FIRST_NAMES = [
  'James',
  'Maria',
  'Robert',
  'Linda',
  'Michael',
  'Patricia',
  'David',
  'Jennifer',
  'William',
  'Elizabeth',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Christopher',
  'Nancy',
  'Daniel',
  'Lisa',
  'Matthew',
  'Betty',
  'Anthony',
  'Margaret',
  'Mark',
  'Sandra',
  'Donald',
  'Ashley',
  'Steven',
  'Kimberly',
];
const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
];
const JOBS = [
  { id: 'police', label: 'LSPD' },
  { id: 'ambulance', label: 'EMS' },
  { id: 'mechanic', label: 'Mechanic' },
  { id: 'taxi', label: 'Taxi' },
  { id: 'lawyer', label: 'Law Firm' },
  { id: 'realtor', label: 'Real Estate' },
  { id: 'bus', label: 'Transit' },
  { id: 'trucker', label: 'Trucking' },
  { id: 'unemployed', label: 'Unemployed' },
  { id: 'judge', label: 'Courts' },
  { id: 'reporter', label: 'Weazel News' },
  { id: 'burgershot', label: 'Burger Shot' },
];
const GANGS = [
  { id: 'none', label: 'No Gang' },
  { id: 'ballas', label: 'Ballas' },
  { id: 'vagos', label: 'Vagos' },
  { id: 'families', label: 'Families' },
  { id: 'lostmc', label: 'Lost MC' },
  { id: 'marabunta', label: 'Marabunta' },
  { id: 'triads', label: 'Triads' },
];
const VEHICLE_MODELS = [
  'sultan',
  'elegy',
  'comet2',
  'banshee',
  'zentorno',
  't20',
  'nero',
  'adder',
  'kuruma',
  'buffalo',
  'dominator',
  'gauntlet',
  'baller',
  'cavalcade',
  'granger',
  'oracle',
  'fugitive',
  'schafter2',
  'tailgater',
  'washington',
  'police',
  'ambulance',
  'firetruk',
  'taxi',
  'bus',
  'phantom',
  'hauler',
  'bison',
  'rumpo',
  'speedo',
];
const GARAGE_NAMES = [
  'Legion Square',
  'Pillbox Hill',
  'Vinewood Hills',
  'Paleto Bay Central',
  'Sandy Shores Airfield',
  'Police Impound',
  'Vespucci Beach',
  'LSIA Hangar',
  'Grapeseed Farm',
  'Eclipse Towers',
  'Mirror Park',
  'Davis Quartz',
  'Fort Zancudo',
  'El Burro Heights',
  'Del Perro Pier',
  'Mount Chiliad',
  'Chumash Garage',
  'Terminal Port',
  'Casino Parking',
  'VIP Club Garage',
];
const PROPERTY_TYPES = ['Residential', 'Luxury', 'Commercial', 'Storage', 'Resort', 'Vacation'];
const PROPERTY_AREAS = [
  'Vinewood',
  'Rockford Hills',
  'Del Perro',
  'La Mesa',
  'Paleto Bay',
  'Sandy Shores',
  'Davis',
  'Strawberry',
  'Mirror Park',
  'Burton',
  'Alta',
  'Hawick',
  'Chumash',
  'Grapeseed',
];
const VEHICLE_STATES = ['Stored', 'Out', 'Impounded'] as const;
const STASH_PREFIXES = ['evidence', 'armory', 'warehouse', 'gang', 'business', 'apartment', 'farm', 'vault'];

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function matchesSearch(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

export function generateMockDbPlayers(count = MOCK_DB_COUNT): Player[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const first = pick(FIRST_NAMES, i);
    const last = pick(LAST_NAMES, i + 7);
    const job = pick(JOBS, i);
    const gang = pick(GANGS, i + 3);
    const cid = `CID${String(n).padStart(4, '0')}`;
    const online = i < 4;
    return {
      ServerId: online ? i + 1 : 0,
      Name: `${first} ${last}`,
      Steam: `steam:1100001${String(100000 + n)}`,
      License: `license:mock${n}`,
      CitizenId: cid,
      isOnline: online,
      job: job.id,
      gang: gang.id,
    };
  });
}

export function generateMockVehicles(count = MOCK_DB_COUNT): PlayerVehicle[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const model = pick(VEHICLE_MODELS, i);
    const plate = `MOCK-${String(n).padStart(3, '0')}`;
    const owner = `CID${String((i % MOCK_DB_COUNT) + 1).padStart(4, '0')}`;
    return {
      plate,
      model,
      owner,
      state: pick([...VEHICLE_STATES], i),
      garage: pick(GARAGE_NAMES, i),
      fuel: 15 + ((i * 17) % 85),
      engine: 200 + ((i * 41) % 800),
      body: 300 + ((i * 29) % 700),
    };
  });
}

export function generateMockProperties(count = MOCK_DB_COUNT): Property[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const type = pick(PROPERTY_TYPES, i);
    const area = pick(PROPERTY_AREAS, i + 2);
    const owner = `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i + 5)}`;
    return {
      id: n,
      label: `${type} Unit #${n}`,
      address: `${area} — Block ${(i % 20) + 1}`,
      owner,
      type,
      price: 75000 + ((i * 13750) % 4950000),
    };
  });
}

export function generateMockGarages(vehicles: PlayerVehicle[]): Garage[] {
  const byGarage = new Map<string, PlayerVehicle[]>();
  for (const v of vehicles) {
    const g = v.garage || 'Unassigned';
    if (!byGarage.has(g)) byGarage.set(g, []);
    byGarage.get(g)!.push(v);
  }
  return GARAGE_NAMES.filter((name) => byGarage.has(name)).map((name) => ({
    Name: name,
    Vehicles: byGarage.get(name) || [],
  }));
}

function mockInventoryItems(seed: number): InventoryItem[] {
  const count = 3 + (seed % 6);
  return Array.from({ length: count }, (_, i) => {
    const item = pick(MOCK_ITEM_POOL, seed + i);
    return {
      name: item.name,
      label: item.label,
      count: 1 + ((seed + i) % 12),
      slot: i === count - 1 ? i + 3 : i + 1,
      image: `nui://qb-inventory/html/images/${item.name}.png`,
      metadata: item.name.startsWith('weapon_')
        ? { serial: `SN${100000 + seed * 37 + i}`, durability: 100 - ((seed + i) % 40), ammo: 12 }
        : undefined,
    };
  });
}

export function generateMockInventoryNodes(
  type: 'player' | 'stash' | 'trunk' | 'glovebox',
  count = MOCK_DB_COUNT,
): Inventory[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    if (type === 'player') {
      const cid = `CID${String(n).padStart(4, '0')}`;
      const first = pick(FIRST_NAMES, i);
      const last = pick(LAST_NAMES, i);
      const id = n <= 4 ? `player:${n}` : `player:${cid}`;
      return {
        id,
        label: `${first} ${last} (${cid})`,
        type: 'player',
        owner: cid,
        items: mockInventoryItems(i),
      };
    }
    if (type === 'stash') {
      const name = `${pick(STASH_PREFIXES, i)}_${n}`;
      return {
        id: `stash:${name}`,
        label: `Stash: ${name}`,
        type: 'stash',
        items: mockInventoryItems(i + 10),
      };
    }
    const plate = `MOCK-${String(n).padStart(3, '0')}`;
    if (type === 'glovebox') {
      return {
        id: `glovebox:${plate}`,
        label: `Glovebox: ${plate}`,
        type: 'glovebox',
        owner: plate,
        items: mockInventoryItems(i + 20),
      };
    }
    return {
      id: `trunk:${plate}`,
      label: `Trunk: ${plate}`,
      type: 'trunk',
      owner: plate,
      items: mockInventoryItems(i + 30),
    };
  });
}

export const MOCK_DB_PLAYERS_ALL = generateMockDbPlayers();
export const MOCK_VEHICLES_ALL = generateMockVehicles();
export const MOCK_PROPERTIES_ALL = generateMockProperties();
export const MOCK_GARAGES_ALL = generateMockGarages(MOCK_VEHICLES_ALL);
export const MOCK_INVENTORY_PLAYER_ALL = generateMockInventoryNodes('player');
export const MOCK_INVENTORY_STASH_ALL = generateMockInventoryNodes('stash');
export const MOCK_INVENTORY_TRUNK_ALL = generateMockInventoryNodes('trunk');
export const MOCK_INVENTORY_GLOVEBOX_ALL = generateMockInventoryNodes('glovebox');

const INVENTORY_ITEMS_BY_ID = new Map<string, InventoryItem[]>();
[
  ...MOCK_INVENTORY_PLAYER_ALL,
  ...MOCK_INVENTORY_STASH_ALL,
  ...MOCK_INVENTORY_TRUNK_ALL,
  ...MOCK_INVENTORY_GLOVEBOX_ALL,
].forEach((inv) => INVENTORY_ITEMS_BY_ID.set(inv.id, inv.items));

export function getMockInventoryItems(invId: string): InventoryItem[] {
  return INVENTORY_ITEMS_BY_ID.get(invId) ?? mockInventoryItems(invId.length);
}

export function generateMockJobs(): Job[] {
  return JOBS.map((j, i) => ({
    id: j.id,
    name: j.id,
    label: j.label,
    totalPlayers: 3 + ((i * 11) % 28),
    grades: [
      { name: '0', label: 'Trainee', level: 0 },
      { name: '1', label: 'Junior', level: 1 },
      { name: '2', label: 'Senior', level: 2 },
      { name: '3', label: 'Lead', level: 3 },
    ],
  }));
}

export function generateMockGangs(): Gang[] {
  return GANGS.map((g, i) => ({
    id: g.id,
    name: g.id,
    label: g.label,
    totalPlayers: g.id === 'none' ? 45 : 4 + ((i * 7) % 22),
    grades:
      g.id === 'none'
        ? undefined
        : [
            { name: '0', label: 'Recruit', level: 0 },
            { name: '1', label: 'Soldier', level: 1 },
            { name: '2', label: 'Shot Caller', level: 2 },
          ],
  }));
}

export function generateMockEconomy(playerCount = MOCK_DB_COUNT): EconomyStats {
  const names = MOCK_DB_PLAYERS_ALL.map((p) => p.Name);
  const makeWealth = (type: string, scale: number) =>
    names
      .map((name, i) => ({
        name,
        amount: Math.floor(5000 + ((i * 982451) % scale)),
        type,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 50);

  return {
    TotalCash: 125_400_000 + playerCount * 4200,
    TotalBank: 890_500_000 + playerCount * 18000,
    TotalCrypto: 45_200 + playerCount * 12,
    RichestPlayers: {
      Total: makeWealth('Net Worth', 8_000_000),
      Bank: makeWealth('Bank', 5_000_000),
      Cash: makeWealth('Cash', 900_000),
    },
    WealthDistribution: [
      { range: '$0 - $10k', count: Math.floor(playerCount * 0.35) },
      { range: '$10k - $100k', count: Math.floor(playerCount * 0.28) },
      { range: '$100k - $1M', count: Math.floor(playerCount * 0.22) },
      { range: '$1M - $10M', count: Math.floor(playerCount * 0.1) },
      { range: '$10M+', count: Math.max(5, Math.floor(playerCount * 0.05)) },
    ],
  };
}

export function paginateByPage<T>(
  items: T[],
  page: number,
  limit: number,
  matches?: (item: T, query: string) => boolean,
  search = '',
): { items: T[]; total: number } {
  const filtered = search && matches ? items.filter((item) => matches(item, search)) : items;
  const total = filtered.length;
  const offset = (Math.max(1, page) - 1) * limit;
  return { items: filtered.slice(offset, offset + limit), total };
}

export function paginateByOffset<T>(
  items: T[],
  offset: number,
  limit: number,
  matches?: (item: T, query: string) => boolean,
  search = '',
): { items: T[]; total: number } {
  const filtered = search && matches ? items.filter((item) => matches(item, search)) : items;
  const total = filtered.length;
  return { items: filtered.slice(offset, offset + limit), total };
}

const PROPERTY_SORTS: Record<string, (a: Property, b: Property) => number> = {
  name: (a, b) => a.label.localeCompare(b.label),
  price_desc: (a, b) => (b.price ?? 0) - (a.price ?? 0),
  price_asc: (a, b) => (a.price ?? 0) - (b.price ?? 0),
};

export function filterProperties(items: Property[], search: string, filter: string, sort = ''): Property[] {
  const matches = items.filter((p) => {
    const matchesQuery =
      !search || matchesSearch(p.label, search) || matchesSearch(p.address, search) || matchesSearch(p.owner, search);
    const matchesFilter = filter === 'all' || p.type.toLowerCase() === filter.toLowerCase();
    return matchesQuery && matchesFilter;
  });
  return PROPERTY_SORTS[sort] ? matches.sort(PROPERTY_SORTS[sort]) : matches;
}

export function getOnlineMockPlayers(): Player[] {
  return MOCK_DB_PLAYERS_ALL.filter((p) => p.isOnline);
}

export function getMockInventoriesByType(type: string): Inventory[] {
  switch (type) {
    case 'stash':
      return MOCK_INVENTORY_STASH_ALL;
    case 'trunk':
      return MOCK_INVENTORY_TRUNK_ALL;
    case 'glovebox':
      return MOCK_INVENTORY_GLOVEBOX_ALL;
    default:
      return MOCK_INVENTORY_PLAYER_ALL;
  }
}
