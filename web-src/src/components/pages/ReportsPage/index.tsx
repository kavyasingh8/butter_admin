import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAdminMenu, useChats } from '../../../providers/AdminMenuContext';
import { fetchNui } from '../../../utils/fetchNui';
import { copyTextToClipboard } from '../../../utils/misc';
import { markReportRead } from '../../../utils/readReports';
import { Report } from '../../../types';

import { ReportHeader } from './components/ReportHeader';
import { ReportSubTabs } from './components/ReportSubTabs';
import { ReportTicketList } from './components/ReportTicketList';
import { ReportActionBar } from './components/OpenReport/ReportActionBar';
import { ReportClosingNotes } from './components/OpenReport/ReportClosingNotes';
import { ReportChatView } from './components/OpenReport/ReportChatView';
import { ReportMessageInput } from './components/OpenReport/ReportMessageInput';
import { CloseTicketModal, DeleteModal } from './components/ReportModals';
import { ReportTypeFilter } from './components/ReportTypeFilter';
import { SearchField } from '../../ui/SearchField';
import { SortSelect } from '../../ui/SortSelect';
import { SubTabs } from '../../ui/SubTabs';

type ClaimFilter = 'all' | 'unclaimed' | 'mine';
type ReportSort = 'newest' | 'oldest';

const ReportsPage: React.FC = () => {
  const { myName, showCheckmark, showCrossmark, menuSize, t } = useAdminMenu();
  const { reports } = useChats();
  const [openedReport, setOpenedReport] = useState<Report | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sendTimeout, setSendTimeout] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Active' | 'Closed'>('Active');
  const [filterType, setFilterType] = useState<string>('All');
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>('all');
  const [sort, setSort] = useState<ReportSort>('newest');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');

  const isSmall = menuSize === 'Small';
  const reportChatRef = useRef<HTMLDivElement>(null);

  const filteredReports = useMemo(() => {
    let filtered = reports.filter((r) => (r.Status || 'Active') === activeTab);

    if (filterType !== 'All') {
      filtered = filtered.filter((r) => r.Type === filterType);
    }

    if (claimFilter === 'unclaimed') filtered = filtered.filter((r) => !r.ClaimedBy);
    if (claimFilter === 'mine') filtered = filtered.filter((r) => r.ClaimedByName === myName);

    filtered = [...filtered].sort((a, b) => (sort === 'newest' ? b.Id - a.Id : a.Id - b.Id));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((report) => {
        const reportIdMatch = String(report.Id).toLowerCase().includes(query);
        const senderMatch = report.Chats?.some((chat) => chat.Sender.toLowerCase().includes(query)) || false;
        const messageMatch = report.Chats?.some((chat) => chat.Message.toLowerCase().includes(query)) || false;
        const typeMatch = report.Type?.toLowerCase().includes(query);
        const titleMatch = report.Title?.toLowerCase().includes(query);
        const claimMatch = report.ClaimedByName?.toLowerCase().includes(query);
        const playerIdMatch = String(report.OpenById ?? '') === query;
        return reportIdMatch || senderMatch || messageMatch || typeMatch || titleMatch || claimMatch || playerIdMatch;
      });
    }
    return filtered;
  }, [reports, searchQuery, activeTab, filterType, claimFilter, sort, myName]);

  const activeCount = useMemo(() => reports.filter((r) => (r.Status || 'Active') === 'Active').length, [reports]);

  const currentReport = openedReport ? reports.find((r) => r.Id === openedReport.Id) || openedReport : null;

  useEffect(() => {
    if (reportChatRef.current) {
      reportChatRef.current.scrollTop = reportChatRef.current.scrollHeight;
    }
  }, [openedReport, reports]);

  const currentReportId = currentReport?.Id;
  const currentMessageCount = currentReport?.Chats?.length ?? 0;
  useEffect(() => {
    if (currentReportId !== undefined) markReportRead(currentReportId, currentMessageCount);
  }, [currentReportId, currentMessageCount]);

  // Shows the player and other staff while this admin is writing a reply.
  const typingReportId = useRef<number | null>(null);
  const setTypingIn = useCallback((reportId: number | null) => {
    const previous = typingReportId.current;
    if (previous === reportId) return;
    if (previous !== null) fetchNui('setReportTyping', { reportId: previous, isTyping: false }).catch(() => {});
    if (reportId !== null) fetchNui('setReportTyping', { reportId, isTyping: true }).catch(() => {});
    typingReportId.current = reportId;
  }, []);

  const openedReportId = openedReport?.Id ?? null;
  const isTyping = messageInput.trim() !== '';
  useEffect(() => {
    if (openedReportId === null || !isTyping) {
      setTypingIn(null);
      return;
    }
    setTypingIn(openedReportId);
    const idle = setTimeout(() => setTypingIn(null), 4000);
    return () => clearTimeout(idle);
  }, [openedReportId, isTyping, messageInput, setTypingIn]);

  useEffect(() => () => setTypingIn(null), [setTypingIn]);

  const sendMessage = () => {
    if (sendTimeout) return;
    if (openedReport && messageInput.trim() !== '') {
      fetchNui('sendReportMessage', { reportId: openedReport.Id, message: messageInput }).catch(() => {});
      setMessageInput('');
    } else {
      setSendTimeout(true);
      showCrossmark();
      setTimeout(() => setSendTimeout(false), 1750);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !sendTimeout) sendMessage();
  };

  const handleDeleteReport = () => {
    if (!openedReport) return;
    fetchNui('deleteReport', { reportId: openedReport.Id }).catch(() => {});
    showCheckmark();
    setShowDeleteModal(false);
    setTimeout(() => setOpenedReport(null), 1700);
  };

  // Closing keeps the report: it moves to the Closed tab where it can be reopened.
  const handleCloseReport = () => {
    if (!openedReport || !closingNotes.trim()) return;
    fetchNui('closeReport', { reportId: openedReport.Id, notes: closingNotes.trim() }).catch(() => {});
    showCheckmark();
    setShowCloseModal(false);
    setClosingNotes('');
    setMessageInput('');
  };

  const handleReopenReport = () => {
    if (!openedReport) return;
    fetchNui('reopenReport', { reportId: openedReport.Id }).catch(() => {});
    showCheckmark();
  };

  const handleClaimReport = () => {
    if (!openedReport) return;
    fetchNui('claimReport', { reportId: openedReport.Id }).catch(() => {});
    showCheckmark();
  };

  const handleExportTranscript = (report: Report) => {
    let transcript = `--- Report #${report.Id} Transcript ---\n`;
    transcript += `Status: Closed (by ${report.ClosedBy || 'System'})\n`;
    if (report.ClosingNotes) transcript += `Closing Notes: ${report.ClosingNotes}\n`;
    transcript += `\n--- Messages ---\n`;
    (report.Chats || []).forEach((chat) => {
      transcript += `[${chat.Time}] ${chat.Sender}: ${chat.Message}\n`;
    });
    if (copyTextToClipboard(transcript)) showCheckmark();
    else showCrossmark();
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Column: Ticket List, hidden in small mode when a ticket is selected */}
      {(!isSmall || !currentReport) && (
        <div
          className={`${isSmall ? 'w-full' : 'w-96 max-w-[40%] min-w-[300px]'} flex-shrink-0 border-r border-border/50 flex flex-col`}
        >
          <div className="px-4 pt-6 pb-2">
            <ReportHeader openedReport={null} />
            <ReportSubTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              activeCount={activeCount}
              closedCount={reports.length - activeCount}
            />
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('ui.pages.reports.search_placeholder')}
            />
            <div className="mt-3">
              <ReportTypeFilter activeFilter={filterType} onChange={setFilterType} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <SubTabs
                tabs={[
                  { id: 'all', label: t('ui.pages.reports.filter_all') },
                  { id: 'unclaimed', label: t('ui.pages.reports.filter_unclaimed') },
                  { id: 'mine', label: t('ui.pages.reports.filter_mine') },
                ]}
                activeTab={claimFilter}
                onChange={setClaimFilter}
                className="flex-1"
                tabClassName="py-1.5 px-2 flex-1"
              />
              <SortSelect
                value={sort}
                onChange={setSort}
                options={[
                  { id: 'newest', label: t('ui.pages.reports.sort_newest') },
                  { id: 'oldest', label: t('ui.pages.reports.sort_oldest') },
                ]}
              />
            </div>
          </div>

          <ReportTicketList
            filteredReports={filteredReports}
            searchQuery={searchQuery}
            activeTab={activeTab}
            onSelect={setOpenedReport}
            activeId={currentReport?.Id}
          />
        </div>
      )}

      {/* Right Column: Active Ticket, takes full width in small mode */}
      {(!isSmall || currentReport) && (
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
          {currentReport ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 pb-0 flex flex-col">
                <ReportActionBar
                  currentReport={currentReport}
                  onBack={() => setOpenedReport(null)}
                  onExport={handleExportTranscript}
                  onDelete={() => setShowDeleteModal(true)}
                  onClose={() => setShowCloseModal(true)}
                  onReopen={handleReopenReport}
                  onClaim={handleClaimReport}
                />

                {currentReport.Status === 'Closed' && <ReportClosingNotes report={currentReport} />}
              </div>

              <ReportChatView currentReport={currentReport} myName={myName} chatRef={reportChatRef} />

              {currentReport.Status !== 'Closed' && (
                <ReportMessageInput
                  messageInput={messageInput}
                  setMessageInput={setMessageInput}
                  onSend={sendMessage}
                  onKeyPress={handleKeyPress}
                  sendTimeout={sendTimeout}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted opacity-60 select-none p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-black/40 border border-white/5 flex items-center justify-center mb-4">
                <i className="fa-solid fa-flag text-3xl text-accent/50"></i>
              </div>
              <p className="font-rajdhani text-lg font-semibold tracking-wider uppercase">
                {t('ui.pages.reports.select_ticket')}
              </p>
              <p className="font-barlow text-sm mt-1">{t('ui.pages.reports.select_ticket_desc')}</p>
            </div>
          )}
        </div>
      )}

      {showDeleteModal && <DeleteModal onCancel={() => setShowDeleteModal(false)} onConfirm={handleDeleteReport} />}
      {showCloseModal && (
        <CloseTicketModal
          closingNotes={closingNotes}
          setClosingNotes={setClosingNotes}
          onCancel={() => setShowCloseModal(false)}
          onConfirm={handleCloseReport}
        />
      )}
    </div>
  );
};

export default ReportsPage;
