local reports = {} ---@type table[]
local playerReportOpen = false

---@return table?
local function getMyReport()
    for _, report in ipairs(reports) do
        if report.ServerId == cache.serverId and report.Status ~= 'Closed' then return report end
    end
end

---@param reportId any
---@return integer?
local function findReportIndex(reportId)
    for index, report in ipairs(reports) do
        if report.Id == reportId then return index end
    end
end

---@return boolean
function IsPlayerReportOpen()
    return playerReportOpen
end

---@param open boolean
function SetPlayerReportOpen(open)
    playerReportOpen = open
end

local function openPlayerReport()
    local name = GetDisplayName()
    playerReportOpen = true
    SetNuiFocus(true, true)
    SetCursorLocation(0.5, 0.5)
    SendNuiAction('openPlayerReport', {
        PlayerReportMode = true,
        PlayerName = name,
        MyName = name,
        ReportData = getMyReport(),
        Locales = GetUiLocales(),
    })
end

--- The UI gets the whole local list; this is cheap compared to the network.
local function pushReportsToUi()
    SendNuiAction('updateChats', { Reports = reports })
    local myReport = getMyReport()
    if myReport then SendNuiAction('updatePlayerReport', { ReportData = myReport }) end
end

RegisterNetEvent('butter_admin:client:openReport', openPlayerReport)

-- Full snapshot (menu open, join, reconnect).
RegisterNetEvent('butter_admin:client:syncReports', function(list)
    reports = type(list) == 'table' and list or {}
    pushReportsToUi()
end)

-- Incremental changes: only what changed is sent.
RegisterNetEvent('butter_admin:client:reportChanged', function(operation, payload, message)
    if operation == 'upsert' and type(payload) == 'table' then
        reports[findReportIndex(payload.Id) or (#reports + 1)] = payload
    elseif operation == 'message' and type(message) == 'table' then
        local index = findReportIndex(payload)
        -- Unknown report: the next snapshot will include it.
        if not index then return end
        local chats = reports[index].Chats
        chats[#chats + 1] = message
        while #chats > Config.Reports.MaxMessages do table.remove(chats, 2) end
    elseif operation == 'remove' then
        local index = findReportIndex(payload)
        if not index then return end
        table.remove(reports, index)
    else
        return
    end

    pushReportsToUi()
end)

RegisterNetEvent('butter_admin:client:reportTyping', function(reportId, typingAdmins)
    SendNuiAction('reportTyping', { ReportId = reportId, TypingAdmins = typingAdmins })
end)

RegisterNUICallback('closePlayerReport', function(_, cb)
    playerReportOpen = false
    SetNuiFocus(false, false)
    cb(true)
end)

RegisterNUICallback('openPlayerReport', function(_, cb)
    openPlayerReport()
    cb(true)
end)

RegisterNUICallback('createReport', function(data, cb)
    TriggerServerEvent('butter_admin:server:createReport', data)
    cb(true)
end)

RegisterNUICallback('sendPlayerReportMessage', function(data, cb)
    local report = getMyReport()
    if report then TriggerServerEvent('butter_admin:server:sendReportMessage', report.Id, data.message) end
    cb(true)
end)

RegisterNUICallback('sendReportMessage', function(data, cb)
    TriggerServerEvent('butter_admin:server:sendReportMessage', data.reportId, data.message)
    cb(true)
end)

RegisterNUICallback('closeReport', function(data, cb)
    TriggerServerEvent('butter_admin:server:closeReport', data.reportId, data.notes)
    cb(true)
end)

RegisterNUICallback('reopenReport', function(data, cb)
    TriggerServerEvent('butter_admin:server:reopenReport', data.reportId)
    cb(true)
end)

RegisterNUICallback('deleteReport', function(data, cb)
    TriggerServerEvent('butter_admin:server:deleteReport', data.reportId)
    cb(true)
end)

RegisterNUICallback('claimReport', function(data, cb)
    TriggerServerEvent('butter_admin:server:claimReport', data.reportId)
    cb(true)
end)

RegisterNUICallback('setReportTyping', function(data, cb)
    TriggerServerEvent('butter_admin:server:setReportTyping', data.reportId, data.isTyping == true)
    cb(true)
end)

RegisterNUICallback('setReportsMuted', function(data, cb)
    TriggerServerEvent('butter_admin:server:setReportsMuted', data.muted == true)
    cb(true)
end)

exports('openReportMenu', function()
    TriggerServerEvent('butter_admin:server:requestReports')
    openPlayerReport()
end)
