import React, { useEffect, useCallback, useState } from 'react';
import { useAdminMenu } from '../providers/AdminMenuContext';
import { useVisibility } from '../providers/VisibilityProvider';
import { useNuiEvent } from '../hooks/useNuiEvent';
import { debugData } from '../utils/debugData';
import { copyTextToClipboard, isEnvBrowser } from '../utils/misc';
import { useResolutionScale, useUserScale } from '../hooks/useResolutionScale';
import PlayerReportChat from './PlayerReportChat';
import PlayerDMChat from './PlayerDMChat';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './Sidebar';
import { Checkmark, Crossmark } from './ui/Checkmark';
import PinnedPlayers from './ui/PinnedPlayers';
import Dropdown from './ui/Dropdown';
import CommandsPage from './pages/CommandsPage/index';
import PlayerListPage from './pages/PlayerListPage/index';
import BansPage from './pages/BansPage/index';
import PlayerLogsPage from './pages/PlayerLogsPage/index';
import StaffChatPage from './pages/StaffChatPage/index';
import ReportsPage from './pages/ReportsPage/index';
import AccessControlPage from './pages/AccessControlPage/index';
import DatabasePage from './pages/DatabasePage/index';
import OptionsPage from './pages/OptionsPage/index';
import ResourcesPage from './pages/ResourcesPage/index';
import TxAdminPage from './pages/TxAdminPage/index';
import MonitoringPage from './pages/MonitoringPage/index';
import LaserPanel from './LaserPanel';
import DevOverlay from './DevOverlay';
import WarningOverlay from './WarningOverlay';
import ReportAlertOverlay from './ReportAlertOverlay';
import ShowCoordsPanel from './ShowCoordsPanel';
import GenericTextUIPanel from './GenericTextUIPanel';
import SoundPlayer from './SoundPlayer';

// Browser development only: opens the menu with mock data.
if (isEnvBrowser()) {
  import('../utils/mockData').then(({ MOCK_OPEN_DATA }) =>
    debugData<unknown>([
      { action: 'setVisible', data: true },
      { action: 'openMenu', data: MOCK_OPEN_DATA },
    ]),
  );
}

interface DirectMessagePayload {
  SenderId: number;
  SenderName: string;
  Message: string;
  IsReply?: boolean;
}

interface WarningPayload {
  Reason?: string;
  AdminName?: string;
}

const PAGES: Record<string, React.FC> = {
  Commands: CommandsPage,
  PlayerList: PlayerListPage,
  Bans: BansPage,
  PlayerLogs: PlayerLogsPage,
  StaffChat: StaffChatPage,
  Reports: ReportsPage,
  AccessControl: AccessControlPage,
  Database: DatabasePage,
  Options: OptionsPage,
  Resources: ResourcesPage,
  TxAdmin: TxAdminPage,
  Monitoring: MonitoringPage,
};

const App: React.FC = () => {
  const {
    opened,
    menuSize,
    selectedPage,
    playerReportMode,
    playerDMMode,
    theme,
    closeMenu,
    setOpened,
    addDM,
    setPlayerDMMode,
    setPlayerReportMode,
    setLastAdminId,
    checkmarkVisible,
    crossmarkVisible,
    dropdown,
    setDropdown,
  } = useAdminMenu();
  const { setVisible } = useVisibility();
  const [warning, setWarning] = useState<{ reason: string; adminName: string } | null>(null);

  // Scales with the screen resolution (1920x1080 = 0.7) and the player's own UI-scale preference.
  const dynamicZoom = useResolutionScale();
  // The raw user scale grows the container footprint together with the zoomed content.
  const userScale = useUserScale();

  // Stable, so the dropdown's outside-click effect doesn't re-arm on every render.
  const closeDropdown = useCallback(() => setDropdown(null), [setDropdown]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useNuiEvent('openMenu', () => setVisible(true));
  useNuiEvent('openPlayerReport', () => setVisible(true));

  useNuiEvent('closeMenu', () => {
    setVisible(false);
    setOpened(false);
  });

  useNuiEvent<DirectMessagePayload>('receiveDirectMessage', (data) => {
    // A reply from a player must not become the admin this client answers to.
    if (!data.IsReply) setLastAdminId(data.SenderId);
    addDM(data.SenderId, {
      id: Date.now(),
      text: data.Message,
      isMe: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  });

  useNuiEvent('openDirectMessages', () => {
    setPlayerReportMode(false);
    setPlayerDMMode(true);
    setOpened(true);
    setVisible(true);
  });

  useNuiEvent<{ text: string }>('copyText', (data) => copyTextToClipboard(data.text ?? ''));

  useNuiEvent<WarningPayload>('showWarning', (data) => {
    setWarning({ reason: data.Reason ?? '', adminName: data.AdminName ?? '' });
    setVisible(true);
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !opened || warning) return;
      closeMenu();
      setVisible(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [opened, closeMenu, warning, setVisible]);

  const menuVisible = opened && !playerReportMode && !playerDMMode;
  const Page = PAGES[selectedPage] ?? CommandsPage;
  const isLarge = menuSize === 'Large';

  return (
    <>
      <ReportAlertOverlay />

      {/* Player report and direct message windows */}
      {(playerReportMode || playerDMMode) && (
        <div
          className={`fixed inset-0 flex items-center justify-center p-4 z-50 ${opened ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="w-full max-w-2xl h-[70vh] max-h-[800px] relative">
            <div className="absolute top-0 left-0" style={{ width: '100%', height: '100%', zoom: dynamicZoom }}>
              <ErrorBoundary key={playerReportMode ? 'report' : 'dm'} label={playerReportMode ? 'Report' : 'Messages'}>
                {playerReportMode ? <PlayerReportChat /> : <PlayerDMChat />}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed inset-0 flex items-center z-40 ${isLarge ? 'justify-center' : 'justify-end pr-[3vw]'} ${
          menuVisible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className="flex"
          style={{
            // Opacity and transform only, so the transition stays cheap on the zoomed subtree.
            // will-change skips transform: Chromium would keep the 0.97-scale raster and blur the menu.
            transition: 'opacity 140ms cubic-bezier(0.16,1,0.3,1), transform 140ms cubic-bezier(0.16,1,0.3,1)',
            willChange: 'opacity',
            opacity: menuVisible ? 1 : 0,
            transform: menuVisible ? 'scale(1)' : 'scale(0.97)',
            width: isLarge ? '98vw' : '90vw',
            // The footprint follows the UI-scale preference, clamped to the viewport.
            maxWidth: isLarge
              ? `min(${(75 * userScale).toFixed(2)}vw, 98vw)`
              : `min(${(22 * userScale).toFixed(2)}vw, 90vw)`,
            height: isLarge
              ? `min(${(92 * userScale).toFixed(2)}vh, 96vh)`
              : `min(${(85 * userScale).toFixed(2)}vh, 96vh)`,
            maxHeight: isLarge
              ? `min(${(92 * userScale).toFixed(2)}vh, 96vh)`
              : `min(${(85 * userScale).toFixed(2)}vh, 96vh)`,
          }}
        >
          <div className="w-full h-full relative">
            <div
              id="menu-zoom-layer"
              className="absolute top-0 left-0 flex"
              style={{ width: '100%', height: '100%', zoom: dynamicZoom }}
            >
              {/* Outside the menu's overflow so it can slide out */}
              <PinnedPlayers />

              <div className="w-full h-full bg-bg-primary border border-border/50 rounded-lg relative flex z-10">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent z-50 rounded-t-lg"></div>

                <SoundPlayer />

                <div
                  className={`${isLarge ? 'w-60' : 'w-16'} shrink-0 h-full relative z-30 transition-all duration-300`}
                >
                  <Sidebar />
                </div>

                <Checkmark visible={checkmarkVisible} />
                <Crossmark visible={crossmarkVisible} />

                <div className="flex-1 h-full overflow-hidden relative rounded-r-lg">
                  <div key={selectedPage} className="w-full h-full relative animate-in fade-in duration-150">
                    <ErrorBoundary key={selectedPage} label={selectedPage}>
                      <Page />
                    </ErrorBoundary>
                  </div>
                </div>
              </div>
            </div>

            {/* Outside the zoom layer so dropdowns render at true scale */}
            <div id="dropdown-portal-root" className="absolute inset-0 pointer-events-none z-[200]"></div>

            {dropdown && (
              <Dropdown
                options={dropdown.options}
                hasSearch={dropdown.hasSearch}
                position={dropdown.position}
                optionName={dropdown.name}
                onSelect={(choice) => choice.Callback?.(choice)}
                onClose={closeDropdown}
              />
            )}
          </div>
        </div>
      </div>
      <LaserPanel />
      <ShowCoordsPanel />
      <GenericTextUIPanel />
      <DevOverlay />
      {warning && (
        <WarningOverlay reason={warning.reason} adminName={warning.adminName} onClose={() => setWarning(null)} />
      )}
    </>
  );
};

export default App;
