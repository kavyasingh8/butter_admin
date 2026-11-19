if not Config.VersionCheck then return end

local resource = cache.resource
local currentTag = GetResourceMetadata(resource, 'version', 0)
local repository = GetResourceMetadata(resource, 'repository', 0)
local slug = repository and repository:match('github%.com/([^/]+/[^/%s]+)')

---@param version string?
---@return integer[]?
local function parseVersion(version)
    local major, minor, patch = (version or ''):match('(%d+)%.(%d+)%.?(%d*)')
    if not major then return end

    return { tonumber(major), tonumber(minor), tonumber(patch) or 0 }
end

---@param a integer[]
---@param b integer[]
---@return integer -1 when a is older than b, 1 when newer, 0 when equal
local function compareVersions(a, b)
    for i = 1, 3 do
        if a[i] ~= b[i] then return a[i] < b[i] and -1 or 1 end
    end
    return 0
end

local current = parseVersion(currentTag)
if not current or not slug then
    lib.print.warn('Update check skipped: set a "version" and a GitHub "repository" in fxmanifest.lua.')
    return
end

slug = slug:gsub('%.git$', '')

-- Reads the published fxmanifest from raw.githubusercontent.com, which is not
-- subject to the 60 requests/hour limit of api.github.com.
PerformHttpRequest(('https://raw.githubusercontent.com/%s/HEAD/fxmanifest.lua'):format(slug), function(status, body)
    if status ~= 200 then
        lib.print.warn(('Update check failed (HTTP %s). Is %s public?'):format(status, slug))
        return
    end

    local latestTag = body and body:match('\nversion%s*[%(]?%s*[\'"]([^\'"]+)[\'"]')
    local latest = parseVersion(latestTag)
    if not latest then
        lib.print.warn('Update check failed: the remote fxmanifest.lua has no readable version.')
        return
    end

    local result = compareVersions(current, latest)
    if result < 0 then
        lib.print.warn(('Update available: %s -> %s\nhttps://github.com/%s/releases/latest'):format(currentTag, latestTag, slug))
    elseif result == 0 then
        lib.print.info(('Running the latest version (%s).'):format(currentTag))
    else
        lib.print.info(('Running %s, newer than the published version (%s).'):format(currentTag, latestTag))
    end
end, 'GET', '', { ['User-Agent'] = resource })
