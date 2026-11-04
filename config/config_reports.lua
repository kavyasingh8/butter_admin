Config = Config or {}

Config.Reports = {
    AutoCloseOnDisconnect = true, -- close a report when the player who opened it leaves
    SendDMTranscript = true,      -- DM the transcript to the player on close and post a copy to the report webhook
    CreateCooldown = 60,          -- seconds between reports from one player
    MaxMessages = 150,            -- older replies are dropped, the opening message is kept
    MaxClosedReports = 50,        -- closed reports kept in the Closed tab (until restart) for review/reopen
}

Config.StaffChat = {
    MaxHistory = 200,
}
