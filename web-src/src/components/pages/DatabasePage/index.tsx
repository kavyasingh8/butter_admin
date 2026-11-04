import React, { useState } from 'react';
import { useAdminMenu } from '../../../providers/AdminMenuContext';
import { SearchField } from '../../ui/SearchField';
import { SubTabs } from '../../ui/SubTabs';
import LargeModeRequired from '../../ui/LargeModeRequired';
import Players from './sub-pages/Players';
import Garages from './sub-pages/Garages';
import Vehicles from './sub-pages/Vehicles';
import Properties from './sub-pages/Properties';
import Economy from './sub-pages/Economy';
import JobsGangs from './sub-pages/JobsGangs';
import InventoryHub from './sub-pages/Inventory';

type SubTabId = 'Players' | 'Garages' | 'Vehicles' | 'Properties' | 'Economy' | 'JobsGangs' | 'Inventory';

const TABS: { id: SubTabId; key: string; icon: string }[] = [
  { id: 'Players', key: 'players', icon: 'fa-solid fa-users' },
  { id: 'Vehicles', key: 'vehicles', icon: 'fa-solid fa-car' },
  { id: 'Garages', key: 'garages', icon: 'fa-solid fa-warehouse' },
  { id: 'Properties', key: 'properties', icon: 'fa-solid fa-house' },
  { id: 'Economy', key: 'economy', icon: 'fa-solid fa-wallet' },
  { id: 'JobsGangs', key: 'jobs_gangs', icon: 'fa-solid fa-briefcase' },
  { id: 'Inventory', key: 'inventory', icon: 'fa-solid fa-box-open' },
];

const DatabasePage: React.FC = () => {
  const { t, menuSize } = useAdminMenu();
  const [activeTab, setActiveTab] = useState<SubTabId>('Players');
  const [searchQuery, setSearchQuery] = useState('');

  const renderSubPage = () => {
    switch (activeTab) {
      case 'Players':
        return <Players searchQuery={searchQuery} />;
      case 'Garages':
        return <Garages searchQuery={searchQuery} />;
      case 'Vehicles':
        return <Vehicles searchQuery={searchQuery} />;
      case 'Properties':
        return <Properties searchQuery={searchQuery} />;
      case 'Economy':
        return <Economy searchQuery={searchQuery} />;
      case 'JobsGangs':
        return <JobsGangs searchQuery={searchQuery} />;
      case 'Inventory':
        return <InventoryHub searchQuery={searchQuery} />;
      default:
        return null;
    }
  };

  if (menuSize !== 'Large') {
    return (
      <LargeModeRequired pageName={t('ui.pages.database.title')} description={t('ui.pages.database.large_mode_desc')} />
    );
  }

  const activeLabel = t(`ui.pages.database.tabs.${TABS.find((tab) => tab.id === activeTab)?.key}`);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-6 pb-0 shrink-0">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-accent/20"></div>
            <i className="fa-solid fa-database text-2xl relative z-10"></i>
          </div>
          <div>
            <h2 className="text-2xl font-rajdhani font-bold text-primary leading-none tracking-wide uppercase">
              {t('ui.pages.database.title')}
            </h2>
            <p className="text-xs font-mono text-primary/80 mt-1.5 uppercase tracking-widest font-bold">
              {t('ui.pages.database.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-5">
          <div className="min-w-0 overflow-x-auto">
            <SubTabs
              tabs={TABS.map(({ id, key, icon }) => ({ id, icon, label: t(`ui.pages.database.tabs.${key}`) }))}
              activeTab={activeTab}
              onChange={(id) => {
                setActiveTab(id);
                setSearchQuery('');
              }}
            />
          </div>
          <SearchField
            className="flex-1 min-w-[240px]"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('ui.pages.database.search_placeholder', activeLabel.toLowerCase())}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6">{renderSubPage()}</div>
    </div>
  );
};

export default DatabasePage;
