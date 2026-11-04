local MAX_DISCONNECTED = 50
local CHARACTER_CACHE_TTL = 300 -- seconds

local recentlyDisconnected = {} ---@type table[]
local sessionIdentifiers = {} ---@type table<number, table>
local trackedRadio = {} ---@type table<number, number>
local characterCache = { list = nil, time = 0 }

-- pma-voice keeps the channel in a state bag, which is not always readable
-- from here, but every radio script goes through this event as well.
RegisterNetEvent('pma-voice:setPlayerRadio', function(channel)
    trackedRadio[source] = tonumber(channel) or 0
end)

---@param source number
---@return number channel, 0 when not on a radio
local function getRadioChannel(source)
    local fromState = tonumber(Player(source).state.radioChannel) or 0
    if fromState > 0 then return fromState end
    return trackedRadio[source] or 0
end

--- Identifiers never change during a session, so they are read once.
---@param source number
---@return table
local function getSessionIdentifiers(source)
    local cached = sessionIdentifiers[source]
    if cached then return cached end

    cached = {
        Steam = GetIdentifier(source, 'steam') or 'N/A',
        License = GetIdentifier(source, 'license') or 'N/A',
        Discord = GetIdentifier(source, 'discord') or 'N/A',
        Fivem = GetIdentifier(source, 'fivem') or 'N/A',
        PrimaryId = GetIdentifier(source, Config.Identifier) or 'N/A',
    }
    sessionIdentifiers[source] = cached
    return cached
end

---@param source number
---@return table
local function buildOnlineEntry(source)
    local playerData = GetPlayerData(source)
    local identifiers = getSessionIdentifiers(source)
    return {
        ServerId = source,
        Name = GetPlayerName(source),
        CharName = GetCharacterName(playerData),
        Steam = identifiers.Steam,
        License = identifiers.License,
        Discord = identifiers.Discord,
        Fivem = identifiers.Fivem,
        PrimaryId = identifiers.PrimaryId,
        CitizenId = playerData and playerData.citizenId or 'N/A',
        isOnline = true,
    }
end

--- Every character in the players table, cached because it is a full scan.
---@return table[]
function GetAllCharacters()
    if characterCache.list and os.time() - characterCache.time < CHARACTER_CACHE_TTL then
        return characterCache.list
    end

    local columns = BuildSelectList(DatabaseTables.players, PLAYER_COLUMNS)
    local rows = MySQL.query.await(('SELECT %s FROM `%s`'):format(columns, DatabaseTables.players))
    if not rows then
        LogError('Could not read the character list')
        return characterCache.list or {}
    end

    local characters = {}
    for _, row in ipairs(rows) do
        local player = FormatDbPlayer(row)
        if player then
            characters[#characters + 1] = {
                CitizenId = player.citizenId,
                Name = player.name,
                License = player.license,
                Steam = player.steam,
                isOnline = false,
                ServerId = 0,
            }
        end
    end

    characterCache.list, characterCache.time = characters, os.time()
    return characters
end

---@param items table?
---@return table[]
local function formatStoredItems(items)
    local list = {}
    for slot, item in pairs(items or {}) do
        if type(item) == 'table' and item.name then
            list[#list + 1] = {
                name = item.name,
                label = item.label or item.name,
                count = item.amount or item.count or 1,
                slot = item.slot or slot,
                metadata = item.info or item.metadata,
                image = item.name .. '.png',
            }
        end
    end
    return list
end

--- Items stored in an offline player's `inventory` column.
---@param citizenId string
---@return table[]
function GetOfflinePlayerInventory(citizenId)
    if not GetTableColumns(DatabaseTables.players).inventory then return {} end
    local query = ('SELECT inventory FROM `%s` WHERE `%s` = ?'):format(DatabaseTables.players, DatabaseTables.playerId)
    return formatStoredItems(DecodeJson(MySQL.scalar.await(query, { citizenId }), {}))
end

---@param faction any
---@param fallback string
---@return string
local function formatFactionLabel(faction, fallback)
    if type(faction) ~= 'table' then return type(faction) == 'string' and faction or fallback end
    local label = faction.label or faction.name
    if not label then return fallback end

    local grade = faction.grade
    if type(grade) == 'table' then grade = grade.name or grade.level end
    return ('%s (%s)'):format(label, grade or '0')
end

---@param citizenId string
---@param license string?
---@return table[]
local function getPlayerVehicles(citizenId, license)
    local vehicles = FetchPlayerVehicles(citizenId, license)
    for _, vehicle in ipairs(vehicles) do
        vehicle.image = ('https://docs.fivem.net/vehicles/%s.webp'):format(vehicle.model)
    end
    return vehicles
end

---@param citizenId string
---@return table[]
local function getOwnedProperties(citizenId)
    local properties = GetPlayerProperties(citizenId)
    for _, property in ipairs(properties) do
        property.label = property.label or property.name or 'Property'
        property.address = property.address or property.label
        property.type = property.type or 'Residential'
    end
    return properties
end

---@param id string|number server ID, citizen ID or license
---@return number? source, string citizenId
local function findOnlinePlayer(id)
    local numericId = tonumber(id)
    if numericId and GetPlayerName(numericId) then
        local playerData = GetPlayerData(numericId)
        return numericId, playerData and playerData.citizenId or tostring(id)
    end

    for _, playerId in ipairs(GetPlayers()) do
        local source = tonumber(playerId)
        local playerData = GetPlayerData(source)
        if playerData and (playerData.citizenId == id or playerData.license == id) then
            return source, playerData.citizenId
        end
    end
    return nil, tostring(id)
end

---@param citizenId string
---@param license string?
---@return string
local function getPlayerNote(citizenId, license)
    -- Notes are keyed by citizen ID, with the license as a legacy fallback.
    local row = MySQL.single.await('SELECT note FROM admin_notes WHERE identifier IN (?, ?) ORDER BY identifier = ? DESC LIMIT 1', {
        citizenId, license or '', citizenId,
    })
    return row?.note or ''
end

local function noop() end

--- Avatars are fetched in the background, so a profile's first open may not have one yet.
---@param discord string?
---@param steam string?
---@return string?
local function getProfileAvatar(discord, steam)
    local profile = discord and discord ~= '' and discord ~= 'Not Linked' and GetDiscordProfile(discord, noop)
    if not profile and steam and steam ~= '' and steam ~= 'Not Linked' then
        profile = GetSteamProfile(steam, noop)
    end
    return profile and profile.avatar
end

lib.callback.register('butter_admin:server:getPlayerProfile', function(source, data)
    -- Both the player list and the database browser open player profiles.
    if not IsAuthorizedAny(source, { 'page.playerlist', 'page.database' }) then return nil end
    local id = ReadField(data, 'id')
    if type(id) ~= 'string' and type(id) ~= 'number' then return nil end

    local onlineSource, lookupId = findOnlinePlayer(id)
    local columns = BuildSelectList(DatabaseTables.players, { 'inventory', 'license2', table.unpack(PLAYER_COLUMNS) })
    local query = ('SELECT %s FROM `%s` WHERE `%s` = ? OR `%s` = ? LIMIT 1'):format(columns, DatabaseTables.players, DatabaseTables.playerId, DatabaseTables.playerLicense)
    local row = MySQL.single.await(query, { lookupId, lookupId })
    if not row then return nil end

    local player = FormatDbPlayer(row)
    if not player then return nil end

    local citizenId, license = player.citizenId, player.license
    local phone = GetPhoneNumber and GetPhoneNumber(citizenId, onlineSource)
    if type(phone) ~= 'string' or phone == '' or phone:lower() == 'unknown' then phone = nil end

    local details = {
        dob = player.dob,
        bloodgroup = player.bloodgroup,
        job = formatFactionLabel(player.job, 'Unemployed'),
        gang = formatFactionLabel(player.gang, 'None'),
        money = { cash = player.cash, bank = player.bank, crypto = player.crypto },
        phone = phone or (player.phone ~= 'N/A' and player.phone) or 'N/A',
    }

    local livePlayer = onlineSource and GetPlayerData(onlineSource)
    if livePlayer then
        details.job = formatFactionLabel(livePlayer.job, 'Unemployed (0)')
        details.gang = formatFactionLabel(livePlayer.gang, 'None (0)')
        details.money = livePlayer.money
        if livePlayer.charinfo then
            details.dob = livePlayer.charinfo.birthdate or details.dob
            details.bloodgroup = livePlayer.charinfo.bloodtype or details.bloodgroup
            details.phone = phone or livePlayer.charinfo.phone or details.phone
        end
    end

    details.inventory = onlineSource and GetInventoryItems and GetInventoryItems(onlineSource) or formatStoredItems(DecodeJson(row.inventory, {}))
    details.vehicles = getPlayerVehicles(citizenId, license)
    details.properties = getOwnedProperties(citizenId)

    local health, armor, ping, radio, coords
    if onlineSource then
        local ped = GetPlayerPed(onlineSource)
        if ped ~= 0 then
            health = GetEntityHealth(ped)
            armor = GetPedArmour(ped)
            local position = GetEntityCoords(ped)
            coords = { x = position.x, y = position.y, z = position.z }
        end
        ping = GetPlayerPing(onlineSource)
        radio = getRadioChannel(onlineSource)
    end

    local steam = onlineSource and GetIdentifier(onlineSource, 'steam') or row.steam or 'Not Linked'
    local discord = onlineSource and GetIdentifier(onlineSource, 'discord') or row.discord or 'Not Linked'

    return {
        Name = player.name,
        CharName = player.name,
        ServerId = onlineSource or 0,
        CitizenId = citizenId,
        Steam = steam,
        License = license,
        Discord = discord,
        AvatarUrl = getProfileAvatar(discord, steam),
        HardwareId = onlineSource and GetIdentifier(onlineSource, 'license2') or row.license2 or 'N/A',
        IP = onlineSource and GetPlayerEndpoint(onlineSource) or 'N/A',
        Details = details,
        isOnline = onlineSource ~= nil,
        Note = getPlayerNote(citizenId, license),
        Health = health,
        Armor = armor,
        Ping = ping,
        Radio = radio,
        Coords = coords,
    }
end)

---@param data table
---@param onlineByCitizen table<string, number>
---@return table[] rows, integer total
local function queryDatabasePlayers(data, onlineByCitizen)
    local page, limit, search = ReadPaging(data, 24, 100)
    local tableName, keyColumn = DatabaseTables.players, DatabaseTables.playerId
    local params = {}

    local conditions = {}
    if search ~= '' then
        local parts = {}
        for _, column in ipairs(FilterColumns(tableName, { 'citizenid', 'identifier', 'license', 'name', 'charinfo', 'firstname', 'lastname' })) do
            parts[#parts + 1] = ('`%s` LIKE ?'):format(column)
            params[#params + 1] = '%' .. search .. '%'
        end
        if #parts > 0 then conditions[#conditions + 1] = '(' .. table.concat(parts, ' OR ') .. ')' end
    end

    -- Online status is not stored in the database, so it is matched and
    -- ranked with the connected players' citizen IDs.
    local onlineIds = {}
    for citizenId in pairs(onlineByCitizen) do onlineIds[#onlineIds + 1] = citizenId end

    local status = ReadField(data, 'status')
    if status == 'online' or status == 'offline' then
        if #onlineIds == 0 then
            if status == 'online' then conditions[#conditions + 1] = '0 = 1' end
        else
            conditions[#conditions + 1] = ('`%s` %s (%s)'):format(keyColumn, status == 'online' and 'IN' or 'NOT IN', ('?,'):rep(#onlineIds):sub(1, -2))
            for _, citizenId in ipairs(onlineIds) do params[#params + 1] = citizenId end
        end
    end

    local where = #conditions > 0 and ' WHERE ' .. table.concat(conditions, ' AND ') or ''
    local total = MySQL.scalar.await(('SELECT COUNT(*) FROM `%s`%s'):format(tableName, where), params) or 0

    local order = (' ORDER BY `%s`'):format(keyColumn)
    if #onlineIds > 0 then
        order = (' ORDER BY CASE WHEN `%s` IN (%s) THEN 0 ELSE 1 END, `%s`'):format(keyColumn, ('?,'):rep(#onlineIds):sub(1, -2), keyColumn)
        for _, citizenId in ipairs(onlineIds) do params[#params + 1] = citizenId end
    end

    params[#params + 1] = limit
    params[#params + 1] = (page - 1) * limit
    local columns = BuildSelectList(tableName, PLAYER_COLUMNS)
    local rows = MySQL.query.await(('SELECT %s FROM `%s`%s%s LIMIT ? OFFSET ?'):format(columns, tableName, where, order), params) or {}
    return rows, total
end

lib.callback.register('butter_admin:server:getPlayers', function(source, data)
    -- Command player pickers need the online list, so 'menuopen' is enough for
    -- it. The database list and disconnected players need the player list page.
    if not IsAuthorized(source, 'menuopen') then return { Online = {}, All = {}, TotalCount = 0, Disconnected = {} } end
    local canViewList = IsAuthorized(source, 'page.playerlist')

    local online, onlineByCitizen = {}, {}
    for _, playerId in ipairs(GetPlayers()) do
        local entry = buildOnlineEntry(tonumber(playerId))
        online[#online + 1] = entry
        if entry.CitizenId ~= 'N/A' then onlineByCitizen[entry.CitizenId] = entry.ServerId end
    end

    local databasePlayers, total = {}, 0
    if canViewList and ReadField(data, 'includeDb') then
        local rows
        rows, total = queryDatabasePlayers(data, onlineByCitizen)
        for _, row in ipairs(rows) do
            local player = FormatDbPlayer(row)
            if player and player.citizenId then
                local serverId = onlineByCitizen[player.citizenId]
                databasePlayers[#databasePlayers + 1] = {
                    ServerId = serverId or 0,
                    Name = player.name,
                    CharName = player.name,
                    Steam = player.steam,
                    License = player.license,
                    Discord = 'N/A',
                    CitizenId = player.citizenId,
                    isOnline = serverId ~= nil,
                    job = player.job,
                    gang = player.gang,
                }
            end
        end
    end

    return {
        Online = online,
        All = databasePlayers,
        TotalCount = total,
        Disconnected = canViewList and recentlyDisconnected or {},
    }
end)

lib.callback.register('butter_admin:server:getPlayerNotes', function(source)
    if not IsAuthorized(source, 'page.playerlist') then return {} end

    local notes = {}
    for _, row in ipairs(MySQL.query.await('SELECT identifier, note FROM admin_notes') or {}) do
        notes[row.identifier] = row.note
    end
    return notes
end)

RegisterNetEvent('butter_admin:server:savePlayerNote', function(identifier, note)
    local source = source
    if not IsAuthorized(source, 'page.playerlist', 'Saved a player note without permission') then return end

    identifier = SanitizeString(identifier, 60)
    if not identifier then return end
    note = type(note) == 'string' and note:sub(1, 5000) or ''

    MySQL.insert('INSERT INTO admin_notes (identifier, note) VALUES (?, ?) ON DUPLICATE KEY UPDATE note = VALUES(note)', { identifier, note }, function(result)
        if result == nil then return LogError(('Failed to save note for %s'):format(identifier)) end
        CreateLog(source, 'Notes', ('Updated notes for player (%s)'):format(identifier), note)
    end)
end)

AddEventHandler('playerJoining', function()
    sessionIdentifiers[source] = nil
end)

AddEventHandler('playerDropped', function(reason)
    local source = source
    local license = GetIdentifier(source, 'license')
    trackedRadio[source] = nil

    if license then
        for i = #recentlyDisconnected, 1, -1 do
            if recentlyDisconnected[i].License == license then table.remove(recentlyDisconnected, i) end
        end

        local identifiers = getSessionIdentifiers(source)
        table.insert(recentlyDisconnected, 1, {
            ServerId = source,
            Name = GetPlayerName(source),
            Reason = reason,
            CharName = GetCharacterName(GetPlayerData(source)),
            Steam = identifiers.Steam,
            License = license,
            Discord = identifiers.Discord,
            PrimaryId = identifiers.PrimaryId,
            Time = os.time(),
            isOnline = false,
        })
        if #recentlyDisconnected > MAX_DISCONNECTED then table.remove(recentlyDisconnected) end
    end

    sessionIdentifiers[source] = nil
end)
