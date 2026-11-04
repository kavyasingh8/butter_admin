export type PageName =
  | 'Commands'
  | 'PlayerList'
  | 'Bans'
  | 'PlayerLogs'
  | 'StaffChat'
  | 'Reports'
  | 'Options'
  | 'AccessControl'
  | 'Resources'
  | 'Database'
  | 'TxAdmin'
  | 'Monitoring';

export type ChatCategory = 'Staff' | 'Reports';

export interface ChatMessage {
  Sender: string;
  Message: string;
  Time: string;
  Date?: string;
  IsAdmin?: boolean;
  IsInitial?: boolean;
}

export interface Report {
  Id: number;
  Chats: ChatMessage[];
  Status?: 'Active' | 'Closed';
  Priority?: 'Urgent' | 'High' | 'Normal' | 'Low';
  ClaimedBy?: number;
  ClaimedByName?: string;
  ClosingNotes?: string;
  ClosedBy?: string;
  TypingAdmins?: string[];
  Type?: string;
  Clips?: string;
  Title?: string;
  Description?: string;
  OpenBy?: string;
  OpenById?: number;
}

export interface PlayerVehicle {
  plate: string;
  model: string;
  state: string;
  garage?: string;
  engine?: number;
  fuel?: number;
  body?: number;
  owner?: string;
  image?: string;
}

export interface Garage {
  Name: string;
  Vehicles: PlayerVehicle[];
}

export interface Property {
  id: number;
  label: string;
  address: string;
  owner: string;
  type: string;
  price: number;
}

export interface EconomyStats {
  TotalCash: number;
  TotalBank: number;
  TotalCrypto: number;
  RichestPlayers: {
    Total: { name: string; amount: number; type: string }[];
    Bank: { name: string; amount: number; type: string }[];
    Cash: { name: string; amount: number; type: string }[];
  };
  WealthDistribution: { range: string; count: number }[];
}

/** A player's job or gang as stored by the framework. */
export interface FactionMembership {
  name?: string;
  label?: string;
  grade?: { level?: number; name?: string; label?: string };
}

export interface PlayerDetails {
  dob?: string;
  bloodgroup?: string;
  phone?: string;
  job?: string;
  gang?: string;
  money?: { cash: number; bank: number; crypto?: number };
  vehicles?: PlayerVehicle[];
  properties?: { id?: number | string; label: string; address: string; type: string }[];
  inventory?: { name: string; label: string; count: number; slot: number; image?: string }[];
}

export interface Player {
  ServerId: number;
  Name: string;
  CharName?: string;
  Steam: string;
  License: string;
  PrimaryId?: string;
  CitizenId?: string;
  isOnline?: boolean;
  Reason?: string;
  Time?: number;
  HardwareId?: string;
  IP?: string;
  Discord?: string;
  Fivem?: string;
  Xbox?: string;
  AvatarUrl?: string;
  Details?: PlayerDetails;
  job?: FactionMembership | string;
  gang?: FactionMembership | string;
  Health?: number;
  Armor?: number;
  Ping?: number;
}

/** A player's full profile from fetchPlayerProfile. */
export interface PlayerProfile extends Player {
  Note?: string;
  Radio?: number;
  Coords?: { x: number; y: number; z: number };
}

/** The player commands act on when no other player is picked. */
export interface CurrentTarget {
  Text: string;
  Source: number | string;
}

export type Translate = (path: string, ...args: unknown[]) => string;

export interface BannedPlayer {
  Text?: string;
  Name: string;
  Discord?: string;
  Steam?: string;
  License?: string;
  BannedOn: number | { day: number; month: number; year: number; hour: number; min: number };
  Expires: number | { day: number; month: number; year: number; hour: number; min: number };
  Reason: string;
  BannedBy: string;
  BanId?: string;
  Unbanned?: boolean;
  UnbannedDate?: number | { day: number; month: number; year: number; hour: number; min: number };
}

export interface LogEntry {
  Type: string;
  Steam: string;
  AdminName?: string;
  Desc: string;
  Date: string;
  Cid: string;
  Data: string;
}

export interface CommandOption {
  Id: string;
  Name: string;
  Type: string;
  InputType?: string;
  Choices?: DropdownChoice[];
  /** Name of the client-side provider to resolve the list from on demand. */
  ChoicesProvider?: string;
  /** The provider's list can't change during a session, so the UI may keep it. */
  ChoicesCache?: boolean;
  PlayerList?: boolean;
  Checkbox?: boolean;
}

export interface Command {
  Id: string;
  Name: string;
  Collapse: boolean;
  CloseMenu?: boolean;
  // Fixed payload sent as `Result` for simple (non-Collapse) commands that need
  // to pass a preset arg to a shared event, e.g. two buttons triggering the
  // same backend event with different flags.
  StaticResult?: Record<string, unknown>;
  Options: CommandOption[];
}

export interface CommandCategory {
  Name: string;
  Items: Command[];
}

export interface DropdownChoice {
  Icon?: string;
  Text: string;
  Source?: string | number | null;
  Value?: string | number;
  Label?: string;
  Callback?: (choice: DropdownChoice) => void;
}

/** Where a dropdown opens, from dropdownPositionFrom(). */
export interface DropdownPosition {
  x: number;
  y: number;
  width: string;
  triggerHeight?: number;
  zoom?: number;
}

/** The menu-wide dropdown used by Access Control and Options. */
export interface DropdownState {
  id?: string;
  name?: string;
  options: DropdownChoice[];
  position: DropdownPosition;
  hasSearch: boolean;
}

export interface DirectMessage {
  id: number;
  text: string;
  isMe: boolean;
  time: string;
}

export interface PlayersResponse {
  Online: Player[];
  All: Player[];
  TotalCount: number;
  Disconnected: Player[];
}

export interface LogsResponse {
  Logs: LogEntry[];
  TotalCount: number;
}

export type VehicleStateCounts = Partial<Record<'Stored' | 'Out' | 'Impounded', number>>;

export interface VehiclesResponse {
  Vehicles: PlayerVehicle[];
  TotalCount: number;
  StateCounts?: VehicleStateCounts;
}

export interface PropertiesResponse {
  Properties: Property[];
  TotalCount: number;
}

export interface Rank {
  Id: string;
  Name: string;
  Permissions: string[];
}

export interface AdminUser {
  Identifier: string;
  RankId: string;
  IsTemp: boolean;
  Expires?: number | { day: number; month: number; year: number; hour: number; min: number };
  Steam?: string;
  Discord?: string;
  DiscordRoles?: string[];
  CharacterId?: string;
  Webhook?: string;
  WebhookEvents?: string[];
  Name?: string;
  DisplayName?: string;
  AvatarUrl?: string;
  DutySeconds?: number;
}

export interface Resource {
  Name: string;
  State: 'started' | 'stopped';
}

export interface DiscordRole {
  id: string;
  name: string;
  color?: number;
}

/** A stored character as listed by the server, shaped like an offline player. */
export type Character = Pick<Player, 'ServerId' | 'Name' | 'License' | 'Steam' | 'Discord' | 'CitizenId' | 'isOnline'>;

export interface PermissionCategory {
  title: string;
  permissions: { id: string; label: string }[];
}

export type MenuSize = 'Small' | 'Large';

export interface MenuOptions {
  LargeDefault: boolean;
  BindOpen: boolean;
  Tooltips: boolean;
  Resizer: boolean;
  NoclipType?: string;
  OverheadName?: boolean;
  OverheadId?: boolean;
  OverheadHealth?: boolean;
  OverheadArmor?: boolean;
  OverheadStyle?: 'Butter' | 'TX';
  NameSource?: 'Player' | 'Character';
  ReportsMuted?: boolean;
  Theme?: string;
  Font?: string;
  CustomThemes?: CustomTheme[];
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface CustomTheme {
  id: string;
  name: string;
  bg: RGB;
  accent: RGB;
  sidebar: RGB;
}

export interface Job {
  id: string;
  name: string;
  label: string;
  totalPlayers: number;
  grades?: { name: string; label: string; level: number }[];
}

export interface Gang {
  id: string;
  name: string;
  label: string;
  totalPlayers: number;
  grades?: { name: string; label: string; level: number }[];
}

/** Payload of the openMenu, updateMenu and openPlayerReport messages. Every field is optional. */
export interface AdminMenuOpenData {
  MyName?: string;
  Name?: string;
  MyId?: number;
  Debug?: boolean;
  Locales?: Record<string, unknown>;
  Commands?: CommandCategory[];
  Pages?: Record<string, boolean>;
  MenuOptions?: MenuOptions;
  Favorited?: Record<string, boolean>;
  PinnedPlayers?: Record<string, boolean>;
  EnabledItems?: Record<string, boolean>;
  PlayerName?: string;
  LicenseType?: string;
  PlayerNotes?: Record<string, string>;
  OnlinePlayers?: Player[];
  DisconnectedPlayers?: Player[];
  Staffchat?: ChatMessage[];
  Reports?: Report[];
  Resources?: Resource[];
  Ranks?: Rank[];
  Admins?: AdminUser[];
  AvailablePermissions?: PermissionCategory[];
  DiscordRoles?: DiscordRole[];
  DiscordLogsEnabled?: boolean;
  Characters?: Character[];
  PlayerReportMode?: boolean;
  ReportData?: Report;
  // Browser development mocks only.
  Bans?: BannedPlayer[];
  Logs?: LogEntry[];
  DbPlayers?: Player[];
  DbPlayersTotal?: number;
}

export interface InventoryItem {
  name: string;
  label: string;
  count: number;
  slot: number;
  metadata?: Record<string, unknown>;
  image?: string;
  weight?: number;
}

export interface Inventory {
  id: string; // e.g. "player:1", "stash:test", "trunk:ABC1234"
  label: string;
  type: 'player' | 'stash' | 'trunk' | 'glovebox';
  owner?: string; // identifier or plate
  items: InventoryItem[];
  maxWeight?: number;
  slots?: number;
}
