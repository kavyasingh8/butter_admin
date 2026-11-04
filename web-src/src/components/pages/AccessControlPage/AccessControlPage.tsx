import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  Check,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Fingerprint,
  Hourglass,
  IdCard,
  Infinity as InfinityIcon,
  ChevronRight,
  KeyRound,
  Layers,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Timer,
  Trash2,
  TriangleAlert,
  UserPlus,
  UserRound,
  UsersRound,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { WEBHOOK_EVENT_ICONS, categoryIcon, permissionIcon, rankIcon } from './icons';
import { useAdminMenu, toArray } from '../../../providers/AdminMenuContext';
import { Rank, AdminUser, DiscordRole, Character, PermissionCategory } from '../../../types';
import { fetchNui } from '../../../utils/fetchNui';
import { openExternalUrl } from '../../../utils/misc';
import { cn } from '../../../utils/cn';
import { SearchField } from '../../ui/SearchField';
import { Select } from '../../ui/Select';
import { CopyButton } from '../../ui/CopyButton';
import { DateTimePicker } from '../../ui/DateTimePicker';
import LargeModeRequired from '../../ui/LargeModeRequired';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  IconTile,
  Label,
  Modal,
  Panel,
  PanelHeader,
  Section,
  Segmented,
  StatusDot,
  Toolbar,
  inputClass,
} from '../DatabasePage/ui';

interface AccessControlData {
  Ranks?: Rank[];
  Admins?: AdminUser[];
  AvailablePermissions?: PermissionCategory[];
  DiscordRoles?: DiscordRole[];
  Characters?: Character[];
  DiscordLogsEnabled?: boolean;
}

type ExpiryParts = Exclude<AdminUser['Expires'], number | undefined>;
type IdType = 'LICENSE' | 'STEAM' | 'DISCORD' | 'DISCORD ROLE' | 'CHARACTER';

/** Lucide has no brand icons, so Steam and Discord use Font Awesome. */
const ID_TYPES: { id: IdType; key: string; Icon?: LucideIcon; brand?: string }[] = [
  { id: 'LICENSE', key: 'license', Icon: IdCard },
  { id: 'STEAM', key: 'steam', brand: 'fa-brands fa-steam' },
  { id: 'DISCORD', key: 'discord', brand: 'fa-brands fa-discord' },
  { id: 'DISCORD ROLE', key: 'discord_role', Icon: UsersRound },
  { id: 'CHARACTER', key: 'player', Icon: UserRound },
];

const IdTypeIcon: React.FC<{ type?: (typeof ID_TYPES)[number]; size?: number }> = ({ type, size = 16 }) => {
  if (type?.Icon) return <type.Icon size={size} />;
  return <i className={type?.brand} style={{ fontSize: size }}></i>;
};

/** Icon plus text, for Field labels and Section titles. */
const IconLabel: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <span className="inline-flex items-center gap-2">
    <span className="shrink-0 opacity-70 flex items-center">{icon}</span>
    {children}
  </span>
);

const WEBHOOK_EVENTS = ['all', 'ban', 'kick', 'unban', 'report', 'duty', 'adminlog', 'exploit', 'warn'];

const idTypeOf = (identifier: string): IdType => {
  if (identifier.startsWith('steam:')) return 'STEAM';
  if (identifier.startsWith('discord:')) return 'DISCORD';
  if (identifier.startsWith('license:')) return 'LICENSE';
  if (identifier.startsWith('role:')) return 'DISCORD ROLE';
  return 'CHARACTER';
};

const toExpiryParts = (date: Date): ExpiryParts => ({
  day: date.getDate(),
  month: date.getMonth() + 1,
  year: date.getFullYear(),
  hour: date.getHours(),
  min: date.getMinutes(),
});

const normalizeExpiry = (expiry: AdminUser['Expires']) =>
  typeof expiry === 'number' ? toExpiryParts(new Date(expiry * 1000)) : expiry;

const defaultExpiry = () => toExpiryParts(new Date(Date.now() + 24 * 60 * 60 * 1000));

const pad = (value: number) => String(value).padStart(2, '0');

const formatExpiry = (expiry: AdminUser['Expires']) => {
  const parts = normalizeExpiry(expiry);
  if (!parts?.day) return null;
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hour)}:${pad(parts.min)}`;
};

const formatDutyTime = (totalSeconds?: number) => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

const getSteamProfileLink = (steamHex: string) => {
  if (!steamHex) return '';
  try {
    const cleanHex = steamHex.replace('steam:', '').trim();
    return `https://steamcommunity.com/profiles/${BigInt(`0x${cleanHex}`).toString()}`;
  } catch {
    return '';
  }
};

/** Accepts a SteamID64, a steamcommunity profile URL or a hex, and returns `steam:<hex>`. */
const formatSteamIdentifier = (input: string) => {
  let clean = input.trim();
  const profileMatch = clean.match(/steamcommunity\.com\/profiles\/(\d+)/i);
  if (profileMatch?.[1]) clean = profileMatch[1];

  if (/^\d+$/.test(clean)) {
    try {
      return `steam:${BigInt(clean).toString(16)}`;
    } catch {
      return clean;
    }
  }

  const cleanHex = clean.replace('steam:', '');
  if (/^[0-9a-fA-F]+$/.test(cleanHex)) {
    return clean.startsWith('steam:') ? clean.toLowerCase() : `steam:${clean.toLowerCase()}`;
  }
  return clean;
};

/** Ranks are colored by their position on the board, strongest first. */
const TIER_COLORS = ['#f5b83d', '#a78bfa', '#60a5fa', '#34d399', '#f472b6', '#22d3ee', '#fb923c', '#a3e635'];
const FALLBACK_COLOR = '#60a5fa';
const UNKNOWN_RANK_COLOR = '#f87171';

/** Appends an alpha channel to a #rrggbb color. color-mix is avoided since older CEF builds lack it. */
const withAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;

const CoverageRing: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-primary tabular-nums">
        {value}%
      </span>
    </div>
  );
};

const isLinked = (value: string) => !!value.trim() && value !== 'Not Linked' && value !== 'unknown';

const roleColorOf = (role?: DiscordRole) =>
  role?.color && role.color > 0 ? `#${role.color.toString(16).padStart(6, '0')}` : undefined;

const Switch: React.FC<{ checked: boolean; muted?: boolean; tone?: 'accent' | 'warning' }> = ({
  checked,
  muted,
  tone = 'accent',
}) => (
  <span
    className={cn(
      'relative w-9 h-5 rounded-full shrink-0 transition-colors',
      checked ? (tone === 'warning' ? 'bg-warning' : 'bg-accent') : 'bg-white/10',
      muted && 'opacity-50',
    )}
  >
    <span
      className={cn(
        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
        checked && 'translate-x-4',
      )}
    />
  </span>
);

const AccessControlPage: React.FC = () => {
  const {
    t,
    ranks,
    setRanks,
    admins,
    setAdmins,
    setDiscordRoles,
    setCharacters,
    setDbPlayers,
    setAvailablePermissions,
    menuSize,
    availablePermissions,
    discordRoles,
    characters,
    players,
    dbPlayers,
    discordLogsEnabled,
    setDiscordLogsEnabled,
  } = useAdminMenu();

  const [drawer, setDrawer] = useState<{ kind: 'admin' | 'rank'; id: string } | null>(null);

  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatus, setAdminStatus] = useState<'all' | 'online' | 'temporary'>('all');
  const [adminToEdit, setAdminToEdit] = useState<AdminUser | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<Partial<AdminUser>>({});
  const [idType, setIdType] = useState<IdType>('LICENSE');
  const [pickerSearch, setPickerSearch] = useState('');
  const [duplicateAdminError, setDuplicateAdminError] = useState(false);

  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const [isAddRankModalOpen, setIsAddRankModalOpen] = useState(false);
  const [rankToEdit, setRankToEdit] = useState<Rank | null>(null);
  const [rankToDelete, setRankToDelete] = useState<Rank | null>(null);
  const [rankForm, setRankForm] = useState<Partial<Rank>>({ Id: '', Name: '' });
  const [copiedPermissions, setCopiedPermissions] = useState<string[] | null>(null);
  const [permSearch, setPermSearch] = useState('');
  const [grantedOnly, setGrantedOnly] = useState(false);

  useEffect(() => {
    fetchNui<AccessControlData | false>('fetchAccessControl').then((data) => {
      if (!data) return;
      if (data.Admins) setAdmins(toArray(data.Admins));
      if (data.Ranks) setRanks(toArray(data.Ranks));
      if (data.DiscordRoles) setDiscordRoles(toArray(data.DiscordRoles));
      if (data.AvailablePermissions) setAvailablePermissions(toArray(data.AvailablePermissions));
      if (data.DiscordLogsEnabled !== undefined) setDiscordLogsEnabled(!!data.DiscordLogsEnabled);
      if (data.Characters) {
        const characterList = toArray<Character>(data.Characters);
        setCharacters(characterList);
        // Characters carry identifiers, so they double as the database player list here.
        setDbPlayers(characterList);
      }
    });
  }, []);

  useEffect(() => {
    setDuplicateAdminError(false);
  }, [adminForm.Identifier]);

  const handleToggleDiscordLogs = () => {
    const next = !discordLogsEnabled;
    setDiscordLogsEnabled(next);
    fetchNui('setDiscordLogs', { enabled: next });
  };

  const resolveAdminDetails = (admin: AdminUser) => {
    // Include `characters` as well: on live broadcasts the payload refreshes
    // `characters` but not `dbPlayers`, so relying on dbPlayers alone leaves
    // newly-added admins showing as "Unknown Player" until the page reopens.
    const searchLists = [...players, ...dbPlayers, ...characters];

    const cleanId = (id?: string) => {
      if (!id) return '';
      return id
        .replace(/^(discord|steam|license|citizenid):/, '')
        .toLowerCase()
        .trim();
    };

    const targetClean = cleanId(admin.Identifier);

    let foundPlayer = searchLists.find(
      (p) =>
        (p.License && cleanId(p.License) === targetClean) ||
        (p.Steam && cleanId(p.Steam) === targetClean) ||
        (p.Discord && cleanId(p.Discord) === targetClean) ||
        (p.CitizenId && cleanId(p.CitizenId) === targetClean) ||
        (p.ServerId && String(p.ServerId) === targetClean),
    );

    if (!foundPlayer) {
      foundPlayer = searchLists.find(
        (p) =>
          (admin.Steam && p.Steam && cleanId(p.Steam) === cleanId(admin.Steam)) ||
          (admin.Discord && p.Discord && cleanId(p.Discord) === cleanId(admin.Discord)) ||
          (admin.CharacterId && p.CitizenId && cleanId(p.CitizenId) === cleanId(admin.CharacterId)),
      );
    }

    const isOnline = players.some(
      (p) =>
        (p.License && cleanId(p.License) === targetClean) ||
        (p.Steam && cleanId(p.Steam) === targetClean) ||
        (p.Discord && cleanId(p.Discord) === targetClean) ||
        (p.CitizenId && cleanId(p.CitizenId) === targetClean) ||
        (foundPlayer &&
          ((p.License && cleanId(p.License) === cleanId(foundPlayer.License)) ||
            (p.Steam && cleanId(p.Steam) === cleanId(foundPlayer.Steam)) ||
            (p.Discord && cleanId(p.Discord) === cleanId(foundPlayer.Discord)))),
    );

    // Only resolve the identifier type that matches how the admin was added.
    // e.g. a steam: admin should NOT inherit foundPlayer's Discord, and vice-versa.
    const identifierType = admin.Identifier.startsWith('discord:')
      ? 'discord'
      : admin.Identifier.startsWith('steam:')
        ? 'steam'
        : admin.Identifier.startsWith('license:')
          ? 'license'
          : admin.Identifier.startsWith('citizenid:')
            ? 'citizenid'
            : admin.Identifier.startsWith('role:')
              ? 'role'
              : 'other';

    let resolvedDiscord =
      admin.Discord || (identifierType === 'discord' || identifierType === 'other' ? foundPlayer?.Discord : '') || '';
    let resolvedSteam =
      admin.Steam || (identifierType === 'steam' || identifierType === 'other' ? foundPlayer?.Steam : '') || '';
    let resolvedLicense =
      (identifierType === 'license' || identifierType === 'other' ? foundPlayer?.License : '') || '';

    if (identifierType === 'discord') resolvedDiscord = admin.Identifier;
    else if (identifierType === 'steam') resolvedSteam = admin.Identifier;
    else if (identifierType === 'license') resolvedLicense = admin.Identifier;

    let displayName = 'Unknown Player';
    if (admin.Name) {
      displayName = admin.Name;
    } else if (admin.Identifier.startsWith('role:')) {
      const roleId = admin.Identifier.replace('role:', '');
      const discordRole = discordRoles.find((r) => r.id === roleId);
      displayName = discordRole?.name ? `Role: ${discordRole.name}` : `Discord Role: ${roleId}`;
    } else if (foundPlayer) {
      displayName = foundPlayer.Name;
    } else if (admin.DisplayName) {
      displayName = admin.DisplayName;
    } else {
      displayName = admin.Identifier.length > 20 ? `${admin.Identifier.substring(0, 18)}...` : admin.Identifier;
    }

    return {
      isOnline,
      displayName,
      discordId: resolvedDiscord.replace('discord:', ''),
      steamHex: resolvedSteam.replace('steam:', ''),
      licenseHex: resolvedLicense.replace('license:', ''),
      citizenId: admin.CharacterId || foundPlayer?.CitizenId || '',
    };
  };

  const closeDrawer = () => setDrawer(null);

  const openRankDrawer = (rank: Rank) => {
    setDrawer({ kind: 'rank', id: rank.Id });
    setIsEditingPermissions(false);
    setPermSearch('');
  };

  const closeRankModal = () => {
    setIsAddRankModalOpen(false);
    setRankToEdit(null);
  };

  const handleOpenAddRank = () => {
    setRankForm({ Id: '', Name: '' });
    setIsAddRankModalOpen(true);
  };

  const handleOpenEditRank = (rank: Rank) => {
    setRankForm({ ...rank });
    setRankToEdit(rank);
  };

  const handleSaveRank = () => {
    const current = rankToEdit && (ranks.find((r) => r.Id === rankToEdit.Id) ?? rankToEdit);
    const dataToSave: Rank = current
      ? { ...current, Name: rankForm.Name || current.Name }
      : { Id: rankForm.Id || `rank_${Date.now()}`, Name: rankForm.Name || 'New Rank', Permissions: [] };

    fetchNui('saveRank', dataToSave);
    if (!current) openRankDrawer(dataToSave);
    closeRankModal();
  };

  const handleDeleteRank = () => {
    if (!rankToDelete) return;
    fetchNui('deleteRank', { id: rankToDelete.Id });
    if (drawer?.kind === 'rank' && drawer.id === rankToDelete.Id) closeDrawer();
    setRankToDelete(null);
  };

  const allPermissionIds = availablePermissions.flatMap((cat) => cat.permissions.map((p) => p.id));

  const saveRankPermissions = (rank: Rank, permissions: string[]) => {
    const updatedRank = { ...rank, Permissions: permissions };
    fetchNui('saveRank', updatedRank);
    setRanks((prev) => prev.map((r) => (r.Id === rank.Id ? updatedRank : r)));
  };

  const handleTogglePermission = (rank: Rank, permission: string) => {
    // A wildcard rank is expanded to an explicit list so a single permission can be removed from it.
    const current = rank.Permissions.includes('all') ? allPermissionIds : rank.Permissions;
    saveRankPermissions(
      rank,
      current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission],
    );
  };

  const closeAdminModal = () => {
    setIsAddAdminModalOpen(false);
    setAdminToEdit(null);
    setPickerSearch('');
  };

  const selectIdType = (type: IdType) => {
    setIdType(type);
    setAdminForm((prev) => ({ ...prev, Identifier: '', CharacterId: '', DiscordRoles: [] }));
    setPickerSearch('');
  };

  const handleOpenAddAdmin = (rankId?: string) => {
    setAdminForm({
      Identifier: '',
      Name: '',
      RankId: rankId || ranks[0]?.Id || '',
      IsTemp: false,
      Expires: defaultExpiry(),
      Steam: '',
      Discord: '',
      DiscordRoles: [],
      CharacterId: '',
      Webhook: '',
      WebhookEvents: ['all'],
    });
    setIdType('LICENSE');
    setPickerSearch('');
    setDuplicateAdminError(false);
    setIsAddAdminModalOpen(true);
  };

  const handleOpenEditAdmin = (admin: AdminUser) => {
    // Reflect the admin's real identifier type so the save path never re-prefixes a non-license identifier.
    setIdType(idTypeOf(admin.Identifier || ''));
    setAdminForm({
      ...admin,
      Name: admin.Name || '',
      Expires: normalizeExpiry(admin.Expires),
      Steam: admin.Steam || '',
      Discord: admin.Discord || '',
      DiscordRoles: admin.DiscordRoles || [],
      CharacterId: admin.CharacterId || '',
      Webhook: admin.Webhook || '',
      WebhookEvents: admin.WebhookEvents || ['all'],
    });
    setAdminToEdit(admin);
    setDuplicateAdminError(false);
  };

  const handleSaveAdmin = () => {
    const finalForm = { ...adminForm };

    if (adminToEdit) {
      // Editing an existing admin: keep the original identifier verbatim so the
      // DB update targets the correct row (keyed on identifier) instead of
      // re-prefixing it and inserting a duplicate. The identifier isn't meant to
      // change on edit, only the rank/expiry/webhook do.
      finalForm.Identifier = adminToEdit.Identifier;
    } else if (idType === 'STEAM' && finalForm.Identifier) {
      finalForm.Identifier = formatSteamIdentifier(finalForm.Identifier);
    } else if (idType === 'DISCORD' && finalForm.Identifier) {
      const clean = finalForm.Identifier.replace('discord:', '').trim();
      if (!finalForm.Identifier.startsWith('discord:')) {
        finalForm.Identifier = `discord:${clean}`;
      }
    } else if (idType === 'LICENSE' && finalForm.Identifier) {
      const clean = finalForm.Identifier.replace('license:', '').trim();
      if (!finalForm.Identifier.startsWith('license:')) {
        finalForm.Identifier = `license:${clean}`;
      }
    }

    // A typed name is kept as is; new admins otherwise default to their player or role name.
    // Editing with an empty name clears it so the live name shows again.
    const customName = adminForm.Name?.trim() || '';
    let adminName = customName;
    if (!customName && !adminToEdit) {
      if (idType === 'DISCORD ROLE') {
        adminName = discordRoles.find((r) => `role:${r.id}` === finalForm.Identifier)?.name || '';
      } else {
        const player = dbPlayers.find(
          (p) =>
            p.CitizenId === finalForm.Identifier ||
            p.Steam === finalForm.Identifier ||
            p.License === finalForm.Identifier,
        );
        adminName = player?.Name || '';
      }
    }
    finalForm.Name = adminName;

    // Adding (not editing): an identifier that's already an admin must go through
    // the edit flow instead of silently re-adding/overwriting it here.
    const isDuplicate = (identifier?: string) =>
      !adminToEdit && !!identifier && admins.some((a) => a.Identifier === identifier);

    if (!adminToEdit && idType === 'DISCORD ROLE' && finalForm.DiscordRoles && finalForm.DiscordRoles.length > 0) {
      if (finalForm.DiscordRoles.every((roleId) => isDuplicate(`role:${roleId}`))) {
        setDuplicateAdminError(true);
        return;
      }
      // Bulk add multiple discord roles as separate admin entries
      finalForm.DiscordRoles.forEach((roleId) => {
        const identifier = `role:${roleId}`;
        if (isDuplicate(identifier)) return;
        const roleName = customName || discordRoles.find((r) => r.id === roleId)?.name || roleId;
        fetchNui('saveAdmin', { ...finalForm, Identifier: identifier, Name: roleName });
      });
    } else if (isDuplicate(finalForm.Identifier)) {
      setDuplicateAdminError(true);
      return;
    } else {
      fetchNui('saveAdmin', finalForm);
    }
    closeAdminModal();
  };

  const handleDeleteAdmin = () => {
    if (!adminToDelete) return;
    fetchNui('deleteAdmin', { identifier: adminToDelete.Identifier });
    if (drawer?.kind === 'admin' && drawer.id === adminToDelete.Identifier) closeDrawer();
    setAdminToDelete(null);
  };

  const toggleDiscordRole = (roleId: string) => {
    setAdminForm((prev) => {
      const current = prev.DiscordRoles || [];
      const next = current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId];
      return { ...prev, Identifier: next.length > 0 ? `role:${next[0]}` : '', DiscordRoles: next };
    });
    setPickerSearch('');
  };

  const toggleWebhookEvent = (event: string) => {
    let current = adminForm.WebhookEvents || ['all'];
    if (event === 'all') current = ['all'];
    else {
      current = current.filter((e) => e !== 'all');
      current = current.includes(event) ? current.filter((e) => e !== event) : [...current, event];
      if (current.length === 0) current = ['all'];
    }
    setAdminForm({ ...adminForm, WebhookEvents: current });
  };

  const toggleTemporary = () => {
    const isTemp = !adminForm.IsTemp;
    setAdminForm({ ...adminForm, IsTemp: isTemp, Expires: isTemp && !adminForm.Expires ? defaultExpiry() : adminForm.Expires });
  };

  if (menuSize !== 'Large') {
    return (
      <LargeModeRequired
        pageName={t('ui.pages.access.ranks.access_control')}
        description={t('ui.pages.access.large_mode_desc')}
      />
    );
  }

  const adminDetails = new Map(admins.map((admin) => [admin.Identifier, resolveAdminDetails(admin)]));
  const detailsOf = (admin: AdminUser) => adminDetails.get(admin.Identifier) ?? resolveAdminDetails(admin);
  const rankById = new Map(ranks.map((rank) => [rank.Id, rank]));
  const permissionLabels = new Map(
    availablePermissions.flatMap((cat) => cat.permissions.map((p) => [p.id, p.label] as const)),
  );
  const adminCountByRank = admins.reduce(
    (counts, admin) => counts.set(admin.RankId, (counts.get(admin.RankId) ?? 0) + 1),
    new Map<string, number>(),
  );

  const onlineCount = admins.filter((admin) => detailsOf(admin).isOnline).length;
  const tempCount = admins.filter((admin) => admin.IsTemp).length;
  const totalPermissions = allPermissionIds.length;

  const grantedCount = (rank: Rank) =>
    rank.Permissions.includes('all')
      ? totalPermissions
      : allPermissionIds.filter((id) => rank.Permissions.includes(id)).length;

  const adminQuery = adminSearch.toLowerCase();
  const filteredAdmins = admins.filter((admin) => {
    if (adminStatus === 'temporary' && !admin.IsTemp) return false;
    const details = detailsOf(admin);
    if (adminStatus === 'online' && !details.isOnline) return false;
    if (!adminQuery) return true;
    return [
      admin.Identifier,
      admin.Name,
      admin.DisplayName,
      admin.CharacterId,
      details.displayName,
      details.discordId,
      details.steamHex,
      rankById.get(admin.RankId)?.Name,
    ].some((value) => typeof value === 'string' && value.toLowerCase().includes(adminQuery));
  });

  // Highest ranks first, and within a rank online admins first.
  const isFiltering = !!adminQuery || adminStatus !== 'all';
  const adminsByRank = new Map<string, AdminUser[]>();
  const unassignedAdmins: AdminUser[] = [];
  [...filteredAdmins]
    .sort(
      (a, b) =>
        Number(detailsOf(b).isOnline) - Number(detailsOf(a).isOnline) ||
        detailsOf(a).displayName.localeCompare(detailsOf(b).displayName),
    )
    .forEach((admin) => {
      if (rankById.has(admin.RankId)) adminsByRank.set(admin.RankId, [...(adminsByRank.get(admin.RankId) ?? []), admin]);
      else unassignedAdmins.push(admin);
    });
  const sortedRanks = [...ranks].sort(
    (a, b) =>
      Number(b.Permissions.includes('all')) - Number(a.Permissions.includes('all')) ||
      grantedCount(b) - grantedCount(a) ||
      a.Name.localeCompare(b.Name),
  );
  const rankColors = new Map(sortedRanks.map((rank, index) => [rank.Id, TIER_COLORS[index % TIER_COLORS.length]]));
  const rankColorOf = (rank?: Rank) => (rank ? rankColors.get(rank.Id) ?? FALLBACK_COLOR : UNKNOWN_RANK_COLOR);

  const boardColumns: { rank?: Rank; admins: AdminUser[] }[] = [
    ...sortedRanks.map((rank) => ({ rank, admins: adminsByRank.get(rank.Id) ?? [] })),
    ...(unassignedAdmins.length > 0 ? [{ admins: unassignedAdmins }] : []),
  ].filter((column) => !isFiltering || column.admins.length > 0);

  const drawerAdmin = drawer?.kind === 'admin' ? admins.find((admin) => admin.Identifier === drawer.id) : undefined;
  const drawerRank = drawer?.kind === 'rank' ? ranks.find((rank) => rank.Id === drawer.id) : undefined;

  const permQuery = permSearch.toLowerCase();
  const visiblePermissionCategories = availablePermissions
    .map((category) => ({
      ...category,
      permissions: category.permissions.filter((perm) => {
        const granted = drawerRank?.Permissions.includes('all') || drawerRank?.Permissions.includes(perm.id);
        if (grantedOnly && !granted) return false;
        return !permQuery || perm.label.toLowerCase().includes(permQuery) || perm.id.toLowerCase().includes(permQuery);
      }),
    }))
    .filter((category) => category.permissions.length > 0);

  const renderRankBadge = (rank?: Rank) => {
    const Icon = rankIcon(rank);
    const color = rankColorOf(rank);
    return (
      <span
        className="inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded-md border font-mono text-xs font-bold uppercase tracking-wider leading-none whitespace-nowrap"
        style={{ color, backgroundColor: withAlpha(color, 0.1), borderColor: withAlpha(color, 0.3) }}
      >
        <Icon size={11} className="shrink-0" />
        <span className="truncate">{rank?.Name || t('ui.pages.access.management.unknown_rank')}</span>
      </span>
    );
  };

  const renderRankAccess = (rank?: Rank) => {
    if (!rank) return null;
    if (rank.Permissions.includes('all')) return <Badge tone="success">{t('ui.pages.access.ranks.full_access')}</Badge>;
    const count = grantedCount(rank);
    if (count === 0) return <Badge tone="danger">{t('ui.pages.access.ranks.no_access')}</Badge>;
    return (
      <Badge tone={count === totalPermissions ? 'success' : 'default'}>
        {count}/{totalPermissions}
      </Badge>
    );
  };

  const renderAdminAvatar = (admin: AdminUser, className?: string) => {
    const details = detailsOf(admin);
    if (!admin.Identifier.startsWith('role:')) {
      return <Avatar name={details.displayName} src={admin.AvatarUrl} online={details.isOnline} className={className} />;
    }
    const color = roleColorOf(discordRoles.find((r) => `role:${r.id}` === admin.Identifier)) ?? FALLBACK_COLOR;
    return (
      <div
        className={cn('shrink-0 rounded-xl border flex items-center justify-center', className ?? 'w-9 h-9 text-base')}
        style={{ color, backgroundColor: withAlpha(color, 0.12), borderColor: withAlpha(color, 0.25) }}
      >
        <i className="fa-brands fa-discord"></i>
      </div>
    );
  };

  const renderIdentityField = (icon: React.ReactNode, label: string, value: string, extra?: React.ReactNode) => (
    <Field label={<IconLabel icon={icon}>{label}</IconLabel>} mono>
      <span className="truncate">{value}</span>
      {extra}
      <CopyButton text={value} />
    </Field>
  );

  const renderAdminDetail = (admin: AdminUser) => {
    const details = detailsOf(admin);
    const rank = rankById.get(admin.RankId);
    const isRole = admin.Identifier.startsWith('role:');
    const steamLink = getSteamProfileLink(details.steamHex);
    const steamLinkButton = steamLink && (
      <IconButton
        className="p-1"
        title={t('ui.pages.access.management.open_steam')}
        onClick={() => openExternalUrl(steamLink)}
      >
        <ExternalLink size={12} />
      </IconButton>
    );
    const isSteamIdentifier = admin.Identifier.startsWith('steam:');
    const explicitPermissions = rank && !rank.Permissions.includes('all') ? rank.Permissions : [];

    return (
      <>
        <PanelHeader
          media={renderAdminAvatar(admin, 'w-11 h-11 text-lg')}
          title={details.displayName}
          subtitle={rank?.Name || t('ui.pages.access.management.unknown_rank')}
          onClose={closeDrawer}
        />

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-6">
          <div className="flex flex-wrap gap-2">
            {rank ? (
              <button type="button" title={t('ui.pages.access.tabs.permissions')} onClick={() => openRankDrawer(rank)}>
                {renderRankBadge(rank)}
              </button>
            ) : (
              renderRankBadge(rank)
            )}
            {!isRole &&
              (details.isOnline ? (
                <StatusDot tone="success" label={t('ui.pages.access.management.filter_online')} />
              ) : (
                <StatusDot tone="default" label={t('ui.pages.access.management.filter_offline')} />
              ))}
            {admin.IsTemp && <StatusDot tone="warning" label={t('ui.pages.access.management.filter_temporary')} />}
          </div>

          <Section title={t('ui.pages.access.management.identity')}>
            <div>
              {renderIdentityField(
                <Fingerprint size={14} />,
                t('ui.pages.access.management.identifier'),
                admin.Identifier,
                isSteamIdentifier && steamLinkButton,
              )}
              {isLinked(details.discordId) &&
                !admin.Identifier.startsWith('discord:') &&
                renderIdentityField(
                  <i className="fa-brands fa-discord text-[13px] text-[#5865F2]"></i>,
                  'Discord',
                  details.discordId,
                )}
              {isLinked(details.steamHex) &&
                !isSteamIdentifier &&
                renderIdentityField(
                  <i className="fa-brands fa-steam text-[13px] text-[#66c0f4]"></i>,
                  'Steam',
                  details.steamHex,
                  steamLinkButton,
                )}
              {details.citizenId &&
                details.citizenId !== admin.Identifier &&
                renderIdentityField(
                  <IdCard size={14} />,
                  t('ui.pages.access.management.citizen_id'),
                  details.citizenId,
                )}
            </div>
          </Section>

          {!isRole && (
            <Section title={t('ui.pages.access.management.activity')}>
              <div>
                <Field
                  label={<IconLabel icon={<Timer size={14} />}>{t('ui.pages.access.management.col_duty')}</IconLabel>}
                  mono
                >
                  {formatDutyTime(admin.DutySeconds)}
                </Field>
                <Field
                  label={
                    <IconLabel icon={<CalendarClock size={14} />}>{t('ui.pages.access.management.col_access')}</IconLabel>
                  }
                  mono
                >
                  {admin.IsTemp ? (
                    <span className="text-warning">{formatExpiry(admin.Expires) ?? '?'}</span>
                  ) : (
                    t('ui.pages.access.management.permanent')
                  )}
                </Field>
              </div>
            </Section>
          )}

          <Section title={t('ui.pages.access.ranks.granted_permissions')} right={renderRankAccess(rank)}>
            {explicitPermissions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {explicitPermissions.map((perm) => {
                  const PermIcon = permissionIcon(perm);
                  return (
                    <span
                      key={perm}
                      title={perm}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-sm text-primary/80"
                    >
                      <PermIcon size={12} className="shrink-0 text-accent/80" />
                      {permissionLabels.get(perm) ?? perm}
                    </span>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title={t('ui.pages.access.management.logging')}>
            <div className="space-y-3">
              <Field label={<IconLabel icon={<Webhook size={14} />}>{t('ui.pages.access.management.webhook')}</IconLabel>}>
                {admin.Webhook
                  ? t('ui.pages.access.management.webhook_custom')
                  : t('ui.pages.access.management.webhook_auto')}
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {(admin.WebhookEvents || ['all']).map((event) => {
                  const EventIcon = WEBHOOK_EVENT_ICONS[event] ?? Layers;
                  return (
                    <Badge key={event} tone="accent" className="gap-1.5">
                      <EventIcon size={11} />
                      {event}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-white/5 shrink-0">
          <Button className="flex-1" icon={<Pencil size={13} />} onClick={() => handleOpenEditAdmin(admin)}>
            {t('ui.pages.access.management.edit')}
          </Button>
          <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => setAdminToDelete(admin)}>
            {t('ui.pages.access.management.revoke')}
          </Button>
        </div>
      </>
    );
  };

  const renderRankIcon = (rank: Rank | undefined, className: string, size: number) => {
    const Icon = rankIcon(rank);
    const color = rankColorOf(rank);
    return (
      <div
        className={cn('shrink-0 rounded-xl border flex items-center justify-center', className)}
        style={{ color, backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.3) }}
      >
        {rank ? <Icon size={size} /> : <TriangleAlert size={size} />}
      </div>
    );
  };

  const renderPermissionEditor = (rank: Rank) => {
    const color = rankColorOf(rank);
    const hasAll = rank.Permissions.includes('all');
    const granted = grantedCount(rank);
    const coverage = totalPermissions ? Math.round((granted / totalPermissions) * 100) : 0;

    return (
      <>
        <PanelHeader
          media={renderRankIcon(rank, 'w-10 h-10', 18)}
          title={rank.Name}
          subtitle={`${rank.Id} · ${t('ui.pages.access.ranks.perm_count', `${granted}/${totalPermissions}`)}`}
          onClose={closeDrawer}
          actions={
            <>
              <IconButton title={t('ui.pages.access.ranks.edit_title')} onClick={() => handleOpenEditRank(rank)}>
                <Pencil size={15} />
              </IconButton>
              <IconButton
                title={t('ui.pages.access.ranks.copy_title')}
                onClick={() => setCopiedPermissions([...rank.Permissions])}
              >
                <Copy size={15} />
              </IconButton>
              {copiedPermissions && (
                <IconButton
                  title={t('ui.pages.access.ranks.paste_title')}
                  onClick={() => saveRankPermissions(rank, [...copiedPermissions])}
                >
                  <ClipboardPaste size={15} />
                </IconButton>
              )}
              <IconButton
                tone="danger"
                title={t('ui.pages.access.ranks.delete_rank_title')}
                onClick={() => setRankToDelete(rank)}
              >
                <Trash2 size={15} />
              </IconButton>
            </>
          }
        />
        <div className="h-0.5 bg-white/5 shrink-0">
          <div className="h-full transition-all duration-500" style={{ width: `${coverage}%`, backgroundColor: color }} />
        </div>

        <Toolbar className="px-5 py-3 border-b border-white/5">
          <SearchField
            className="flex-1 min-w-[180px]"
            value={permSearch}
            onChange={setPermSearch}
            placeholder={t('ui.pages.access.ranks.search_permissions')}
          />
          <Button
            variant="ghost"
            className={cn(grantedOnly && 'bg-accent/10 text-accent hover:bg-accent/15 hover:text-accent')}
            onClick={() => setGrantedOnly((value) => !value)}
          >
            {t('ui.pages.access.ranks.granted_only')}
          </Button>
          {isEditingPermissions ? (
            <Button variant="primary" icon={<Check size={14} />} onClick={() => setIsEditingPermissions(false)}>
              {t('ui.pages.access.management.done')}
            </Button>
          ) : (
            <Button variant="primary" icon={<LockOpen size={14} />} onClick={() => setIsEditingPermissions(true)}>
              {t('ui.pages.access.management.edit_perms')}
            </Button>
          )}
        </Toolbar>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {isEditingPermissions ? (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" className="py-1.5 text-xs" onClick={() => saveRankPermissions(rank, allPermissionIds)}>
                {t('ui.pages.access.management.select_all')}
              </Button>
              <Button variant="ghost" className="py-1.5 text-xs" onClick={() => saveRankPermissions(rank, [])}>
                {t('ui.pages.access.management.deselect_all')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] border border-white/5 px-3.5 py-2.5 text-sm text-primary/80">
              <Lock size={14} className="shrink-0" />
              {t('ui.pages.access.ranks.locked_hint')}
            </div>
          )}

          {visiblePermissionCategories.length === 0 ? (
            <EmptyState title={t('ui.pages.access.ranks.no_permissions_match')} />
          ) : (
            visiblePermissionCategories.map((category) => {
              const categoryGranted = category.permissions.filter(
                (perm) => hasAll || rank.Permissions.includes(perm.id),
              ).length;
              const CategoryIcon = categoryIcon(category.title);
              return (
                <Section
                  key={category.title}
                  title={<IconLabel icon={<CategoryIcon size={14} />}>{category.title}</IconLabel>}
                  right={
                    <Badge tone={categoryGranted > 0 ? 'accent' : 'default'}>
                      {categoryGranted}/{category.permissions.length}
                    </Badge>
                  }
                >
                  <div className="grid grid-cols-2 gap-2">
                    {category.permissions.map((perm) => {
                      const isGranted = hasAll || rank.Permissions.includes(perm.id);
                      const PermIcon = permissionIcon(perm.id);
                      return (
                        <button
                          key={perm.id}
                          type="button"
                          disabled={!isEditingPermissions}
                          onClick={() => handleTogglePermission(rank, perm.id)}
                          className={cn(
                            'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                            isGranted ? 'bg-accent/[0.08] border-accent/25' : 'bg-black/20 border-white/5',
                            isEditingPermissions ? 'hover:border-white/15' : 'cursor-default',
                          )}
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <span
                              className={cn(
                                'w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors',
                                isGranted
                                  ? 'bg-accent/15 border-accent/25 text-accent'
                                  : 'bg-white/5 border-white/5 text-primary/50',
                              )}
                            >
                              <PermIcon size={15} />
                            </span>
                            <span className="min-w-0">
                              <span
                                className={cn('block text-base truncate', isGranted ? 'text-primary' : 'text-primary/70')}
                              >
                                {perm.label}
                              </span>
                              <span className="block font-mono text-xs text-primary/50 truncate">{perm.id}</span>
                            </span>
                          </span>
                          <Switch checked={isGranted} muted={!isEditingPermissions} />
                        </button>
                      );
                    })}
                  </div>
                </Section>
              );
            })
          )}
        </div>
      </>
    );
  };

  const renderAdminCard = (admin: AdminUser) => {
    const details = detailsOf(admin);
    const isRole = admin.Identifier.startsWith('role:');
    const typeMeta = ID_TYPES.find((type) => type.id === idTypeOf(admin.Identifier));
    const isActive = drawer?.kind === 'admin' && drawer.id === admin.Identifier;
    const expiry = admin.IsTemp ? formatExpiry(admin.Expires) : null;

    return (
      <div key={admin.Identifier} className="group relative">
        <button
          type="button"
          onClick={() => setDrawer({ kind: 'admin', id: admin.Identifier })}
          className={cn(
            'relative w-full flex items-center gap-3 text-left rounded-xl border px-3 py-3 transition-all duration-200 overflow-hidden',
            isActive
              ? 'bg-accent/10 border-accent/30'
              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10',
          )}
        >
          {admin.IsTemp && <span className="absolute inset-y-0 left-0 w-[3px] bg-warning" />}
          {renderAdminAvatar(admin, 'w-10 h-10 text-base')}

          <span className="min-w-0 flex-1">
            <span className={cn('block text-base font-semibold truncate', details.isOnline || isRole ? 'text-primary' : 'text-primary/70')}>
              {details.displayName}
            </span>
            <span className="flex items-center gap-1.5 mt-0.5 text-xs text-primary/50 min-w-0">
              <span className="shrink-0 flex items-center">
                <IdTypeIcon type={typeMeta} size={11} />
              </span>
              <span className="font-mono truncate">{admin.Identifier.replace(/^[a-z]+:/, '')}</span>
            </span>
          </span>

          <span className="shrink-0 flex flex-col items-end gap-1">
            {expiry ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-warning" title={expiry}>
                <Hourglass size={11} />
                {expiry.split(' ')[0]}
              </span>
            ) : (
              !isRole && (
                <span className="inline-flex items-center gap-1 font-mono text-xs text-primary/50">
                  <Timer size={11} />
                  {formatDutyTime(admin.DutySeconds)}
                </span>
              )
            )}
            {isRole && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8b93ff]">
                {t('ui.pages.access.management.methods.discord_role')}
              </span>
            )}
          </span>
          <ChevronRight
            size={15}
            className="shrink-0 -mr-1 text-primary/20 group-hover:opacity-0 transition-all"
          />
        </button>
        <button
          type="button"
          title={t('ui.pages.access.management.edit_name')}
          onClick={() => handleOpenEditAdmin(admin)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-primary/60 hover:text-primary hover:bg-white/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
        >
          <Pencil size={13} />
        </button>
      </div>
    );
  };

  const renderRankColumn = (rank: Rank | undefined, columnAdmins: AdminUser[]) => {
    const color = rankColorOf(rank);
    const memberCount = rank ? adminCountByRank.get(rank.Id) ?? 0 : columnAdmins.length;
    const onlineInRank = columnAdmins.filter((admin) => detailsOf(admin).isOnline).length;
    const coverage = rank && totalPermissions ? Math.round((grantedCount(rank) / totalPermissions) * 100) : 0;
    const isActive = !!rank && drawer?.kind === 'rank' && drawer.id === rank.Id;

    return (
      <div
        key={rank?.Id ?? 'unassigned'}
        className="flex flex-col rounded-2xl border bg-black/25 overflow-hidden transition-colors"
        style={{ borderColor: isActive ? withAlpha(color, 0.45) : 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="relative p-4 shrink-0"
          style={{ background: `linear-gradient(180deg, ${withAlpha(color, 0.14)} 0%, ${withAlpha(color, 0)} 100%)` }}
        >
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: color }} />

          <div className="flex items-center gap-3">
            {renderRankIcon(rank, 'w-11 h-11', 20)}
            <div className="min-w-0 flex-1">
              <div className="font-rajdhani font-bold text-xl uppercase tracking-wide text-primary leading-none truncate">
                {rank?.Name ?? t('ui.pages.access.management.unknown_rank')}
              </div>
              <div className="flex items-center gap-2.5 mt-1.5 text-sm text-primary/60">
                <span className="inline-flex items-center gap-1">
                  <UsersRound size={13} />
                  {t('ui.pages.access.ranks.admin_count', memberCount)}
                </span>
                {onlineInRank > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    {t('ui.pages.access.ranks.online_count', onlineInRank)}
                  </span>
                )}
              </div>
            </div>
            {rank && <CoverageRing value={coverage} color={color} />}
          </div>

          {rank && (
            <div className="flex items-center gap-1.5 mt-4">
              <button
                type="button"
                onClick={() => openRankDrawer(rank)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border py-2 font-rajdhani font-bold uppercase tracking-wider text-sm transition-colors hover:brightness-125"
                style={{ color, backgroundColor: withAlpha(color, 0.1), borderColor: withAlpha(color, 0.25) }}
              >
                <KeyRound size={13} />
                {t('ui.pages.access.tabs.permissions')}
              </button>
              <IconButton
                className="p-2 border border-white/5 bg-white/[0.03]"
                title={t('ui.pages.access.management.add')}
                onClick={() => handleOpenAddAdmin(rank.Id)}
              >
                <UserPlus size={15} />
              </IconButton>
              <IconButton
                className="p-2 border border-white/5 bg-white/[0.03]"
                title={t('ui.pages.access.ranks.edit_title')}
                onClick={() => handleOpenEditRank(rank)}
              >
                <Pencil size={15} />
              </IconButton>
              <IconButton
                tone="danger"
                className="p-2 border border-white/5 bg-white/[0.03]"
                title={t('ui.pages.access.ranks.delete_rank_title')}
                onClick={() => setRankToDelete(rank)}
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
          {columnAdmins.length > 0 ? (
            <>
              {columnAdmins.map(renderAdminCard)}
              {rank && (
                <button
                  type="button"
                  onClick={() => handleOpenAddAdmin(rank.Id)}
                  className="w-full rounded-xl border border-dashed border-white/[0.07] hover:border-white/20 py-2.5 flex items-center justify-center gap-2 text-sm text-primary/40 hover:text-primary/80 transition-colors"
                >
                  <Plus size={14} />
                  {t('ui.pages.access.management.add')}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenAddAdmin(rank?.Id)}
              className="w-full rounded-xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] py-6 flex flex-col items-center gap-2 text-primary/50 hover:text-primary/80 transition-colors"
            >
              <UserPlus size={18} />
              <span className="text-sm">{t('ui.pages.access.ranks.empty_column')}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderBoard = () => (
    <div className="h-full overflow-y-auto custom-scrollbar pb-2">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-4">
        {boardColumns.length === 0 ? (
          <Panel className="col-span-full">
            <EmptyState icon={<UsersRound size={44} />} title={t('ui.pages.access.management.no_results')} />
          </Panel>
        ) : (
          boardColumns.map((column) => renderRankColumn(column.rank, column.admins))
        )}
        {!isFiltering && (
          <button
            type="button"
            onClick={handleOpenAddRank}
            className="min-h-[200px] rounded-2xl border-2 border-dashed border-white/10 hover:border-accent/40 hover:bg-accent/[0.04] text-primary/50 hover:text-accent flex flex-col items-center justify-center gap-3 transition-colors"
          >
            <span className="w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
              <Plus size={20} />
            </span>
            <span className="font-rajdhani font-bold uppercase tracking-wider">{t('ui.pages.access.ranks.add_new')}</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderIdentifierInput = () => {
    if (idType === 'CHARACTER') {
      const query = pickerSearch.toLowerCase();
      const results = (dbPlayers.length > 0 ? dbPlayers : players)
        .filter((p) => p.Name.toLowerCase().includes(query) || p.CitizenId?.toLowerCase().includes(query))
        .slice(0, 30);
      const selectedName = dbPlayers.find(
        (p) => p.CitizenId === adminForm.Identifier || p.License === adminForm.Identifier,
      )?.Name;

      return (
        <div className="space-y-2">
          <SearchField
            value={pickerSearch}
            onChange={setPickerSearch}
            placeholder={t('ui.pages.access.management.search_player')}
          />
          <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-white/5 bg-black/20 divide-y divide-white/5">
            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-primary/60">{t('ui.pages.access.management.no_players')}</p>
            ) : (
              results.map((p) => {
                const isSelected = adminForm.CharacterId === p.CitizenId || adminForm.Identifier === p.License;
                return (
                  <div
                    key={p.CitizenId || p.ServerId}
                    className={cn('flex items-center justify-between gap-3 px-3 py-2', isSelected && 'bg-accent/10')}
                  >
                    <span className="min-w-0">
                      <span
                        className={cn('block text-base font-semibold truncate', isSelected ? 'text-accent' : 'text-primary')}
                      >
                        {p.Name}
                      </span>
                      <span className="block font-mono text-xs text-primary/60 truncate">{p.CitizenId || '-'}</span>
                    </span>
                    <span className="flex gap-1 shrink-0">
                      {p.CitizenId && (
                        <Button
                          className="px-2.5 py-1 text-xs"
                          variant={adminForm.Identifier === p.CitizenId ? 'primary' : 'default'}
                          title={t('ui.pages.access.management.add_by_cid')}
                          onClick={() =>
                            setAdminForm((prev) => ({ ...prev, Identifier: p.CitizenId, CharacterId: p.CitizenId }))
                          }
                        >
                          CID
                        </Button>
                      )}
                      {p.License && (
                        <Button
                          className="px-2.5 py-1 text-xs"
                          variant={adminForm.Identifier === p.License ? 'primary' : 'default'}
                          title={t('ui.pages.access.management.add_by_license')}
                          onClick={() =>
                            setAdminForm((prev) => ({ ...prev, Identifier: p.License, CharacterId: p.CitizenId || '' }))
                          }
                        >
                          {t('ui.pages.access.management.methods.license')}
                        </Button>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {adminForm.Identifier && (
            <p className="text-sm text-primary/70 truncate">
              {t('ui.pages.access.management.selected')}{' '}
              <span className="text-primary font-semibold">{selectedName || adminForm.Identifier}</span>
            </p>
          )}
        </div>
      );
    }

    if (idType === 'DISCORD ROLE') {
      const query = pickerSearch.trim();
      const selectedRoles = adminForm.DiscordRoles || [];
      const results = discordRoles.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

      return (
        <div className="space-y-2">
          <SearchField
            value={pickerSearch}
            onChange={setPickerSearch}
            placeholder={t('ui.pages.access.management.search_role')}
          />
          {selectedRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedRoles.map((roleId) => {
                const role = discordRoles.find((r) => r.id === roleId);
                return (
                  <span
                    key={roleId}
                    className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-white/5 border border-white/10 text-sm text-primary"
                    style={{ borderLeft: `3px solid ${roleColorOf(role) ?? 'rgb(var(--accent))'}` }}
                  >
                    {role?.name || roleId}
                    <IconButton tone="danger" className="p-0.5" onClick={() => toggleDiscordRole(roleId)}>
                      <i className="fa-solid fa-xmark text-xs"></i>
                    </IconButton>
                  </span>
                );
              })}
            </div>
          )}
          <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-white/5 bg-black/20 p-1">
            {discordRoles.length === 0 ? (
              <div className="p-4 text-center">
                <i className="fa-brands fa-discord text-xl mb-2 text-warning/70"></i>
                <p className="font-rajdhani font-bold uppercase tracking-wider text-primary/90">
                  {t('ui.pages.access.management.no_discord_roles')}
                </p>
                <p className="text-sm text-primary/60 mt-1">{t('ui.pages.access.management.discord_not_configured')}</p>
              </div>
            ) : (
              results.map((role) => {
                const isSelected = selectedRoles.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleDiscordRole(role.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left text-base transition-colors',
                      isSelected ? 'bg-accent/10 text-accent' : 'text-primary hover:bg-white/5',
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: roleColorOf(role) ?? 'rgb(var(--accent))' }}
                      />
                      <span className="truncate">{role.name}</span>
                    </span>
                    {isSelected && <Check size={13} className="shrink-0" />}
                  </button>
                );
              })
            )}
            {query && !discordRoles.some((r) => r.id === query) && (
              <button
                type="button"
                onClick={() => toggleDiscordRole(query)}
                className="w-full flex items-center gap-2 px-2.5 py-2 mt-1 rounded-md text-left text-sm bg-accent/10 hover:bg-accent/15 text-accent transition-colors"
              >
                <Plus size={13} className="shrink-0" />
                {t('ui.pages.access.management.use_custom_role_id')}
                <span className="font-mono text-primary truncate">{query}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    const typeMeta = ID_TYPES.find((type) => type.id === idType);
    const hint =
      idType === 'STEAM'
        ? t('ui.pages.access.management.hint_steam')
        : idType === 'DISCORD'
          ? t('ui.pages.access.management.hint_discord')
          : t('ui.pages.access.management.hint_license');

    return (
      <div>
        <input
          type="text"
          value={adminForm.Identifier || ''}
          onChange={(e) => setAdminForm({ ...adminForm, Identifier: e.target.value })}
          onBlur={(e) => {
            if (idType !== 'STEAM') return;
            const value = formatSteamIdentifier(e.target.value);
            setAdminForm((prev) => ({ ...prev, Identifier: value }));
          }}
          className={cn(inputClass, 'font-mono text-sm')}
          placeholder={t(
            'ui.pages.access.management.enter_identifier',
            t(`ui.pages.access.management.methods.${typeMeta?.key}`).toLowerCase(),
          )}
        />
        <p className="text-sm text-primary/60 mt-2">{hint}</p>
        {idType === 'STEAM' && (
          <p className="text-sm text-warning/80 mt-1">{t('ui.pages.access.management.hint_steam_vanity')}</p>
        )}
      </div>
    );
  };

  const renderAdminModal = () => {
    const editMeta = adminToEdit ? ID_TYPES.find((type) => type.id === idTypeOf(adminToEdit.Identifier)) : null;

    return (
      <Modal
        title={adminToEdit ? t('ui.pages.access.management.edit_title') : t('ui.pages.access.management.add_title')}
        subtitle={t('ui.pages.access.management.auth_subtitle')}
        width="max-w-[560px]"
        media={
          <IconTile className="w-10 h-10 rounded-lg">{adminToEdit ? <Pencil size={16} /> : <UserPlus size={16} />}</IconTile>
        }
        onClose={closeAdminModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeAdminModal}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              icon={<Check size={14} />}
              disabled={!adminForm.Identifier || !adminForm.RankId}
              onClick={handleSaveAdmin}
            >
              {t('ui.pages.access.management.confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {adminToEdit ? (
            <div>
              <Label>{t('ui.pages.access.management.identifier')}</Label>
              <div className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/5 px-3 py-2.5">
                <span className="text-accent flex items-center">
                  <IdTypeIcon type={editMeta ?? undefined} size={15} />
                </span>
                <span className="font-mono text-sm text-primary truncate flex-1">{adminToEdit.Identifier}</span>
                {editMeta && <Badge>{t(`ui.pages.access.management.methods.${editMeta.key}`)}</Badge>}
              </div>
              <p className="text-sm text-primary/60 mt-2">{t('ui.pages.access.management.identifier_locked')}</p>
            </div>
          ) : (
            <>
              <div>
                <Label>{t('ui.pages.access.management.type')}</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ID_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => selectIdType(type.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border px-1.5 py-2.5 font-rajdhani font-bold uppercase tracking-wide text-xs text-center leading-tight transition-colors',
                        idType === type.id
                          ? 'bg-accent/10 border-accent/40 text-accent'
                          : 'bg-black/20 border-white/5 text-primary/70 hover:text-primary hover:border-white/10',
                      )}
                    >
                      <span className="h-5 flex items-center">
                        <IdTypeIcon type={type} size={17} />
                      </span>
                      <span>{t(`ui.pages.access.management.methods.${type.key}`)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>{t('ui.pages.access.management.identifier')}</Label>
                {renderIdentifierInput()}
              </div>
            </>
          )}

          <div>
            <Label>
              <span className="flex items-center justify-between">
                {t('ui.pages.access.management.name')}
                <span className="font-normal normal-case tracking-normal text-primary/50">
                  {t('ui.pages.access.management.optional')}
                </span>
              </span>
            </Label>
            <input
              type="text"
              maxLength={64}
              value={adminForm.Name || ''}
              onChange={(e) => setAdminForm({ ...adminForm, Name: e.target.value })}
              className={cn(inputClass, 'text-sm')}
              placeholder={
                adminToEdit ? detailsOf(adminToEdit).displayName : t('ui.pages.access.management.name_placeholder')
              }
            />
          </div>

          <div>
            <Label>{t('ui.pages.access.management.authority_level')}</Label>
            <Select
              value={adminForm.RankId || ''}
              onChange={(RankId) => setAdminForm((prev) => ({ ...prev, RankId }))}
              triggerClassName="bg-black/30 border border-white/5 hover:border-white/10 rounded-lg px-3 py-2.5 text-base text-primary"
              options={ranks.map((rank) => ({
                id: rank.Id,
                label: `${rank.Name} (${grantedCount(rank)}/${totalPermissions})`,
              }))}
            />
          </div>

          <div className="rounded-xl border border-white/5 bg-black/20">
            <button
              type="button"
              onClick={toggleTemporary}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <IconTile tone={adminForm.IsTemp ? 'warning' : 'default'} className="w-9 h-9 rounded-lg">
                  {adminForm.IsTemp ? <Hourglass size={16} /> : <InfinityIcon size={16} />}
                </IconTile>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-primary">
                    {t('ui.pages.access.management.temp_status')}
                  </span>
                  <span className="block text-sm text-primary/70">
                    {adminForm.IsTemp
                      ? t('ui.pages.access.management.temp_status_desc')
                      : t('ui.pages.access.management.perm_registry_active')}
                  </span>
                </span>
              </span>
              <Switch checked={!!adminForm.IsTemp} tone="warning" />
            </button>
            {adminForm.IsTemp && (
              <div className="px-4 pb-4">
                <DateTimePicker
                  value={normalizeExpiry(adminForm.Expires)}
                  onChange={(value) => setAdminForm({ ...adminForm, Expires: value })}
                />
              </div>
            )}
          </div>

          <div>
            <Label>
              <span className="flex items-center justify-between">
                {t('ui.pages.access.management.webhook')}
                <span className="font-normal normal-case tracking-normal text-primary/50">
                  {t('ui.pages.access.management.optional')}
                </span>
              </span>
            </Label>
            <input
              type="text"
              value={adminForm.Webhook || ''}
              onChange={(e) => setAdminForm({ ...adminForm, Webhook: e.target.value })}
              className={cn(inputClass, 'text-sm')}
              placeholder={t('ui.pages.access.management.webhook_placeholder')}
            />
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary/60 mt-3 mb-2">
              {t('ui.pages.access.management.events')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WEBHOOK_EVENTS.map((event) => {
                const isSelected = (adminForm.WebhookEvents || ['all']).includes(event);
                const EventIcon = WEBHOOK_EVENT_ICONS[event] ?? Layers;
                return (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleWebhookEvent(event)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-xs font-bold uppercase tracking-wider transition-colors',
                      isSelected
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : 'bg-white/5 border-white/5 text-primary/70 hover:text-primary hover:border-white/10',
                    )}
                  >
                    <EventIcon size={12} />
                    {event}
                  </button>
                );
              })}
            </div>
          </div>

          {duplicateAdminError && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg py-2.5 px-3">
              <TriangleAlert size={14} className="shrink-0" />
              <span>{t('ui.pages.access.management.already_admin')}</span>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div className="relative flex flex-col h-full w-full">
      <div className="p-6 pb-0 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent relative overflow-hidden">
              <div className="absolute inset-0 bg-accent/20"></div>
              <i className="fa-solid fa-shield-halved text-2xl relative z-10"></i>
            </div>
            <div>
              <h2 className="text-2xl font-rajdhani font-bold text-primary leading-none tracking-wide uppercase">
                {t('ui.pages.access.ranks.access_control')}
              </h2>
              <p className="text-xs font-mono text-primary/80 mt-1.5 uppercase tracking-widest font-bold">
                {t('ui.pages.access.ranks.ranks_management_subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleDiscordLogs}
            className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 px-3.5 py-2.5 transition-colors"
          >
            <i
              className={cn('fa-brands fa-discord text-base', discordLogsEnabled ? 'text-[#5865F2]' : 'text-primary/50')}
            ></i>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary/80">
              {t('ui.pages.access.discord_logs')}
            </span>
            <Switch checked={discordLogsEnabled} />
          </button>
        </div>

        <Toolbar className="border-b border-white/10 pb-4 mb-5">
          <Segmented
            value={adminStatus}
            onChange={setAdminStatus}
            options={[
              { id: 'all', label: t('ui.pages.access.management.filter_all'), count: admins.length },
              { id: 'online', label: t('ui.pages.access.management.filter_online'), count: onlineCount },
              { id: 'temporary', label: t('ui.pages.access.management.filter_temporary'), count: tempCount },
            ]}
          />
          <SearchField
            className="w-80"
            value={adminSearch}
            onChange={setAdminSearch}
            placeholder={t('ui.pages.access.management.search')}
          />
          <Button className="ml-auto" icon={<Plus size={14} />} onClick={handleOpenAddRank}>
            {t('ui.pages.access.ranks.add_new')}
          </Button>
          <Button variant="primary" icon={<UserPlus size={14} />} onClick={() => handleOpenAddAdmin()}>
            {t('ui.pages.access.management.add')}
          </Button>
        </Toolbar>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6">{renderBoard()}</div>

      {(drawerAdmin || drawerRank) && (
        <div className="absolute inset-0 z-40 flex justify-end overflow-hidden">
          <div className="absolute inset-0 bg-black/60 animate-in fade-in duration-200" onClick={closeDrawer} />
          <div
            className={cn(
              'relative h-full max-w-[85%] bg-sidebar border-l border-white/10 flex flex-col shadow-2xl shadow-black/50 animate-in slide-in-from-right duration-300',
              drawerRank ? 'w-[680px]' : 'w-[400px]',
            )}
          >
            {drawerRank ? renderPermissionEditor(drawerRank) : drawerAdmin && renderAdminDetail(drawerAdmin)}
          </div>
        </div>
      )}

      {(isAddRankModalOpen || rankToEdit) && (
        <Modal
          title={rankToEdit ? t('ui.pages.access.ranks.modify') : t('ui.pages.access.ranks.register')}
          subtitle={t('ui.pages.access.ranks.authority_config')}
          media={
            <IconTile className="w-10 h-10 rounded-lg">{rankToEdit ? <Pencil size={16} /> : <Plus size={16} />}</IconTile>
          }
          onClose={closeRankModal}
          footer={
            <>
              <Button variant="ghost" onClick={closeRankModal}>
                {t('ui.pages.access.ranks.discard')}
              </Button>
              <Button
                variant="primary"
                icon={<Check size={14} />}
                disabled={!rankForm.Id || !rankForm.Name}
                onClick={handleSaveRank}
              >
                {t('ui.pages.access.ranks.commit')}
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <div>
              <Label>{t('ui.pages.access.ranks.id_label')}</Label>
              <input
                type="text"
                value={rankForm.Id || ''}
                onChange={(e) => setRankForm({ ...rankForm, Id: e.target.value })}
                disabled={!!rankToEdit}
                className={cn(inputClass, 'font-mono text-sm disabled:opacity-50')}
                placeholder={t('ui.pages.access.ranks.id_placeholder')}
              />
              {!rankToEdit && <p className="text-sm text-primary/60 mt-2">{t('ui.pages.access.ranks.id_note')}</p>}
            </div>
            <div>
              <Label>{t('ui.pages.access.ranks.name_label')}</Label>
              <input
                type="text"
                value={rankForm.Name || ''}
                onChange={(e) => setRankForm({ ...rankForm, Name: e.target.value })}
                className={inputClass}
                placeholder={t('ui.pages.access.ranks.name_placeholder')}
              />
            </div>
          </div>
        </Modal>
      )}

      {rankToDelete && (
        <Modal
          title={t('ui.pages.access.ranks.delete_rank_title')}
          subtitle={t('ui.pages.access.ranks.irreversible_action')}
          media={
            <IconTile tone="danger" className="w-10 h-10 rounded-lg">
              <TriangleAlert size={16} />
            </IconTile>
          }
          onClose={() => setRankToDelete(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRankToDelete(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                className="bg-danger text-white hover:bg-danger/80"
                icon={<Trash2 size={14} />}
                onClick={handleDeleteRank}
              >
                {t('ui.pages.access.management.purge_title')}
              </Button>
            </>
          }
        >
          <p className="text-base text-primary/80 leading-relaxed">
            {t('ui.pages.access.ranks.delete_rank_desc', rankToDelete.Name, adminCountByRank.get(rankToDelete.Id) ?? 0)}
          </p>
        </Modal>
      )}

      {(isAddAdminModalOpen || adminToEdit) && renderAdminModal()}

      {adminToDelete && (
        <Modal
          title={t('ui.pages.access.management.revoke_title')}
          subtitle={t('ui.pages.access.ranks.irreversible_action')}
          media={
            <IconTile tone="danger" className="w-10 h-10 rounded-lg">
              <TriangleAlert size={16} />
            </IconTile>
          }
          onClose={() => setAdminToDelete(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setAdminToDelete(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                className="bg-danger text-white hover:bg-danger/80"
                icon={<Trash2 size={14} />}
                onClick={handleDeleteAdmin}
              >
                {t('ui.pages.access.management.revoke')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-base text-primary/80 leading-relaxed">
              {t('ui.pages.access.management.revoke_desc', detailsOf(adminToDelete).displayName)}
            </p>
            <p className="font-mono text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 break-all">
              {adminToDelete.Identifier}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AccessControlPage;
