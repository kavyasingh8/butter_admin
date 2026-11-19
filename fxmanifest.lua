fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'butter_admin'
author 'ButterChilly & Guardian'
description 'Admin menu with a React UI, access control, reports, bans and database tools'
version '1.0.3'
repository 'https://github.com/kavyasingh8/butter_admin'

ui_page 'web/index.html'

ox_libs { 'locale' }

dependencies {
    'ox_lib',
    'oxmysql',
}

shared_scripts {
    '@ox_lib/init.lua',
    'config/config_shared.lua',
    'config/config_commands.lua',
    'config/config_models.lua',
    'config/config_sounds.lua',
    'config/config_reports.lua',
    'config/config_bans.lua',
    'config/config_objects.lua',
    'config/config_fun.lua',
    'config/config_bennys.lua',
    'modules/core/shared.lua',
}

client_scripts {
    'modules/core/client.lua',
    'bridge/**/client/*.lua',
    'modules/menu/client.lua',
    'modules/access/client.lua',
    'modules/actions/client.lua',
    'modules/environment/client.lua',
    'modules/vehicles/client.lua',
    'modules/teleport/client.lua',
    'modules/spectate/client.lua',
    'modules/noclip/client.lua',
    'modules/trolling/client.lua',
    'modules/developer/client.lua',
    'modules/objects/client.lua',
    'modules/reports/client.lua',
    'modules/staffchat/client.lua',
    'modules/messages/client.lua',
    'modules/bans/client.lua',
    'modules/database/client.lua',
    'modules/resources/client.lua',
    'modules/dashboard/client.lua',
    'modules/monitoring/client.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'config/config_server.lua',
    'modules/core/server.lua',
    'bridge/**/server/*.lua',
    'modules/discord/server.lua',
    'modules/access/server.lua',
    'modules/logs/server.lua',
    'modules/duty/server.lua',
    'modules/menu/server.lua',
    'modules/players/server.lua',
    'modules/bans/server.lua',
    'modules/actions/server.lua',
    'modules/environment/server.lua',
    'modules/vehicles/server.lua',
    'modules/teleport/server.lua',
    'modules/spectate/server.lua',
    'modules/trolling/server.lua',
    'modules/developer/server.lua',
    'modules/objects/server.lua',
    'modules/reports/server.lua',
    'modules/staffchat/server.lua',
    'modules/messages/server.lua',
    'modules/database/server.lua',
    'modules/resources/server.lua',
    'modules/dashboard/server.lua',
    'modules/monitoring/server.lua',
    'modules/commands/server.lua',
    'modules/version/server.lua',
}

files {
    'web/index.html',
    'web/assets/**/*',
    'locales/*.json',
    'sounds/*.ogg',
}
