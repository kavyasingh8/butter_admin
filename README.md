# butter_admin

A free admin menu for FiveM. Works with Qbox, QBCore and ESX.

By ButterChilly & Guardian · v1.0.3 · [GitHub](https://github.com/kavyasingh8/butter_admin)

## Features

- Player list, profiles and notes
- Reports and staff chat
- Bans, kicks and warnings
- Audit logs and Discord webhooks
- Rank based permissions (with Discord role support)
- Database browser
- Server dashboard and resource manager
- Dev mode, noclip and trolls

## Requirements

- [ox_lib](https://github.com/overextended/ox_lib)
- [oxmysql](https://github.com/overextended/oxmysql)
- `qbx_core`, `qb-core` or `es_extended`

## Installation

1. Drop the folder into your resources.
2. Add it to your `server.cfg` after its dependencies:

   ```cfg
   ensure ox_lib
   ensure oxmysql
   ensure qbx_core
   ensure butter_admin
   ```

3. Start the server. The database tables are created for you.
4. Give yourself access:
   - **Qbox:** `god` or `admin` permission
   - **QBCore:** `add_ace group.admin butter_admin.admin allow`
   - **ESX:** `admin`, `superadmin` or `god` group
   - **Or with SQL:**

     ```sql
     INSERT INTO admin_staff (identifier, rank_id, is_temp, expires)
     VALUES ('license:YOUR_LICENSE', 'superadmin', 0, NULL);
     ```

5. Press **INSERT** in game (or type `/menuopen`).

## Configuration

All settings are in the `config` folder. Discord tokens and webhooks go in your `server.cfg` so they never reach players:

```cfg
set butter_admin_discord_guild ""
set butter_admin_discord_token ""
set butter_admin_webhook_report ""
set butter_admin_webhook_ban ""
set butter_admin_webhook_kick ""
set butter_admin_webhook_unban ""
set butter_admin_webhook_exploit ""
set butter_admin_webhook_adminlog ""
set butter_admin_webhook_duty ""
set butter_admin_webhook_warn ""
```

Your Discord bot needs the **Server Members** intent.

## Commands

| Command | Description |
|---------|-------------|
| `/menuopen` | Open the menu |
| `/menureset` | Reset your menu settings |
| `/adminduty` | Toggle admin duty |
| `/report` | Send a report |
| `/dmchat` | Reply to the last admin who messaged you |

## Permissions

Ranks are made in the **Access Control** page. Each rank has a list of permissions, and you can give a rank to a license, Steam, Discord or citizen id, or to a whole Discord role.

`all` gives everything. Every command in `config/config_commands.lua` uses its `Id` as its permission.

## Supported resources

Bridges load automatically when the resource is running. Nothing to set up.

- **Inventory:** ox_inventory, qb-inventory, ps-inventory, lj-inventory
- **Ambulance:** qbx_medical, qb-ambulancejob, wasabi_ambulance
- **Clothing:** illenium-appearance, qb-clothing
- **Fuel:** ox_fuel, LegacyFuel, cdn-fuel, ps-fuel, lj-fuel, lc_fuel, Renewed-Fuel, rcore_fuel, nd_fuel, okokGasStation, hyon_gas_station
- **Vehicle keys:** qbx_vehiclekeys, qb-vehiclekeys, Renewed-Vehiclekeys, wasabi_carlock, cd_garage, okokGarage, MrNewbVehicleKeys, t1ger_keys, jaksam-vehicles-keys
- **Weather:** qb-weathersync, Renewed-Weathersync, cad-climate
- **Phone:** lb-phone, qs-smartphone-pro, gksphone, okokPhone, high_phone, roadphone, yseries, sd-phone, 0s_phone
- **Garages:** qbx_garages, jg-advancedgarages
- **Housing:** ps-housing, qbx_properties, qbx_apartments, qb-houses, qs-housing, bcs_housing, bnl-housing, brutal_housing, nolag_properties, origen_housing, sn_properties, tgiann-house, tk_housing, vms_housing
- **Animations:** bablo-animations

Want to add another one? Copy a similar file in `bridge/` and change it to fit.

## Custom commands

Add your command to `config/config_commands.lua`, then check the permission on the server:

```lua
RegisterNetEvent('my_resource:server:healPlayer', function(payload)
    local source = source
    if not IsAuthorized(source, 'healplayer') then return end
    -- your code
end)
```

More exports and events are in [`[docs]/API.md`]([docs]/API.md).

## Building the UI

```bash
cd web-src
npm ci
npm run build
```

Use `npm run dev` to preview it in your browser.

## Credits

The UFO, ghost and kidnap van trolls are based on [fivem-tgiann-admin-troll](https://github.com/tgiann/fivem-tgiann-admin-troll) by tgiann (GPL-3.0).
