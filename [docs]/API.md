# butter_admin API

## Exports

### Server

| Export | Returns |
|--------|---------|
| `exports.butter_admin:isAdmin(source)` | `true` when the player may open the menu |
| `exports.butter_admin:isInDevMode(source)` | `true` when dev mode is on and the player holds `devmode` |
| `exports.butter_admin:getAdminWebhook(identifier)` | Personal webhook URL and its event list, or `nil` |
| `exports.butter_admin:getAdminWebhookBySource(source)` | Same, looked up by player |
| `exports.butter_admin:isSpectating(source)` | `true` while the player spectates someone |

### Client

| Export | Does |
|--------|------|
| `exports.butter_admin:isAdmin()` | `true` when this player may open the menu |
| `exports.butter_admin:isInDevMode()` | `true` while dev mode is on |
| `exports.butter_admin:isSpectating()` | `true` while spectating |
| `exports.butter_admin:openMenu()` | Opens the admin menu (permission checked) |
| `exports.butter_admin:openReportMenu()` | Opens the player report window |

## Server helpers for custom commands

These globals exist in butter_admin's own server scripts. Use them from handlers you add inside the resource (custom bridges or modules).

| Helper | Purpose |
|--------|---------|
| `IsAuthorized(source, permission, reason?)` | Permission and duty check. With a reason, denials are notified and logged for you |
| `IsAuthorizedAny(source, permissions, reason?)` | Passes when any permission matches |
| `ResolveTarget(id, fallback?)` | Server id of a connected player, or `nil` (rejects 0 and -1) |
| `ResolvePayloadTarget(payload, fallback?)` | Same, read from `payload.player` |
| `SanitizeString(value, maxLength)`, `SanitizeAmount(value, max?)`, `ClampNumber(value, min, max, default)` | Input validation |
| `Notify(source, message, type)` | ox_lib notification |
| `CreateLog(source, type, message, data?)` | Audit log entry and admin log webhook |
| `LogError`, `LogWarn`, `LogInfo`, `LogDebug` | Console output that follows `Config.Debug` |

## Events

Menu commands send their form values as one table, for example `{ player = 3, amount = 500 }`. Server handlers validate everything they receive.

### Server events (client to server)

Player actions: `revivePlayer`, `reviveAll`, `reviveInRadius`, `selfRevive`, `healPlayer`, `killPlayer`, `setArmor`, `selfArmor`, `restoreNeeds`, `removeStress`, `toggleFreeze`, `toggleGodmode`, `toggleInvisible`, `toggleInfiniteAmmo`, `toggleInfiniteStamina`, `setModel`, `resetSkin`, `openClothing`, `openInventory`, `openStash`, `openVehicleInventory`, `clearInventory`, `giveItem`, `giveMoney`, `setMoney`, `setJob`, `setGang`, `toggleJobDuty`, `playerInfo`, `warnPlayer`.

Moderation: `banPlayer`, `unbanPlayer`, `kickPlayer`, `kickAllPlayers`, `startSpectate`, `stopSpectate`, `cycleSpectate`, `sendDirectMessage`, `replyDirectMessage`, `savePlayerNote`, `captureScreenshot`.

World and vehicles: `setWeather`, `setTime`, `announce`, `deleteArea`, `teleportPlayer`, `teleportPlayerToCoords`, `teleportIntoVehicle`, `teleportAll`, `giveCar`, `registerAdminCar`, `refuelVehicle`, `saveVehicleProps`, `fixVehicleForAll`, `openBennys`, `logVehicleSpawn`, `logLaserAction`, `setBlipsEnabled`.

Objects: `spawnObject`, `deleteObject`, `requestObjects`.

Fun: `flingPlayer`, `makeDrunk`, `setOnFire`, `playSound`, `forceAnimation`, `sendToJailbox`, `damageVehicle`, `kidnapVan`, `registerKidnapEntities`, `cleanupKidnap`, `ufoKidnap`, `ghostTroll`, `animalAttack`.

Reports and chat: `createReport`, `sendReportMessage`, `claimReport`, `closeReport`, `reopenReport`, `deleteReport`, `setReportTyping`, `setReportsMuted`, `requestReports`, `sendStaffMessage`.

Access and server: `requestMenu`, `saveRank`, `deleteRank`, `saveAdmin`, `deleteAdmin`, `setDiscordLogs`, `resourceAction`, `subscribeDashboard`, `runConsoleCommand`.

All names are prefixed `butter_admin:server:`.

### Server callbacks (lib.callback)

`getPermissions`, `verifyPermission`, `getAccessData`, `getChoices`, `getCharacterNames`, `getPlayers`, `getPlayerProfile`, `getPlayerNotes`, `getBans`, `getLogs`, `getGarages`, `getVehicles`, `getProperties`, `getEconomy`, `getJobs`, `getGangs`, `getFactionMembers`, `getInventories`, `getInventoryItems`, `updateAlignment`, `vehicleAction`, `propertyAction`, `inventoryAction`, `getResources`, `getDashboard`, `getDashboardSessions`, `getPlayerLocations`, `requestLiveStream`, `getObjects`, `getVehicleModel`. Prefixed `butter_admin:server:`.

The client registers `butter_admin:client:getWaypoint`, which the server uses for waypoint based trolls.

### Client events

Sent by the server, prefixed `butter_admin:client:`: `openMenu`, `closeMenu`, `openReport`, `refreshPermissions`, `resetPreferences`, `executeCommand`, `revivePlayer`, `healPlayer`, `killPlayer`, `setFrozen`, `setGodmode`, `setInvisible`, `setInfiniteAmmo`, `setInfiniteStamina`, `setModel`, `resetSkin`, `openClothing`, `showWarning`, `showPlayerInfo`, `teleport`, `teleportIntoVehicle`, `spectate`, `spectateTargetDropped`, `setEnvironment`, `setFuel`, `openBennys`, `repairNetworkedVehicle`, `deleteArea`, `updatePlayerBlips`, `syncObjects`, `objectCreated`, `objectDeleted`, `syncReports`, `reportChanged`, `reportTyping`, `syncStaffChat`, `staffChatMessage`, `receiveDirectMessage`, `receiveDirectReply`, `updateAccessData`, `updateResources`, `dashboardPush`, and the fun events `flingPlayer`, `makeDrunk`, `setOnFire`, `playSound`, `forceAnimation`, `sendToJailbox`, `damageVehicle`, `kidnapVan`, `ufoKidnap`, `ghostTroll`, `animalAttack`.

Local client events (menu commands with `EventType = 'Client'`): `toggleNoclip`, `toggleBlips`, `togglePlayerNames`, `toggleCoords`, `copyCoords`, `teleportToMarker`, `teleportToCoords`, `teleportPlayerToMarker`, `spawnVehicle`, `deleteVehicle`, `fixVehicle`, `upgradeVehicle`, `giveKeys`, `registerAdminCar`, `openTrunk`, `openGlovebox`, `spawnProp`, `manageProp`, plus `playerLoaded`, `playerUnloaded` and `optionsChanged` raised by the client itself.

## NUI contract

The client sends `{ action, data }` messages with `SendNuiAction(action, data)`. The UI listens with `useNuiEvent(action, handler)`.

| Message | Data |
|---------|------|
| `openMenu`, `updateMenu` | Menu payload: commands, pages, options, players, ranks, locales... |
| `openPlayerReport`, `updatePlayerReport` | The player's report |
| `openDirectMessages`, `receiveDirectMessage` | Direct messages |
| `updateChats`, `reportTyping` | Reports and staff chat |
| `setItemEnabled` | `{ Name, State }` for toggles such as godmode or dev mode |
| `showPlayerInfo`, `showWarning`, `copyText`, `closeMenu` | One off UI actions |
| `laserUpdate`, `coordsUpdate`, `textUiUpdate` | Overlay panels |
| `dashboardPush`, `playSound` | Live dashboard data, sounds |

UI to client callbacks are camelCase `RegisterNUICallback` handlers. The UI can only run menu commands by id (`runCommand`) and panel actions from the fixed `PANEL_ACTIONS` list (`runAction`) in `modules/menu/client.lua`; it never names an event itself.
