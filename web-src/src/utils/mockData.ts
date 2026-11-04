import {
  AdminMenuOpenData,
  CommandCategory,
  Player,
  BannedPlayer,
  LogEntry,
  Report,
  ChatMessage,
  Rank,
  AdminUser,
  Character,
  DiscordRole,
  PermissionCategory,
} from '../types';
import locales from '../../../locales/en.json';
import { MOCK_DB_PLAYERS_ALL } from './mockDatabase';

export const MOCK_ITEMS = [
  { name: 'water_bottle', label: 'Water Bottle' },
  { name: 'sandwich', label: 'Sandwich' },
  { name: 'phone', label: 'Phone' },
  { name: 'weapon_pistol', label: 'Pistol' },
  { name: 'weapon_smg', label: 'SMG' },
  { name: 'weapon_assaultrifle', label: 'Assault Rifle' },
  { name: 'lockpick', label: 'Lockpick' },
  { name: 'markedbills', label: 'Marked Bills' },
  { name: 'coffee', label: 'Coffee' },
  { name: 'donut', label: 'Donut' },
  { name: 'repairkit', label: 'Repair Kit' },
  { name: 'id_card', label: 'ID Card' },
  { name: 'laptop', label: 'Laptop' },
];

export const MOCK_COMMANDS: CommandCategory[] = [
  {
    Name: 'Player',
    Items: [
      {
        Id: 'playerinfo',
        Name: 'Player Info',
        Collapse: true,
        Options: [{ Id: 'player', Name: 'Player', Type: 'input-choice', PlayerList: true }],
      },
      {
        Id: 'revive',
        Name: 'Revive',
        Collapse: true,
        Options: [
          {
            Id: 'player',
            Name: 'Player',
            Type: 'input-choice',
            PlayerList: true,
          },
        ],
      },
      {
        Id: 'kill',
        Name: 'Kill',
        Collapse: true,
        Options: [
          {
            Id: 'player',
            Name: 'Player',
            Type: 'input-choice',
            PlayerList: true,
          },
        ],
      },
      {
        Id: 'givemoney',
        Name: 'Give Money',
        Collapse: true,
        Options: [
          { Id: 'player', Name: 'Player', Type: 'input-choice', PlayerList: true },
          {
            Id: 'moneytype',
            Name: 'Type',
            Type: 'input-choice',
            Choices: [
              { Text: 'Cash', Source: 'cash' },
              { Text: 'Bank', Source: 'bank' },
              { Text: 'Crypto', Source: 'crypto' },
            ],
          },
          { Id: 'amount', Name: 'Amount', Type: 'input', InputType: 'number' },
        ],
      },
      {
        Id: 'giveJob',
        Name: 'Set Job',
        Collapse: true,
        Options: [
          { Id: 'player', Name: 'Player', Type: 'input-choice', PlayerList: true },
          {
            Id: 'job',
            Name: 'Job',
            Type: 'input-choice',
            Choices: [
              { Text: 'Police', Source: 'police' },
              { Text: 'Ambulance', Source: 'ambulance' },
              { Text: 'Mechanic', Source: 'mechanic' },
            ],
          },
          { Id: 'rank', Name: 'Rank', Type: 'input', InputType: 'number' },
        ],
      },
    ],
  },
  {
    Name: 'Vehicle',
    Items: [
      {
        Id: 'spawnvehicle',
        Name: 'Spawn Vehicle',
        Collapse: true,
        Options: [{ Id: 'model', Name: 'Model', Type: 'input' }],
      },
      {
        Id: 'fixvehicle',
        Name: 'Fix Vehicle',
        Collapse: false,
        Options: [],
      },
    ],
  },
  {
    Name: 'Utility',
    Items: [
      {
        Id: 'noclip',
        Name: 'No Clip',
        Collapse: false,
        Options: [],
      },
      {
        Id: 'godmode',
        Name: 'God Mode',
        Collapse: false,
        Options: [],
      },
      {
        Id: 'announce',
        Name: 'Announce',
        Collapse: true,
        Options: [
          { Id: 'message', Name: 'Message', Type: 'input' },
          { Id: 'flashscreen', Name: 'Flash Screen', Type: 'checkbox' },
          { Id: 'playsound', Name: 'Play Sound', Type: 'checkbox' },
        ],
      },
    ],
  },
];

export const MOCK_PLAYERS: Player[] = [
  {
    ServerId: 1,
    Name: 'Butter',
    Steam: 'steam:110000100000001',
    License: 'license:abc1',
    CitizenId: 'CID123',
    HardwareId: 'hwid:abc123xyz890',
    IP: '192.168.1.100',
    Discord: 'discord:1234567890',
    Xbox: 'xbl:9876543210',
  },
  {
    ServerId: 2,
    Name: 'Chilly',
    Steam: 'steam:110000100000002',
    License: 'license:abc2',
    CitizenId: 'CID456',
    HardwareId: 'hwid:def456uvw123',
    IP: '10.0.0.5',
    Discord: 'discord:0987654321',
  },
  {
    ServerId: 3,
    Name: 'Admin_John',
    Steam: 'steam:110000100000003',
    License: 'license:abc3',
    CitizenId: 'CID789',
    IP: '172.16.254.1',
  },
  { ServerId: 4, Name: 'Admin One', Steam: 'steam:admin1', License: 'license:admin1', CitizenId: 'CID001' },
];

export const MOCK_BANS: BannedPlayer[] = [
  {
    Name: 'BadPlayer',
    BanId: 'BAN-1234',
    Reason: 'Cheating',
    BannedBy: 'Butter',
    Discord: 'butter#1234',
    Steam: 'steam:110000100000001',
    BannedOn: { day: 26, month: 3, year: 2026, hour: 10, min: 0 },
    Expires: { day: 26, month: 4, year: 2026, hour: 10, min: 0 },
  },
  {
    Name: 'Troll',
    BanId: 'BAN-5678',
    Reason: 'Trolling',
    BannedBy: 'Chilly',
    Discord: 'chilly#5678',
    Steam: 'steam:110000100000002',
    BannedOn: { day: 25, month: 3, year: 2026, hour: 15, min: 30 },
    Expires: { day: 25, month: 4, year: 2026, hour: 15, min: 30 },
  },
];

export const MOCK_LOGS: LogEntry[] = [
  {
    Type: 'Command',
    Desc: 'Butter used revive on Chilly',
    Date: '2026-03-26 14:00:00',
    Cid: 'ABC1',
    Steam: 'steam:110000100000001',
    Data: '{}',
  },
  {
    Type: 'Money',
    Desc: 'Chilly gave $1000 to John',
    Date: '2026-03-26 14:05:00',
    Cid: 'ABC2',
    Steam: 'steam:110000100000002',
    Data: '{}',
  },
];

export const MOCK_REPORTS: Report[] = [
  {
    Id: 1,
    Type: 'Bug',
    Status: 'Active',
    Priority: 'Urgent',
    Description: 'Help, someone is flying near Legion Square!',
    Chats: [
      { Sender: 'Chilly', Message: 'Help, someone is flying near Legion Square!', Time: '14:10', Date: '26-3-2026' },
      { Sender: 'Butter', Message: 'We are looking into it. Stay where you are.', Time: '14:11', Date: '26-3-2026' },
    ],
  },
  {
    Id: 2,
    Type: 'Player',
    Status: 'Active',
    Priority: 'High',
    Description: 'Player ID 12 is RDMing at the hospital.',
    Chats: [
      { Sender: 'JohnWick', Message: 'Player ID 12 is RDMing at the hospital.', Time: '15:20', Date: '26-3-2026' },
    ],
  },
  {
    Id: 3,
    Type: 'Question',
    Status: 'Active',
    Priority: 'Normal',
    Description: 'How do I buy a house?',
    Chats: [{ Sender: 'Newbie', Message: 'How do I buy a house?', Time: '16:05', Date: '26-3-2026' }],
  },
  {
    Id: 4,
    Type: 'Staff',
    Status: 'Closed',
    Priority: 'Low',
    ClosedBy: 'Butter',
    ClosingNotes: 'Handled via DM.',
    Description: 'Staff member is behaving unprofessionally.',
    Chats: [
      { Sender: 'AngryGuy', Message: 'Staff member is behaving unprofessionally.', Time: '10:00', Date: '25-3-2026' },
      { Sender: 'Butter', Message: 'Please provide more details.', Time: '10:05', Date: '25-3-2026' },
      { Sender: 'AngryGuy', Message: 'I will talk to you in DMs.', Time: '10:10', Date: '25-3-2026' },
    ],
  },
  {
    Id: 5,
    Type: 'Other',
    Status: 'Active',
    Priority: 'Normal',
    Description: 'I found a lost car at the pier.',
    Chats: [{ Sender: 'Fisher', Message: 'I found a lost car at the pier.', Time: '18:30', Date: '26-3-2026' }],
  },
];

export const MOCK_STAFFCHAT: ChatMessage[] = [
  { Sender: 'Butter', Message: 'Hey everyone, huge admin meeting tomorrow.', Time: '12:00', Date: '26-3-2026' },
  { Sender: 'Chilly', Message: 'Copy that!', Time: '12:01', Date: '26-3-2026' },
];

export const MOCK_AVAILABLE_PERMISSIONS: PermissionCategory[] = [
  {
    title: 'General Permissions',
    permissions: [
      { id: 'page.commands', label: 'Open Commands Tab' },
      { id: 'page.playerlist', label: 'Open Player List' },
      { id: 'page.bans', label: 'Open Bans Tab' },
      { id: 'page.logs', label: 'Open Logs Tab' },
      { id: 'page.reports', label: 'Open Reports Tab' },
      { id: 'page.staffchat', label: 'Open Staff Chat' },
      { id: 'page.accesscontrol', label: 'Open Access Control' },
      { id: 'page.database', label: 'Open Database Tab' },
    ],
  },
  {
    title: 'Player Management',
    permissions: [
      { id: 'commands.revive', label: 'Revive Players' },
      { id: 'commands.kill', label: 'Kill Players' },
      { id: 'commands.freeze', label: 'Freeze Players' },
      { id: 'commands.kick', label: 'Kick Players' },
      { id: 'commands.ban', label: 'Ban Players' },
      { id: 'commands.inventory', label: 'View/Edit Inventory' },
    ],
  },
  {
    title: 'Server Management',
    permissions: [
      { id: 'commands.weather', label: 'Change Weather' },
      { id: 'commands.time', label: 'Change Time' },
      { id: 'commands.resources', label: 'Manage Resources' },
    ],
  },
];

export const MOCK_RANKS: Rank[] = [
  {
    Id: 'moderator',
    Name: 'Moderator',
    Permissions: ['page.playerlist', 'page.reports', 'page.staffchat', 'commands.revive'],
  },
  {
    Id: 'admin',
    Name: 'Admin',
    Permissions: [
      'page.playerlist',
      'page.reports',
      'page.staffchat',
      'page.commands',
      'commands.revive',
      'commands.kill',
      'commands.ban',
      'page.accesscontrol',
    ],
  },
  {
    Id: 'admin_one',
    Name: 'Admin One',
    Permissions: [
      'page.commands',
      'page.playerlist',
      'page.bans',
      'page.logs',
      'page.reports',
      'page.staffchat',
      'page.accesscontrol',
      'page.database',
      'commands.revive',
      'commands.kill',
      'commands.freeze',
      'commands.kick',
      'commands.ban',
      'commands.inventory',
      'commands.weather',
      'commands.time',
      'commands.resources',
    ],
  },
  { Id: 'superadmin', Name: 'Super Admin', Permissions: ['all'] },
];

export const MOCK_ADMINS: AdminUser[] = [
  {
    Identifier: 'license:admin1',
    RankId: 'admin_one',
    IsTemp: false,
    Webhook: 'https://discord.com/api/webhooks/123/abc',
    WebhookEvents: ['ban', 'kick', 'report'],
  },
  { Identifier: 'license:abc1', RankId: 'superadmin', IsTemp: false },
  { Identifier: 'steam:110000100000003', RankId: 'admin', IsTemp: false },
  {
    Identifier: 'discord:1234567890',
    RankId: 'moderator',
    IsTemp: true,
    Expires: { day: 1, month: 5, year: 2026, hour: 12, min: 0 },
  },
  { Identifier: 'role:4', RankId: 'moderator', IsTemp: false }, // Discord Role (Support Team)
  { Identifier: 'CID123', RankId: 'admin_one', IsTemp: false, CharacterId: 'CID123' }, // Citizen ID
  { Identifier: 'ip:127.0.0.1', RankId: 'moderator', IsTemp: false }, // IP Address
];

export const MOCK_DISCORD_ROLES: DiscordRole[] = [
  { id: '1', name: '@EVERYONE', color: 0x99aab5 },
  { id: '2', name: 'MEMBER', color: 0xfee75c },
  { id: '3', name: 'CUSTOMER', color: 0xeb459e },
  { id: '4', name: 'SUPPORT TEAM', color: 0xfee75c },
  { id: '5', name: 'CHILLY', color: 0xed4245 },
  { id: '6', name: 'VIP', color: 0x57f287 },
];

export const MOCK_CHARACTERS: Character[] = MOCK_DB_PLAYERS_ALL.slice(0, 30).map((player) => ({
  ServerId: player.ServerId,
  Name: player.Name,
  License: player.License,
  Steam: player.Steam,
  CitizenId: player.CitizenId,
  isOnline: player.isOnline,
}));

export const MOCK_OPEN_DATA: AdminMenuOpenData = {
  Name: 'Butter',
  MyId: 1,
  Commands: MOCK_COMMANDS,
  OnlinePlayers: MOCK_PLAYERS,
  Reports: MOCK_REPORTS,
  Staffchat: MOCK_STAFFCHAT,
  Ranks: MOCK_RANKS,
  Admins: MOCK_ADMINS,
  MenuOptions: { LargeDefault: false, BindOpen: true, Tooltips: true, Resizer: true },
  Pages: {
    Commands: true,
    PlayerList: true,
    Bans: true,
    PlayerLogs: true,
    StaffChat: true,
    Reports: true,
    Options: true,
    AccessControl: true,
    Resources: true,
    Database: true,
    TxAdmin: true,
    Monitoring: true,
    DevMode: true,
    FullProfile: true,
    Revive: true,
    Kill: true,
  },
  EnabledItems: { noclip: true, godmode: true },
  AvailablePermissions: MOCK_AVAILABLE_PERMISSIONS,
  DiscordRoles: MOCK_DISCORD_ROLES,
  Characters: MOCK_CHARACTERS,
  Locales: locales,
};
