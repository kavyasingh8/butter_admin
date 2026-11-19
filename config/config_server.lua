-- Server only. Secrets are read from convars so they stay out of the files:
--   set butter_admin_discord_token "..."   (keep these as `set`, never `setr`)

Config.VersionCheck = true -- Check GitHub on start and print in the server console when an update is released

Config.Discord = {
    guildId = '',
    botToken = '',
}

-- Separate staff server where personal admin log channels are created.
Config.StaffDiscord = {
    guildId = '',
    botToken = '',
}

Config.AutoCreateAdminWebhooks = true -- create a personal log channel when an admin is added

Config.Webhooks = {
    report = '',
    ban = '',
    kick = '',
    unban = '',
    exploit = '',
    adminlog = '',
    duty = '',
    warn = '',
}
