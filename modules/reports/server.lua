local MESSAGE_COOLDOWN_MS = 750 -- every message reaches all staff, so senders are throttled

local reports = {} ---@type table[]
local mutedStaff = {} ---@type table<number, true>
local lastReportAt = {} ---@type table<string, number> license -> os.time()
local lastMessageAt = {} ---@type table<number, number> source -> GetGameTimer()

local HTML_ESCAPES = { ['&'] = '&amp;', ['<'] = '&lt;', ['>'] = '&gt;', ['"'] = '&quot;', ["'"] = '&#39;' }

local TRANSCRIPT_CSS = [[
:root { --bg: #1e1f22; --panel: #313338; --hover: #2b2d31; --text: #dbdee1; --muted: #949ba4; --heading: #f2f3f5;
    --brand: #5865F2; --admin: #ed4245; --divider: rgba(255,255,255,0.06); }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; padding: 40px 20px; display: flex; justify-content: center; min-height: 100vh; }
.container { width: 100%; max-width: 850px; background: var(--panel); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.header { padding: 24px; border-bottom: 1px solid var(--divider); display: flex; align-items: center; gap: 16px; }
.header-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--brand); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px; color: white; }
.header-info { flex-grow: 1; }
.header-info h1 { font-weight: 700; font-size: 20px; margin: 0 0 4px 0; color: var(--heading); }
.header-meta { display: flex; gap: 16px; font-size: 13px; color: var(--muted); }
.header-meta strong { color: var(--text); }
.chat { padding: 16px 0; display: flex; flex-direction: column; }
.row { padding: 8px 24px; display: flex; gap: 16px; }
.row:hover { background: var(--hover); }
.avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; margin-top: 2px; }
.avatar.admin { background: linear-gradient(135deg, #f43f5e, #e11d48); }
.avatar.player { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.message-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.sender { font-weight: 600; font-size: 15px; }
.sender.admin { color: var(--admin); }
.sender.player { color: var(--brand); }
.time { font-size: 12px; color: var(--muted); }
.body { font-size: 15px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
a { color: #00a8fc; text-decoration: none; }
a:hover { text-decoration: underline; }
.footer { padding: 16px 24px; font-size: 12px; color: var(--muted); background: var(--hover); border-top: 1px solid var(--divider); display: flex; justify-content: space-between; }
.badge { background: rgba(237, 66, 69, 0.15); color: #ed4245; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-left: 4px; }
]]

---@param value any
---@return string
local function escapeHtml(value)
    return (tostring(value or ''):gsub('[&<>"\']', HTML_ESCAPES))
end

---@return string
local function currentTime()
    return os.date('%H:%M')
end

---@param source number
---@return boolean
local function isThrottled(source)
    local now = GetGameTimer()
    if lastMessageAt[source] and now - lastMessageAt[source] < MESSAGE_COOLDOWN_MS then return true end
    lastMessageAt[source] = now
    return false
end

---@param reportId any
---@return table?, integer?
local function findReport(reportId)
    reportId = tonumber(reportId)
    for index, report in ipairs(reports) do
        if report.Id == reportId then return report, index end
    end
end

---@param report table
---@param source number
---@param license string?
---@return boolean
local function isReportOwner(report, source, license)
    return report.ServerId == source or (license ~= nil and report.Identifier == license)
end

---@param report table
---@return boolean
local function isActive(report)
    return report.Status ~= 'Closed'
end

--- Closed reports stay in memory for staff to review or reopen; only the
--- newest ones are kept so they can't pile up forever.
local function pruneClosedReports()
    local limit = Config.Reports.MaxClosedReports or 50
    local closed = 0
    for i = #reports, 1, -1 do
        if not isActive(reports[i]) then
            closed = closed + 1
            if closed > limit then table.remove(reports, i) end
        end
    end
end

---@return number
local function generateReportId()
    while true do
        local candidate = math.random(111111, 999999)
        if not findReport(candidate) then return candidate end
    end
end

---@param source number
---@return boolean
local function canManageReports(source)
    return IsAuthorized(source, 'page.reports')
end

--- Sends a full snapshot: every report to staff, their own report to players.
---@param source number
function SyncReportsForPlayer(source)
    if canManageReports(source) then
        return TriggerClientEvent('butter_admin:client:syncReports', source, reports)
    end

    local license = GetIdentifier(source, 'license')
    for _, report in ipairs(reports) do
        if isActive(report) and isReportOwner(report, source, license) then
            -- Re-attach a report that survived the owner's reconnect.
            report.ServerId, report.OpenById = source, source
            return TriggerClientEvent('butter_admin:client:syncReports', source, { report })
        end
    end
    TriggerClientEvent('butter_admin:client:syncReports', source, {})
end

--- Sends one change to staff and the report's owner instead of re-sending
--- every report on each message.
---@param report table
---@param operation 'upsert'|'message'|'remove'
---@param message? table
local function pushReportChange(report, operation, message)
    for _, playerId in ipairs(GetPlayers()) do
        local target = tonumber(playerId)
        local op = operation
        if not canManageReports(target) then
            -- Players only ever see their own report, and only while it is open.
            if target ~= report.ServerId then op = nil
            elseif not isActive(report) then op = 'remove' end
        end
        if op then
            TriggerClientEvent('butter_admin:client:reportChanged', target, op, op == 'upsert' and report or report.Id, message)
        end
    end
end

---@param target number
---@param message string
local function sendChatLine(target, message)
    TriggerClientEvent('chat:addMessage', target, { color = { 255, 255, 255 }, args = { '', message } })
end

---@param raw string
---@return string
local function renderMessageBody(raw)
    -- Escape first, then link: user input can never break out of the markup.
    -- Images stay links, since an eager <img> would leak the viewer's IP.
    local safe = escapeHtml(raw)
    if raw:match('^https?://%S+$') then
        return ('<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>'):format(safe, safe)
    end
    return safe
end

---@param report table
---@param closerName string
---@return string
local function buildTranscriptHtml(report, closerName)
    local id = tostring(report.Id)
    local parts = {
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Report Transcript #', id, '</title>',
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">',
        '<style>', TRANSCRIPT_CSS, '</style></head><body><div class="container">',
        '<div class="header"><div class="header-icon">#</div><div class="header-info">',
        '<h1>Report Transcript #', id, '</h1><div class="header-meta">',
        '<div>Opened by: <strong>', escapeHtml(report.OpenBy), '</strong></div>',
        '<div>Closed by: <strong>', escapeHtml(closerName), '</strong></div>',
        '<div>Date: <strong>', os.date('%b %d, %Y'), '</strong></div>',
        '</div></div></div><div class="chat">',
    }

    for _, chat in ipairs(report.Chats) do
        local sender = tostring(chat.Sender or 'Unknown')
        local role = sender == report.OpenBy and 'player' or 'admin'
        parts[#parts + 1] = table.concat({
            '<div class="row"><div class="avatar ', role, '">', escapeHtml(sender:sub(1, 1):upper()), '</div><div>',
            '<div class="message-header"><span class="sender ', role, '">', escapeHtml(sender),
            role == 'admin' and '<span class="badge">Admin</span>' or '', '</span>',
            '<span class="time">Today at ', escapeHtml(chat.Time), '</span></div>',
            '<div class="body">', renderMessageBody(tostring(chat.Message or '')), '</div></div></div>',
        })
    end

    parts[#parts + 1] = '</div><div class="footer"><span>Generated by ' .. escapeHtml(Config.ServerName) .. '</span>'
    parts[#parts + 1] = '<span>ID: ' .. id .. '</span></div></div></body></html>'
    return table.concat(parts)
end

---@param report table
---@return string
local function buildPlainTranscript(report)
    local lines = {}
    for i, chat in ipairs(report.Chats) do
        lines[i] = ('[%s] **%s**: %s'):format(chat.Time, chat.Sender or 'Unknown', chat.Message)
    end
    local transcript = table.concat(lines, '\n')
    if #transcript > 1024 then transcript = transcript:sub(1, 1021) .. '...' end
    return transcript ~= '' and transcript or 'No messages'
end

---@param report table
---@param source number
---@param closerName string
local function sendTranscripts(report, source, closerName)
    SendWebhook('report', 'Report Closed', 'A report has been closed.', 15158332, {
        { name = 'Report ID', value = tostring(report.Id), inline = true },
        { name = 'Opened By', value = ('%s (%s)'):format(report.OpenBy, report.OpenById), inline = true },
        { name = 'Closed By', value = ('%s (%s)'):format(closerName, source), inline = true },
        { name = 'Transcript', value = buildPlainTranscript(report), inline = false },
    }, source)

    if not Config.Reports.SendDMTranscript or #report.Chats == 0 then return end

    local html = buildTranscriptHtml(report, closerName)
    local filename = ('transcript_%s.html'):format(report.Id)
    local title = 'Report Transcript - ID: ' .. report.Id

    -- Backup copy for the staff Discord server.
    SendWebhookFile('report', title,
        ('Report **#%s** was closed by **%s**. The full conversation is attached as an HTML file.'):format(report.Id, closerName),
        filename, html, 15158332, {
            { name = 'Opened By', value = ('%s (%s)'):format(report.OpenBy, report.OpenById), inline = true },
            { name = 'Closed By', value = ('%s (%s)'):format(closerName, source), inline = true },
            { name = 'Closed At', value = os.date('%Y-%m-%d %H:%M:%S'), inline = true },
        }, source)

    -- Personal copy for the player who opened it.
    local discordId = report.Discord or (report.ServerId and GetIdentifier(report.ServerId, 'discord'))
    if discordId and discordId ~= '' then
        SendDiscordDirectFile(discordId, title,
            ('Your report has been closed by **%s**. The transcript is attached as an HTML file you can open in any browser.'):format(closerName),
            filename, html)
    end
end

---@param data any
---@return table fields
local function readReportForm(data)
    if type(data) ~= 'table' then data = { description = data } end

    local description = SanitizeString(data.description or data.message, 512)
    return {
        description = description or '',
        message = description or 'No description provided',
        category = SanitizeString(data.category, 48) or 'General',
        clips = SanitizeString(data.clips, 512) or 'None',
        title = SanitizeString(data.title, 64) or (description and description:sub(1, 40)) or 'No Title',
    }
end

RegisterNetEvent('butter_admin:server:createReport', function(data)
    local source = source
    local license = GetIdentifier(source, 'license')

    for _, report in ipairs(reports) do
        if isActive(report) and isReportOwner(report, source, license) then
            return Notify(source, locale('notify.report_already_open'), 'error')
        end
    end

    -- Stops an open/close loop from spamming staff and the webhook.
    local cooldownKey = license or tostring(source)
    local elapsed = lastReportAt[cooldownKey] and os.time() - lastReportAt[cooldownKey]
    if elapsed and elapsed < Config.Reports.CreateCooldown then
        return Notify(source, locale('notify.report_cooldown', Config.Reports.CreateCooldown - elapsed), 'error')
    end
    lastReportAt[cooldownKey] = os.time()

    local form = readReportForm(data)
    local playerName = GetDisplayName(source)
    local report = {
        Id = generateReportId(),
        ServerId = source,
        Identifier = license,
        Discord = GetIdentifier(source, 'discord'),
        OpenBy = playerName,
        OpenById = source,
        Type = form.category,
        Clips = form.clips,
        Title = form.title,
        Description = form.description,
        Status = 'Active',
        Chats = { { Message = form.message, Time = currentTime(), Sender = playerName, IsInitial = true } },
    }
    reports[#reports + 1] = report
    pushReportChange(report, 'upsert')
    Notify(source, locale('notify.report_sent'), 'success')

    for _, playerId in ipairs(GetPlayers()) do
        local staff = tonumber(playerId)
        if not mutedStaff[staff] and canManageReports(staff) then
            Notify(staff, locale('notify.new_report', playerName, source), 'inform')
        end
    end

    SendWebhook('report', 'New Report Created', 'A new report has been opened.', 3447003, {
        { name = 'Report ID', value = tostring(report.Id), inline = true },
        { name = 'Type', value = form.category, inline = true },
        { name = 'Player', value = ('%s (%s)'):format(playerName, source), inline = true },
        { name = 'Description', value = form.description, inline = false },
        { name = 'Clips', value = form.clips, inline = false },
    }, source)
end)

RegisterNetEvent('butter_admin:server:sendReportMessage', function(reportId, message)
    local source = source
    message = SanitizeString(message, 512)
    local report = message and findReport(reportId)
    if not report or not isActive(report) then return end

    local isStaff = canManageReports(source)
    if not isStaff and not isReportOwner(report, source, GetIdentifier(source, 'license')) then return end
    if isThrottled(source) then return end

    local senderName = GetDisplayName(source)
    local chat = { Message = message, Time = currentTime(), Sender = senderName, IsAdmin = isStaff }
    local chats = report.Chats
    chats[#chats + 1] = chat
    -- Keep the opening message and drop the oldest replies after it.
    while #chats > Config.Reports.MaxMessages do table.remove(chats, 2) end
    pushReportChange(report, 'message', chat)

    local owner = report.ServerId
    if isStaff and owner and owner ~= source then
        sendChatLine(owner, ('\n^0───────────────────────────\n^1[Admin] ^0→ ^5%s^0: %s\n^7→ %s\n^0───────────────────────────')
            :format(senderName, message, locale('info.report_reply')))
        Notify(owner, locale('notify.report_reply_received'), 'inform')
    end
end)

RegisterNetEvent('butter_admin:server:claimReport', function(reportId)
    local source = source
    if not canManageReports(source) then return end

    local report = findReport(reportId)
    if not report or not isActive(report) then return end
    if report.ClaimedBy then return Notify(source, locale('notify.report_already_claimed'), 'error') end

    report.ClaimedBy, report.ClaimedByName = source, GetDisplayName(source)
    pushReportChange(report, 'upsert')
    Notify(source, locale('notify.report_claimed'), 'success')
end)

---@param report table
---@param closerName string
---@param notes string?
local function markClosed(report, closerName, notes)
    report.Status = 'Closed'
    report.ClosedBy = closerName
    report.ClosingNotes = notes
    report.ClosedAt = os.date('%Y-%m-%d %H:%M')
    report.TypingAdmins = nil
end

RegisterNetEvent('butter_admin:server:closeReport', function(reportId, notes)
    local source = source
    local report = findReport(reportId)
    if not report or not isActive(report) then return end
    if not canManageReports(source) and not isReportOwner(report, source, GetIdentifier(source, 'license')) then return end

    local closerName = GetDisplayName(source)
    markClosed(report, closerName, SanitizeString(notes, 512))
    sendTranscripts(report, source, closerName)

    local owner = report.ServerId
    if owner and owner ~= source then
        sendChatLine(owner, ('\n^0─────────────────────────────────────\n^1[Report %s] ^0→ %s\n^0─────────────────────────────────────')
            :format(locale('info.report_close'), locale('info.report_closed')))
    end

    pushReportChange(report, 'upsert')
    pruneClosedReports()
    Notify(source, locale('notify.report_closed'), 'success')
end)

RegisterNetEvent('butter_admin:server:reopenReport', function(reportId)
    local source = source
    if not canManageReports(source) then return end

    local report = findReport(reportId)
    if not report or isActive(report) then return end

    -- The owner may have opened a new report since; only one can be active.
    for _, other in ipairs(reports) do
        if other ~= report and isActive(other) and report.Identifier and other.Identifier == report.Identifier then
            return Notify(source, locale('notify.report_reopen_blocked'), 'error')
        end
    end

    report.Status = 'Active'
    report.ClosedBy, report.ClosingNotes, report.ClosedAt = nil, nil, nil
    pushReportChange(report, 'upsert')
    Notify(source, locale('notify.report_reopened'), 'success')

    local owner = report.ServerId
    if owner and owner ~= source then
        Notify(owner, locale('notify.report_reopened_owner'), 'inform')
    end

    SendWebhook('report', 'Report Reopened', 'A closed report has been reopened.', 3447003, {
        { name = 'Report ID', value = tostring(report.Id), inline = true },
        { name = 'Opened By', value = ('%s (%s)'):format(report.OpenBy, report.OpenById), inline = true },
        { name = 'Reopened By', value = ('%s (%s)'):format(GetDisplayName(source), source), inline = true },
    }, source)
end)

RegisterNetEvent('butter_admin:server:deleteReport', function(reportId)
    local source = source
    if not canManageReports(source) then return end

    local report, index = findReport(reportId)
    -- Only closed reports can be deleted, so a transcript always exists first.
    if not report or isActive(report) then return end

    table.remove(reports, index)
    pushReportChange(report, 'remove')
    Notify(source, locale('notify.report_deleted'), 'success')
end)

RegisterNetEvent('butter_admin:server:setReportTyping', function(reportId, isTyping)
    local source = source
    if not canManageReports(source) then return end

    local report = findReport(reportId)
    if not report or not isActive(report) then return end

    local name = GetDisplayName(source)
    local typing = report.TypingAdmins or {}
    report.TypingAdmins = typing

    local index
    for i, typingName in ipairs(typing) do
        if typingName == name then index = i break end
    end

    if isTyping and not index then
        typing[#typing + 1] = name
    elseif not isTyping and index then
        table.remove(typing, index)
    else
        return
    end

    for _, playerId in ipairs(GetPlayers()) do
        local target = tonumber(playerId)
        if target == report.ServerId or canManageReports(target) then
            TriggerClientEvent('butter_admin:client:reportTyping', target, report.Id, typing)
        end
    end
end)

RegisterNetEvent('butter_admin:server:setReportsMuted', function(muted)
    local source = source
    if not canManageReports(source) then return end
    mutedStaff[source] = muted == true or nil
end)

RegisterNetEvent('butter_admin:server:requestReports', function()
    SyncReportsForPlayer(source)
end)

---@param source number
local function releaseStaffClaims(source)
    local staffName = GetDisplayName(source)
    for _, report in ipairs(reports) do
        local changed = false
        if report.ClaimedBy == source then
            report.ClaimedBy, report.ClaimedByName = nil, nil
            changed = true
        end
        for i = #(report.TypingAdmins or {}), 1, -1 do
            if report.TypingAdmins[i] == staffName then
                table.remove(report.TypingAdmins, i)
                changed = true
            end
        end
        if changed and report.ServerId ~= source then pushReportChange(report, 'upsert') end
    end
end

AddEventHandler('playerDropped', function()
    local source = source
    mutedStaff[source] = nil
    lastMessageAt[source] = nil
    releaseStaffClaims(source)

    if not Config.Reports.AutoCloseOnDisconnect then
        -- Keep the report but detach it from the recycled server ID; the
        -- owner's license re-attaches it when they reconnect.
        for _, report in ipairs(reports) do
            if report.ServerId == source then report.ServerId = nil end
        end
        return
    end

    for _, report in ipairs(reports) do
        if report.ServerId == source then
            report.ServerId = nil
            if isActive(report) then
                SendWebhook('report', 'Report Closed (Disconnect)', 'Report automatically closed because the player disconnected.', 10038562, {
                    { name = 'Report ID', value = tostring(report.Id), inline = true },
                    { name = 'Player', value = ('%s (%s)'):format(report.OpenBy, source), inline = true },
                }, source)
                markClosed(report, 'System', 'Player disconnected')
                pushReportChange(report, 'upsert')
            end
        end
    end
    pruneClosedReports()
end)
