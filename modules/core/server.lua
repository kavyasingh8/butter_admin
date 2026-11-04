---@param source number
---@param message string
---@param notifyType? 'inform'|'success'|'error'|'warning'
function Notify(source, message, notifyType)
    TriggerClientEvent('ox_lib:notify', source, { description = message, type = notifyType or 'inform' })
end

---@param target number -1 for everyone
---@param title string
---@param message string
---@param color? number[]
function SendChatMessage(target, title, message, color)
    TriggerClientEvent('chat:addMessage', target, {
        color = color,
        multiline = true,
        args = { title, message },
    })
end

---@param source number
---@param identifierType string 'license', 'steam', 'discord', 'ip', ...
---@return string?
function GetIdentifier(source, identifierType)
    return GetPlayerIdentifierByType(source, identifierType)
end

--- json.decode that returns `fallback` instead of erroring on bad input.
---@param raw any
---@param fallback? any
---@return any
function DecodeJson(raw, fallback)
    if type(raw) == 'table' then return raw end
    if type(raw) ~= 'string' or raw == '' then return fallback end
    local ok, decoded = pcall(json.decode, raw)
    if ok and decoded ~= nil then return decoded end
    return fallback
end

---@param value any
---@param maxLength? number
---@return string?
function SanitizeString(value, maxLength)
    if type(value) ~= 'string' then return nil end
    local cleaned = value:gsub('[\0-\31\127]', ''):gsub('^%s+', ''):gsub('%s+$', '')
    if cleaned == '' then return nil end
    if maxLength and #cleaned > maxLength then cleaned = cleaned:sub(1, maxLength) end
    return cleaned
end

--- A whole, non-negative amount clamped to `max`, or nil when it isn't a finite number.
---@param value any
---@param max? number
---@return integer?
function SanitizeAmount(value, max)
    local number = tonumber(value)
    if not number or number ~= number or number == math.huge or number == -math.huge then return nil end
    return math.floor(math.max(0, math.min(number, max or 999999999)))
end

---@param value any
---@param min number
---@param max number
---@param default number
---@return number
function ClampNumber(value, min, max, default)
    local number = tonumber(value)
    if not number or number ~= number then return default end
    return math.max(min, math.min(max, number))
end

---@param name any
---@return boolean
function IsValidSqlIdentifier(name)
    return type(name) == 'string' and name:match('^[%w_]+$') ~= nil
end

---@param plate any
---@return boolean
function IsValidPlate(plate)
    return type(plate) == 'string' and #plate > 0 and #plate <= 8 and plate:match('^[%w%s%-]+$') ~= nil
end

--- Reads page/limit/search from a paging payload with bounds, so a client can
--- never request an unbounded result set.
---@param data any
---@param defaultLimit integer
---@param maxLimit? integer
---@return integer page, integer limit, string search
function ReadPaging(data, defaultLimit, maxLimit)
    if type(data) ~= 'table' then return 1, defaultLimit, '' end
    local page = math.floor(ClampNumber(data.page, 1, 100000, 1))
    local limit = math.floor(ClampNumber(data.limit, 1, maxLimit or 100, defaultLimit))
    local search = type(data.search) == 'string' and data.search:sub(1, 64) or ''
    return page, limit, search
end

--- Server ID of a connected player, or nil. Rejects 0 and negatives (-1 would
--- broadcast a client event to everyone).
---@param value any
---@param fallback? number used when `value` is not a number (self-targeting commands)
---@return integer?
function ResolveTarget(value, fallback)
    local id = tonumber(value) or fallback
    if not id or id ~= id or id <= 0 or id == math.huge then return nil end
    id = math.floor(id)
    if not GetPlayerName(id) then return nil end
    return id
end

--- Menu commands send either a raw target or a `{ player = id }` payload.
---@param payload any
---@param fallback? number
---@return integer?
function ResolvePayloadTarget(payload, fallback)
    if type(payload) == 'table' then payload = payload.player end
    return ResolveTarget(payload, fallback)
end

---@param payload any
---@param key string
---@return any
function ReadField(payload, key)
    return type(payload) == 'table' and payload[key] or nil
end

---@param value any
---@return vector3?
function ReadVector3(value)
    if type(value) ~= 'table' and type(value) ~= 'vector3' then return nil end
    local x, y, z = tonumber(value.x), tonumber(value.y), tonumber(value.z)
    if not x or not y or not z then return nil end
    return vector3(x, y, z)
end

--- "Character(PlayerName)" when a character is loaded, otherwise the player
--- name. The UI compares message senders against this to spot its own lines,
--- so it has to match GetDisplayName on the client.
---@param source number
---@return string
function GetDisplayName(source)
    local playerName = GetPlayerName(source) or 'Unknown'
    local playerData = GetPlayerData(source)
    local characterName = playerData and playerData.name and playerData.name:match('^%s*(.-)%s*$')

    if characterName and characterName ~= '' and characterName ~= playerName then
        return ('%s(%s)'):format(characterName, playerName)
    end
    return playerName
end

--- "Firstname Lastname" from normalized player data, or 'N/A'.
---@param playerData table|false|nil
---@return string
function GetCharacterName(playerData)
    if not playerData then return 'N/A' end
    local name = playerData.name and playerData.name:match('^%s*(.-)%s*$')
    return (name and name ~= '') and name or 'N/A'
end

-- QB/Qbox layout; the framework bridge loaded after this file overrides it.
DatabaseTables = {
    players = 'players',
    playerId = 'citizenid',
    playerLicense = 'license',
    vehicles = 'player_vehicles',
}

local tableColumns = {} ---@type table<string, table<string, boolean>>

--- Columns of a framework table, cached. Schemas differ per framework, so
--- queries only select the columns that exist.
---@param tableName string trusted table name (from DatabaseTables)
---@return table<string, boolean>
function GetTableColumns(tableName)
    if tableColumns[tableName] then return tableColumns[tableName] end

    local columns = {}
    for _, column in ipairs(MySQL.query.await(('SHOW COLUMNS FROM `%s`'):format(tableName)) or {}) do
        columns[column.Field] = true
    end
    tableColumns[tableName] = columns
    return columns
end

---@param tableName string
---@param wanted string[]
---@return string[]
function FilterColumns(tableName, wanted)
    local columns = GetTableColumns(tableName)
    local existing = {}
    for _, column in ipairs(wanted) do
        if columns[column] then existing[#existing + 1] = column end
    end
    return existing
end

--- "`a`, `b`" for the wanted columns that exist on the table.
---@param tableName string
---@param wanted string[]
---@return string
function BuildSelectList(tableName, wanted)
    local existing = FilterColumns(tableName, wanted)
    if #existing == 0 then return '*' end
    return '`' .. table.concat(existing, '`, `') .. '`'
end

-- Columns FormatDbPlayer reads, across every framework bridge.
PLAYER_COLUMNS = {
    'citizenid', 'identifier', 'license', 'name', 'charinfo', 'money', 'accounts', 'job', 'job_grade',
    'gang', 'firstname', 'lastname', 'steam', 'discord', 'dateofbirth', 'phone_number',
}

-- Defaults for servers without a garage or housing script. The garage and
-- property bridges load after this file and replace them.

---@return table<string, { Name: string, Label: string?, Vehicles: table[] }>
function GetDefinedGarages() return {} end

---@return table[]
function GetPlayerProperties() return {} end

---@return table[]
function GetAllProperties() return {} end

local schemaReady = promise.new()

--- Blocks until the admin tables exist. On a fresh install the CREATE TABLEs
--- have not run yet when other modules start reading.
function AwaitSchema()
    Citizen.Await(schemaReady)
end

local SCHEMA = {
    [[CREATE TABLE IF NOT EXISTS `admin_ranks` (
        `id` VARCHAR(50) PRIMARY KEY,
        `name` VARCHAR(50) NOT NULL,
        `permissions` LONGTEXT DEFAULT '[]'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;]],

    [[CREATE TABLE IF NOT EXISTS `admin_staff` (
        `identifier` VARCHAR(60) PRIMARY KEY,
        `name` VARCHAR(64) DEFAULT NULL,
        `rank_id` VARCHAR(50) NOT NULL,
        `is_temp` TINYINT(1) DEFAULT 0,
        `expires` BIGINT DEFAULT NULL,
        `webhook` TEXT DEFAULT NULL,
        `webhook_events` TEXT DEFAULT NULL,
        `duty_seconds` BIGINT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;]],

    -- Every connecting player is checked against the indexed columns.
    [[CREATE TABLE IF NOT EXISTS `admin_bans` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `banid` VARCHAR(50),
        `name` VARCHAR(50),
        `steam` VARCHAR(50),
        `license` VARCHAR(50),
        `discord` VARCHAR(50),
        `ip` VARCHAR(50),
        `hwid` LONGTEXT,
        `guid` VARCHAR(100),
        `reason` TEXT,
        `bannedby` VARCHAR(255),
        `expire` BIGINT,
        `bannedon` BIGINT,
        INDEX `idx_admin_bans_banid` (`banid`),
        INDEX `idx_admin_bans_license` (`license`),
        INDEX `idx_admin_bans_steam` (`steam`),
        INDEX `idx_admin_bans_discord` (`discord`),
        INDEX `idx_admin_bans_ip` (`ip`),
        INDEX `idx_admin_bans_guid` (`guid`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;]],

    [[CREATE TABLE IF NOT EXISTS `admin_logs` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `Type` TEXT,
        `Steam` VARCHAR(255),
        `AdminName` VARCHAR(255),
        `Date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `Log` TEXT,
        `Cid` VARCHAR(50),
        `Data` TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;]],

    [[CREATE TABLE IF NOT EXISTS `admin_objects` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `model` VARCHAR(100) NOT NULL,
        `coords` LONGTEXT NOT NULL,
        `heading` FLOAT NOT NULL,
        `rotation` LONGTEXT NOT NULL,
        `freeze` TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;]],

    [[CREATE TABLE IF NOT EXISTS `admin_notes` (
        `identifier` VARCHAR(60) PRIMARY KEY,
        `note` TEXT NOT NULL,
        `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;]],

    [[INSERT IGNORE INTO `admin_ranks` (`id`, `name`, `permissions`) VALUES
        ('superadmin', 'Super Admin', '["all"]'),
        ('admin', 'Admin', '["menuopen","revive","page.playerlist","page.reports"]');]],
}

MySQL.ready(function()
    -- Run in order: the ALTERs and indexes depend on the CREATEs before them.
    for i = 1, #SCHEMA do
        local ok, err = pcall(MySQL.query.await, SCHEMA[i])
        if not ok then LogError('Schema statement failed:', err) end
    end

    -- Installs created before admin names existed are missing the column.
    local ok, err = pcall(function()
        if MySQL.scalar.await("SHOW COLUMNS FROM `admin_staff` LIKE 'name'") then return end
        MySQL.query.await('ALTER TABLE `admin_staff` ADD COLUMN `name` VARCHAR(64) DEFAULT NULL AFTER `identifier`')
    end)
    if not ok then LogError('Failed to add admin_staff.name:', err) end
    LogDebug('Database schema is ready')
    schemaReady:resolve(true)
end)
