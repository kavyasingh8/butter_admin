local ranks = {}  ---@type table<string, { Id: string, Name: string, Permissions: string[] }> keyed by lowercase id
local admins = {} ---@type table<string, table> keyed by identifier
local resolvedPermissions = {} ---@type table<number, { rank: string, permissions: table<string, boolean>, expiresAt: number? }>
local staffFlags = {} ---@type table<number, boolean>
local dutyDeniedOnly = {} ---@type table<number, boolean>
local accessReady = promise.new()

local OFFLINE_NAME_TTL = 600 -- seconds
local offlineNames = {} ---@type table<string, { name: string, time: number }>

--- Every identifier a player can be matched by, plus their citizen ID.
---@param source number
---@return string[]
local function getMatchIdentifiers(source)
    local identifiers = GetPlayerIdentifiers(source) or {}
    local playerData = GetPlayerData(source)
    if playerData and playerData.citizenId then
        identifiers[#identifiers + 1] = playerData.citizenId
    end
    return identifiers
end

--- Admin entries may be stored with or without their "prefix:".
---@param identifier string
---@return table?, string?
local function findAdminEntry(identifier)
    if admins[identifier] then return admins[identifier], identifier end
    local stripped = identifier:gsub('^%w+:', '')
    if admins[stripped] then return admins[stripped], stripped end
    return nil
end

---@param rankId string?
---@return string[]?
local function getRankPermissions(rankId)
    local rank = rankId and ranks[rankId:lower()]
    return rank?.Permissions
end

local permissionCategories

--- Permission categories shown in Access Control.
---@return { title: string, permissions: { id: string, label: string }[] }[]
local function getPermissionCategories()
    if permissionCategories then return permissionCategories end

    local general = {
        { id = 'all', label = 'Full Access (*)' },
        { id = 'menuopen', label = 'Open Admin Menu' },
        { id = 'menureset', label = 'Reset Menu Preferences' },
        { id = 'page.commands', label = 'Page: Commands' },
        { id = 'page.playerlist', label = 'Page: Player List' },
        { id = 'page.bans', label = 'Page: Bans' },
        { id = 'page.playerlogs', label = 'Page: Player Logs' },
        { id = 'page.staffchat', label = 'Page: Staff Chat' },
        { id = 'page.reports', label = 'Page: Reports' },
        { id = 'page.accesscontrol', label = 'Page: Access Control' },
        { id = 'page.database', label = 'Page: Database' },
        { id = 'page.options', label = 'Page: Options' },
        { id = 'page.resources', label = 'Page: Resources' },
        { id = 'page.txadmin', label = 'Page: Server Dashboard' },
        { id = 'devmode', label = 'Developer Mode' },
    }
    if Config.EnableMonitoring then
        general[#general + 1] = { id = 'page.monitoring', label = 'Page: Monitoring' }
    end

    permissionCategories = {
        { title = 'General & Pages', permissions = general },
        {
            title = 'Player Profile',
            permissions = {
                { id = 'fullprofile', label = 'Open Full Profile' },
                { id = 'reviveplayer', label = 'Action: Revive Player' },
                { id = 'killplayer', label = 'Action: Kill Player' },
            },
        },
    }

    for _, category in ipairs(Config.CommandList) do
        local permissions = {}
        for _, item in ipairs(category.Items) do
            permissions[#permissions + 1] = { id = item.Id, label = item.Name or item.Id }
        end
        if #permissions > 0 then
            permissionCategories[#permissionCategories + 1] = { title = 'Cmds: ' .. category.Name, permissions = permissions }
        end
    end

    permissionCategories[#permissionCategories + 1] = {
        title = 'System',
        permissions = {
            { id = 'resources_management', label = 'Resource Management' },
            { id = 'txadmin_console', label = 'Run Console Commands' },
            { id = 'spawnprop', label = 'Spawn & Manage Props' },
        },
    }
    return permissionCategories
end

MySQL.ready(function()
    AwaitSchema()

    local rankRows = MySQL.query.await('SELECT id, name, permissions FROM admin_ranks') or {}
    for _, row in ipairs(rankRows) do
        ranks[row.id:lower()] = { Id = row.id, Name = row.name, Permissions = DecodeJson(row.permissions, {}) }
    end

    local staffRows = MySQL.query.await('SELECT identifier, name, rank_id, is_temp, expires, webhook, webhook_events, duty_seconds FROM admin_staff') or {}
    for _, row in ipairs(staffRows) do
        admins[row.identifier] = {
            Identifier = row.identifier,
            Name = row.name,
            RankId = row.rank_id,
            IsTemp = row.is_temp == 1 or row.is_temp == true,
            Expires = tonumber(row.expires),
            Webhook = row.webhook,
            WebhookEvents = DecodeJson(row.webhook_events, { 'all' }),
            DutySeconds = tonumber(row.duty_seconds) or 0,
        }
    end

    LogDebug(('Loaded %d ranks and %d staff entries'):format(#rankRows, #staffRows))
    accessReady:resolve(true)
end)

--- Merges a rank into `permissions`, tracking the highest-weighted rank. A rank
--- with 'all' always wins; otherwise the one granting the most permissions.
---@return string? rankId, number weight
local function mergeRank(permissions, rankId, bestWeight, bestRank)
    local rank = ranks[rankId:lower()]
    if not rank then return bestRank, bestWeight end

    local weight = #rank.Permissions
    for _, permission in ipairs(rank.Permissions) do
        permissions[permission] = true
        if permission == 'all' then weight = math.huge end
    end

    if weight > bestWeight then return rank.Id, weight end
    return bestRank, bestWeight
end

--- Resolves and caches all permissions for a player.
---@param source number
---@param ignoreCache? boolean
---@return { rank: string, permissions: table<string, boolean>, expiresAt: number? }
function ResolvePermissions(source, ignoreCache)
    if not source or source == 0 then return { rank = 'Console', permissions = { all = true } } end
    Citizen.Await(accessReady)

    local now = os.time()
    local cached = resolvedPermissions[source]
    local lapsed = cached?.expiresAt and now > cached.expiresAt
    if cached and not ignoreCache and not lapsed then return cached end
    if lapsed then staffFlags[source] = nil end

    local permissions, bestRank, bestWeight, soonestExpiry = {}, nil, -1, nil

    local function apply(admin)
        if admin.IsTemp then
            if not admin.Expires or now > admin.Expires then return end
            -- Re-resolve when the first temporary grant lapses, not at relog.
            if not soonestExpiry or admin.Expires < soonestExpiry then soonestExpiry = admin.Expires end
        end
        bestRank, bestWeight = mergeRank(permissions, admin.RankId, bestWeight, bestRank)
    end

    for _, identifier in ipairs(getMatchIdentifiers(source)) do
        local admin = findAdminEntry(identifier)
        if admin then apply(admin) end
    end

    for _, roleId in ipairs(GetPlayerRoles(source)) do
        local admin = admins['role:' .. roleId]
        if admin then apply(admin) end
    end

    if HasFrameworkPermission(source) then permissions.all = true end

    local result = { rank = bestRank or 'User', permissions = permissions, expiresAt = soonestExpiry }
    resolvedPermissions[source] = result
    return result
end

local function invalidateAllPermissions()
    resolvedPermissions = {}
    staffFlags = {}
end

---@return boolean
local function isDutyRestricted()
    local duty = Config.DutySystem
    return duty.Enabled and duty.RestrictAdminActions
end

---@param permissions table<string, boolean>
---@return boolean
local function hasDutyBypass(permissions)
    return permissions.all == true
end

--- True when the player's last failed check was only because they were off
--- duty (they do hold the permission). Consumes the flag.
---@param source number
---@return boolean
function WasDutyDeniedOnly(source)
    local deniedOnly = dutyDeniedOnly[source]
    dutyDeniedOnly[source] = nil
    return deniedOnly == true
end

--- Whether the player may open the menu right now (on duty, or exempt).
---@param source number
---@return boolean
function IsOnDutyOrExempt(source)
    if source == 0 or not isDutyRestricted() then return true end
    if Player(source).state.adminDuty then return true end
    return hasDutyBypass(ResolvePermissions(source).permissions)
end

---@param source number
---@param dutyOnly boolean
---@param reason string
local function handleDenial(source, dutyOnly, reason)
    if dutyOnly then return Notify(source, locale('info.not_on_duty'), 'error') end

    Notify(source, locale('info.no_perm'), 'error')
    -- Staff can reach menu buttons for permissions they lack, so only
    -- non-staff are kicked.
    local isStaff = ResolvePermissions(source).permissions.menuopen == true
    LogExploit(source, reason, not isStaff)
end

--- Permission check. With `reason`, a denial is handled here: the player is
--- told why and it is logged as an exploit, unless the only problem was being
--- off duty. Non-staff are also kicked.
---@param source number
---@param permission string
---@param reason? string
---@return boolean
function IsAuthorized(source, permission, reason)
    if source == 0 then return true end
    dutyDeniedOnly[source] = nil

    local permissions = ResolvePermissions(source).permissions
    local allowed = permissions.all == true or permissions[permission] == true
    local dutyOnly = false

    -- 'menuopen' only gates seeing the menu and its reference data; duty
    -- restricts the actual admin actions.
    if allowed and permission ~= 'menuopen' and isDutyRestricted() and not Player(source).state.adminDuty then
        if hasDutyBypass(permissions) then return true end
        dutyDeniedOnly[source] = true
        dutyOnly = true
        allowed = false
    end

    if not allowed and reason then handleDenial(source, dutyOnly, reason) end
    return allowed
end

--- Passes when the player holds any of `permissions`. Chaining IsAuthorized
--- calls instead would reset the off-duty flag between checks.
---@param source number
---@param permissions string[]
---@param reason? string
---@return boolean
function IsAuthorizedAny(source, permissions, reason)
    if source == 0 then return true end

    local dutyOnly = false
    for _, permission in ipairs(permissions) do
        if IsAuthorized(source, permission) then return true end
        if dutyDeniedOnly[source] then dutyOnly = true end
    end

    dutyDeniedOnly[source] = dutyOnly or nil
    if reason then handleDenial(source, dutyOnly, reason) end
    return false
end

--- Cached "is staff" check for hot paths (the blips broadcast runs it for
--- every player twice a second). Dropped whenever permissions or duty change.
---@param source number
---@return boolean
function IsStaff(source)
    local flag = staffFlags[source]
    if flag == nil then
        flag = IsAuthorized(source, 'menuopen')
        staffFlags[source] = flag
    end
    return flag
end

AddStateBagChangeHandler('adminDuty', nil, function(bagName)
    local source = tonumber(bagName:match('player:(%d+)'))
    if source then staffFlags[source] = nil end
end)

--- The key in `admins` this player maps to (identifier or Discord role).
---@param source number
---@return string?
local function getAdminKey(source)
    for _, identifier in ipairs(getMatchIdentifiers(source)) do
        local _, key = findAdminEntry(identifier)
        if key then return key end
    end
    for _, roleId in ipairs(GetPlayerRoles(source)) do
        if admins['role:' .. roleId] then return 'role:' .. roleId end
    end
end

---@param source number
---@param seconds number
function AddAdminDutySeconds(source, seconds)
    if not seconds or seconds <= 0 then return end

    local key = getAdminKey(source)
    local admin = key and admins[key]
    if not admin then return end

    admin.DutySeconds = (admin.DutySeconds or 0) + math.floor(seconds)
    MySQL.update('UPDATE admin_staff SET duty_seconds = ? WHERE identifier = ?', { admin.DutySeconds, key })
    BroadcastAccessData()
end

--- Personal webhook of the admin behind `source` and the events they subscribed to.
---@param source? number
---@return string?, string[]
function GetAdminWebhookBySource(source)
    if not source or source == 0 then return nil, {} end
    for _, identifier in ipairs(getMatchIdentifiers(source)) do
        local admin = findAdminEntry(identifier)
        if admin?.Webhook and admin.Webhook ~= '' then
            return admin.Webhook, admin.WebhookEvents or { 'all' }
        end
    end
    return nil, {}
end

local function clearPlayerCache(source)
    resolvedPermissions[source] = nil
    dutyDeniedOnly[source] = nil
    staffFlags[source] = nil
end

AddEventHandler('playerDropped', function()
    clearPlayerCache(source)
end)

-- Server IDs are recycled, and other playerDropped handlers can re-cache the
-- departing player's permissions after the cleanup above.
AddEventHandler('playerJoining', function()
    clearPlayerCache(source)
end)

---@param identifier string
---@return string
local function getOfflineName(identifier)
    local entry = offlineNames[identifier]
    if entry and os.time() - entry.time < OFFLINE_NAME_TTL then return entry.name end

    local name = GetOfflinePlayerName(identifier)
    offlineNames[identifier] = { name = name, time = os.time() }
    return name
end

--- Maps every online identifier (verbatim and without prefix) and citizen ID
--- to its player, so each admin row is a lookup instead of a scan.
---@return table<string, { source: number, playerData: table|false }>
local function buildOnlineIndex()
    local index = {}
    for _, playerId in ipairs(GetPlayers()) do
        local source = tonumber(playerId)
        local entry = { source = source, playerData = GetPlayerData(source) }
        for _, identifier in ipairs(GetPlayerIdentifiers(source) or {}) do
            local key = identifier:lower():gsub('%s+', '')
            index[key] = entry
            index[(key:gsub('^%w+:', ''))] = entry
        end
        if entry.playerData and entry.playerData.citizenId then
            index[entry.playerData.citizenId:lower()] = entry
        end
    end
    return index
end

---@param name string?
---@param identifier string
---@return boolean
local function isPlaceholderName(name, identifier)
    return not name or name == 'Unknown' or name == identifier
        or name:find('^steam:') ~= nil or name:find('^license:') ~= nil
end

---@param admin table
---@param onlineIndex table
---@return table
local function buildAdminRow(admin, onlineIndex)
    local identifier = admin.Identifier
    local row = {
        Identifier = identifier,
        Name = admin.Name,
        RankId = admin.RankId,
        IsTemp = admin.IsTemp,
        Expires = admin.Expires,
        Webhook = admin.Webhook,
        WebhookEvents = admin.WebhookEvents,
        DutySeconds = admin.DutySeconds or 0,
    }

    local key = identifier:lower():gsub('%s+', '')
    local online = onlineIndex[key] or onlineIndex[(key:gsub('^%w+:', ''))]
    if online then
        row.DisplayName = online.playerData and online.playerData.name or GetPlayerName(online.source)
        row.Steam = GetIdentifier(online.source, 'steam')
        row.Discord = GetIdentifier(online.source, 'discord')
        row.CharacterId = online.playerData and online.playerData.citizenId
    elseif identifier:find('^role:') then
        row.DisplayName = 'Unknown'
    else
        row.DisplayName = getOfflineName(identifier)
    end

    local discordId = (identifier:find('^discord:') or identifier:match('^%d+$')) and identifier or row.Discord
    if discordId and discordId ~= '' then
        local profile = GetDiscordProfile(discordId, BroadcastAccessData)
        if profile then
            if discordId == identifier or isPlaceholderName(row.DisplayName, identifier) then
                row.DisplayName = profile.name
            end
            row.AvatarUrl = profile.avatar
        end
    end

    local steamHex
    if identifier:find('^steam:') or (#identifier == 15 and identifier:match('^[0-9a-fA-F]+$')) then
        steamHex = identifier
    elseif not row.AvatarUrl and row.Steam and row.Steam ~= '' then
        steamHex = row.Steam
    end

    if steamHex then
        local profile = GetSteamProfile(steamHex, BroadcastAccessData)
        if profile then
            if isPlaceholderName(row.DisplayName, identifier) then row.DisplayName = profile.name end
            row.AvatarUrl = profile.avatar
        end
    end

    return row
end

--- The character list scans the players table, so it is only sent on the
--- page's first fetch; live broadcasts leave it out and the UI keeps its copy.
---@param includeCharacters? boolean
---@return table
local function buildAccessPayload(includeCharacters)
    local payload = {
        Ranks = {},
        Admins = {},
        AvailablePermissions = getPermissionCategories(),
        Characters = includeCharacters and GetAllCharacters() or nil,
        DiscordRoles = GetGuildRoles(),
        DiscordLogsEnabled = IsDiscordLogsEnabled(),
    }

    for _, rank in pairs(ranks) do payload.Ranks[#payload.Ranks + 1] = rank end

    local onlineIndex = buildOnlineIndex()
    for _, admin in pairs(admins) do
        payload.Admins[#payload.Admins + 1] = buildAdminRow(admin, onlineIndex)
    end
    return payload
end

local broadcastQueued = false

--- Pushes fresh Access Control data to everyone viewing it. Debounced, since
--- every Discord/Steam profile that lands calls back into here.
function BroadcastAccessData()
    if broadcastQueued then return end
    broadcastQueued = true

    SetTimeout(250, function()
        broadcastQueued = false

        local viewers = {}
        for _, playerId in ipairs(GetPlayers()) do
            local source = tonumber(playerId)
            if IsAuthorized(source, 'page.accesscontrol') then viewers[#viewers + 1] = source end
        end
        if #viewers == 0 then return end

        local payload = buildAccessPayload(false)
        for _, viewer in ipairs(viewers) do
            TriggerClientEvent('butter_admin:client:updateAccessData', viewer, payload)
        end
    end)
end

--- After a rank or admin changes: drop cached permissions and have every
--- client re-fetch its own, so access applies without a relog.
local function onAccessChanged()
    invalidateAllPermissions()
    BroadcastAccessData()
    TriggerClientEvent('butter_admin:client:refreshPermissions', -1)
end

--- Staff can never hand out (or take over an entry holding) a permission they
--- lack, nor 'all'. The console and holders of 'all' bypass this.
---@param source number
---@param permissionList string[]?
---@return boolean
local function canGrant(source, permissionList)
    if source == 0 then return true end
    local permissions = ResolvePermissions(source, true).permissions
    if permissions.all then return true end
    for _, permission in ipairs(permissionList or {}) do
        if permission == 'all' or not permissions[permission] then return false end
    end
    return true
end

---@param list any
---@return string[]?
local function validatePermissionList(list)
    if list == nil then return {} end
    if type(list) ~= 'table' or #list > 500 then return nil end

    local out, seen = {}, {}
    for _, permission in ipairs(list) do
        if type(permission) ~= 'string' or permission == '' or #permission > 64 then return nil end
        if not seen[permission] then
            seen[permission] = true
            out[#out + 1] = permission
        end
    end
    return out
end

---@param url any
---@return boolean
local function isDiscordWebhookUrl(url)
    return type(url) == 'string' and #url <= 512 and (
        url:match('^https://[%w%.%-]*discord%.com/api/webhooks/') ~= nil
        or url:match('^https://[%w%.%-]*discordapp%.com/api/webhooks/') ~= nil
    )
end

---@param events any
---@return string[]
local function validateWebhookEvents(events)
    if type(events) ~= 'table' then return { 'all' } end
    local out = {}
    for i = 1, math.min(#events, 32) do
        if type(events[i]) == 'string' and #events[i] <= 32 then out[#out + 1] = events[i] end
    end
    return #out > 0 and out or { 'all' }
end

---@param expires any { year, month, day, hour?, min? }
---@return number?
local function parseExpiry(expires)
    if type(expires) ~= 'table' then return nil end
    local year, month, day = tonumber(expires.year), tonumber(expires.month), tonumber(expires.day)
    if not year or not month or not day then return nil end
    return os.time({ year = year, month = month, day = day, hour = tonumber(expires.hour) or 0, min = tonumber(expires.min) or 0, sec = 0 })
end

lib.callback.register('butter_admin:server:getPermissions', function(source)
    return ResolvePermissions(source)
end)

-- Client-only actions (noclip, vehicle spawns, props) re-verify here before
-- doing anything network-visible; the menu's local check is only a UI filter.
lib.callback.register('butter_admin:server:verifyPermission', function(source, permission)
    if type(permission) ~= 'string' or permission == '' then return false, false end
    local allowed = IsAuthorized(source, permission)
    return allowed, not allowed and WasDutyDeniedOnly(source)
end)

lib.callback.register('butter_admin:server:getAccessData', function(source)
    if not IsAuthorized(source, 'page.accesscontrol') then return nil end
    return buildAccessPayload(true)
end)

RegisterNetEvent('butter_admin:server:setDiscordLogs', function(enabled)
    local source = source
    if not IsAuthorized(source, 'page.accesscontrol', 'Toggled Discord logs without permission') then return end

    SetDiscordLogsEnabled(enabled == true)
    CreateLog(source, 'Access Control', ('%s Discord webhook logging'):format(enabled == true and 'Enabled' or 'Disabled'))
    BroadcastAccessData()
end)

RegisterNetEvent('butter_admin:server:saveRank', function(data)
    local source = source
    if not IsAuthorized(source, 'page.accesscontrol', 'Saved a rank without permission') then return end
    if type(data) ~= 'table' or not IsValidSqlIdentifier(data.Id) or #data.Id > 50 then return end

    local permissions = validatePermissionList(data.Permissions)
    if not permissions then return Notify(source, locale('access.invalid_permissions'), 'error') end

    local existing = getRankPermissions(data.Id)
    if not canGrant(source, permissions) or (existing and not canGrant(source, existing)) then
        return Notify(source, locale('access.cannot_grant'), 'error')
    end

    local name = SanitizeString(data.Name, 50) or data.Id
    local encoded = json.encode(permissions)
    local ok = MySQL.update.await(
        'INSERT INTO admin_ranks (id, name, permissions) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), permissions = VALUES(permissions)',
        { data.Id, name, encoded }
    )
    if not ok then return Notify(source, locale('access.save_failed'), 'error') end

    ranks[data.Id:lower()] = { Id = data.Id, Name = name, Permissions = permissions }
    CreateLog(source, 'Access Control', ('Saved rank %s'):format(data.Id), encoded)
    onAccessChanged()
end)

RegisterNetEvent('butter_admin:server:deleteRank', function(rankId)
    local source = source
    if not IsAuthorized(source, 'page.accesscontrol', 'Deleted a rank without permission') then return end
    if not IsValidSqlIdentifier(rankId) then return end

    local existing = getRankPermissions(rankId)
    if existing and not canGrant(source, existing) then
        return Notify(source, locale('access.rank_outranks'), 'error')
    end

    -- Admins on the deleted rank go with it, so none are left orphaned.
    local ok = MySQL.transaction.await({
        { query = 'DELETE FROM admin_ranks WHERE id = ?', values = { rankId } },
        { query = 'DELETE FROM admin_staff WHERE rank_id = ?', values = { rankId } },
    })
    if not ok then return Notify(source, locale('access.save_failed'), 'error') end

    local lowerId = rankId:lower()
    ranks[lowerId] = nil
    for identifier, admin in pairs(admins) do
        if (admin.RankId or ''):lower() == lowerId then admins[identifier] = nil end
    end

    CreateLog(source, 'Access Control', ('Deleted rank %s'):format(rankId))
    onAccessChanged()
end)

RegisterNetEvent('butter_admin:server:saveAdmin', function(data)
    local source = source
    if not IsAuthorized(source, 'page.accesscontrol', 'Saved an admin without permission') then return end
    if type(data) ~= 'table' then return end

    local identifier = SanitizeString(data.Identifier, 60)
    if not identifier or not IsValidSqlIdentifier(data.RankId) then return end

    local targetRank = getRankPermissions(data.RankId)
    if not targetRank then return Notify(source, locale('access.rank_missing'), 'error') end
    if not canGrant(source, targetRank) then return Notify(source, locale('access.cannot_assign'), 'error') end

    local existing = admins[identifier]
    local existingRank = existing and getRankPermissions(existing.RankId)
    if existingRank and not canGrant(source, existingRank) then
        return Notify(source, locale('access.admin_outranks'), 'error')
    end

    local isTemp = data.IsTemp == true
    local expires = isTemp and parseExpiry(data.Expires) or nil
    if isTemp and not expires then return Notify(source, locale('access.invalid_expiry'), 'error') end

    local webhookEvents = validateWebhookEvents(data.WebhookEvents)
    local name = SanitizeString(data.Name, 64)

    local function save(webhook)
        local ok = MySQL.update.await([[
            INSERT INTO admin_staff (identifier, name, rank_id, is_temp, expires, webhook, webhook_events) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name), rank_id = VALUES(rank_id), is_temp = VALUES(is_temp), expires = VALUES(expires),
                webhook = VALUES(webhook), webhook_events = VALUES(webhook_events)
        ]], { identifier, name, data.RankId, isTemp and 1 or 0, expires, webhook, json.encode(webhookEvents) })
        if not ok then return Notify(source, locale('access.save_failed'), 'error') end

        admins[identifier] = {
            Identifier = identifier,
            Name = name,
            RankId = data.RankId,
            IsTemp = isTemp,
            Expires = expires,
            Webhook = webhook,
            WebhookEvents = webhookEvents,
            DutySeconds = existing?.DutySeconds or 0,
        }
        CreateLog(source, 'Access Control', ('Saved admin %s as %s'):format(identifier, data.RankId))
        onAccessChanged()
    end

    if isDiscordWebhookUrl(data.Webhook) then return save(data.Webhook) end
    if existing?.Webhook then return save(existing.Webhook) end -- editing must not create another channel
    if not Config.AutoCreateAdminWebhooks then return save(nil) end

    CreateAdminWebhookChannel(name or identifier, save)
end)

RegisterNetEvent('butter_admin:server:deleteAdmin', function(identifier)
    local source = source
    if not IsAuthorized(source, 'page.accesscontrol', 'Deleted an admin without permission') then return end
    if type(identifier) ~= 'string' or identifier == '' or #identifier > 60 then return end

    local target = admins[identifier]
    local targetRank = target and getRankPermissions(target.RankId)
    if targetRank and not canGrant(source, targetRank) then
        return Notify(source, locale('access.admin_outranks'), 'error')
    end

    local ok = MySQL.update.await('DELETE FROM admin_staff WHERE identifier = ?', { identifier })
    if not ok then return Notify(source, locale('access.save_failed'), 'error') end

    admins[identifier] = nil
    CreateLog(source, 'Access Control', ('Removed admin %s'):format(identifier))
    onAccessChanged()
end)

exports('isAdmin', function(source)
    return IsAuthorized(source, 'menuopen')
end)

exports('isInDevMode', function(source)
    if not source or source == 0 or not GetPlayerName(source) then return false end
    -- The state bag is written by the client, so it is checked against the permission.
    return Player(source).state.devmode == true and IsAuthorized(source, 'devmode')
end)

exports('getAdminWebhook', function(identifier)
    local admin = admins[identifier]
    if admin?.Webhook and admin.Webhook ~= '' then return admin.Webhook, admin.WebhookEvents end
    return nil, nil
end)

exports('getAdminWebhookBySource', GetAdminWebhookBySource)
