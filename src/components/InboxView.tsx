import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Sparkles,
  Flame,
  AlertCircle,
  Inbox,
  Filter,
  CheckCircle2,
  Mail,
  ChevronRight,
  ShieldAlert,
  CalendarClock,
} from 'lucide-react';
import { EmailMessage, PriorityLevel } from '../types/email';
import { extractDateFromEmail } from '../services/dateExtractor';
import { EmailDetailView } from './EmailDetailView';

interface InboxViewProps {
  emails: EmailMessage[];
  selectedEmail: EmailMessage | null;
  onSelectEmail: (email: EmailMessage | null) => void;
  isLoading: boolean;
  isPrioritizing: boolean;
  hasGmailAccess: boolean;
  onRefresh: () => Promise<void>;
  onPrioritizeAll: () => Promise<void>;
  onConnectClick: () => void;
  onSendReply: (params: { to: string; subject: string; body: string; inReplyTo: string; threadId: string }) => Promise<void>;
  isSending: boolean;
  onUpdateEmailPriority: (emailId: string, priority: PriorityLevel) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({
  emails,
  selectedEmail,
  onSelectEmail,
  isLoading,
  isPrioritizing,
  hasGmailAccess,
  onRefresh,
  onPrioritizeAll,
  onConnectClick,
  onSendReply,
  isSending,
  onUpdateEmailPriority,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Compute counts by priority
  const counts = useMemo(() => {
    const c = { all: emails.length, urgent: 0, high: 0, normal: 0, low: 0, unread: 0 };
    emails.forEach((e) => {
      if (e.isUnread) c.unread++;
      if (e.priority === 'urgent') c.urgent++;
      else if (e.priority === 'high') c.high++;
      else if (e.priority === 'normal') c.normal++;
      else if (e.priority === 'low') c.low++;
    });
    return c;
  }, [emails]);

  // Filter emails
  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      // Priority filter
      if (selectedPriority !== 'all' && email.priority !== selectedPriority) {
        return false;
      }
      // Unread filter
      if (unreadOnly && !email.isUnread) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = email.subject.toLowerCase().includes(q);
        const matchesSender = (email.fromName || email.from || '').toLowerCase().includes(q);
        const matchesSnippet = (email.snippet || '').toLowerCase().includes(q);
        if (!matchesSubject && !matchesSender && !matchesSnippet) {
          return false;
        }
      }
      return true;
    });
  }, [emails, selectedPriority, unreadOnly, searchQuery]);

  const priorityBadgeStyle: Record<PriorityLevel, { bg: string; text: string; border: string }> = {
    urgent: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
    high: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    normal: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    low: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' },
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      {/* Missing Gmail Connection Banner */}
      {!hasGmailAccess && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200 text-xs">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Gmail Not Authorized:</strong> Real messages cannot be displayed until you authorize your Google Workspace account with Gmail permissions.
            </span>
          </div>
          <button
            onClick={onConnectClick}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors whitespace-nowrap shadow-sm"
          >
            Authorize Gmail
          </button>
        </div>
      )}

      {/* Currently Open Email Banner (Allows 1-click Display All Mails without needing back button) */}
      {selectedEmail && (
        <div className="bg-indigo-950/80 border-b border-indigo-700/60 px-4 py-2.5 flex items-center justify-between text-xs text-indigo-200 shadow-sm">
          <div className="flex items-center space-x-2 truncate mr-2">
            <span className="text-slate-400 font-medium hidden sm:inline">Viewing:</span>
            <span className="font-bold text-white truncate max-w-xs sm:max-w-md">{selectedEmail.subject}</span>
          </div>
          <button
            onClick={() => {
              setSelectedPriority('all');
              setSearchQuery('');
              setUnreadOnly(false);
              onSelectEmail(null);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex-shrink-0 cursor-pointer"
            title="Display all emails in the inbox"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Display All Mails ({emails.length})</span>
          </button>
        </div>
      )}

      {/* Main Inbox Header: Search & Category Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by sender, subject, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onPrioritizeAll}
              disabled={isPrioritizing || emails.length === 0}
              className="flex items-center px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold border border-indigo-500/40 transition-colors disabled:opacity-40"
              title="Classify priority using Gemini 3.8"
            >
              <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isPrioritizing ? 'animate-spin' : ''}`} />
              <span>{isPrioritizing ? 'AI Prioritizing...' : 'AI Prioritize'}</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-40"
              title="Refresh live inbox"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Priority Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => {
                setSelectedPriority('all');
                setSearchQuery('');
                setUnreadOnly(false);
                onSelectEmail(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedPriority === 'all' && !selectedEmail
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Display all emails in inbox"
            >
              All ({counts.all})
            </button>

            <button
              onClick={() => {
                setSelectedPriority('urgent');
                onSelectEmail(null);
              }}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedPriority === 'urgent' && !selectedEmail
                  ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 font-semibold'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 mr-1 text-rose-400" />
              <span>Urgent</span>
              {counts.urgent > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {counts.urgent}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setSelectedPriority('high');
                onSelectEmail(null);
              }}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedPriority === 'high' && !selectedEmail
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50 font-semibold'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              <span>High</span>
              {counts.high > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-900 font-bold">
                  {counts.high}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setSelectedPriority('normal');
                onSelectEmail(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedPriority === 'normal' && !selectedEmail
                  ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50 font-semibold'
                  : 'text-slate-400 hover:text-blue-300 hover:bg-slate-800'
              }`}
            >
              Normal ({counts.normal})
            </button>

            <button
              onClick={() => {
                setSelectedPriority('low');
                onSelectEmail(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedPriority === 'low' && !selectedEmail
                  ? 'bg-slate-700/80 text-slate-200 font-semibold'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              Low ({counts.low})
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Unread Only Switch */}
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`flex items-center px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                unreadOnly
                  ? 'bg-blue-950 text-blue-300 border-blue-700'
                  : 'text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-2 ${
                  unreadOnly ? 'bg-blue-400' : 'bg-slate-600'
                }`}
              />
              <span>Unread Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Email Master List */}
        <div
          className={`flex-1 flex flex-col overflow-y-auto divide-y divide-slate-800/80 ${
            selectedEmail ? 'hidden lg:flex lg:w-5/12 lg:max-w-md lg:border-r lg:border-slate-800' : 'w-full'
          }`}
        >
          {isLoading && emails.length === 0 ? (
            /* Loading Skeleton */
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="w-10 h-10 bg-slate-800 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-1/3" />
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !hasGmailAccess ? (
            /* Not Authorized State */
            <div className="flex flex-col items-center justify-center p-12 text-center my-auto space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 shadow-xl">
                <Inbox className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-base font-bold text-white">Gmail Account Required</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Connect your Google Workspace account to pull in real messages, triage priorities, and create smart reply suggestions.
              </p>
              <button
                onClick={onConnectClick}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Sign in & Authorize Gmail
              </button>
            </div>
          ) : filteredEmails.length === 0 ? (
            /* Empty Filter Results */
            <div className="flex flex-col items-center justify-center p-12 text-center my-auto space-y-3">
              <div className="p-3 rounded-xl bg-slate-900 text-slate-500">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Messages Found</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                {searchQuery || selectedPriority !== 'all' || unreadOnly
                  ? 'No messages match the current search or priority filter.'
                  : 'Your inbox is currently clear of messages.'}
              </p>
            </div>
          ) : (
            /* Real Email List items */
            filteredEmails.map((email) => {
              const isSelected = selectedEmail?.id === email.id;
              const pStyle = priorityBadgeStyle[email.priority];
              const dateInfo = extractDateFromEmail(email.subject, email.bodyText || email.snippet);
              const deadlineDesc = email.deadlineDescription || dateInfo.detectedDate;

              return (
                <div
                  key={email.id}
                  onClick={() => onSelectEmail(email)}
                  className={`p-4 cursor-pointer transition-colors relative flex items-start space-x-3 group ${
                    isSelected
                      ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500'
                      : 'hover:bg-slate-900/80 border-l-4 border-l-transparent'
                  } ${email.isUnread ? 'bg-slate-900/30' : ''}`}
                >
                  {/* Avatar / Sender Initial */}
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xs font-bold text-slate-300 group-hover:border-indigo-500/50">
                      {(email.fromName || email.from || 'U')[0].toUpperCase()}
                    </div>
                    {email.isUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-slate-950" />
                    )}
                  </div>

                  {/* Content snippet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs truncate max-w-[150px] sm:max-w-[180px] ${
                          email.isUnread ? 'font-bold text-white' : 'font-medium text-slate-300'
                        }`}
                      >
                        {email.fromName || email.from}
                      </span>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap ml-2">
                        {email.date}
                      </span>
                    </div>

                    <h4
                      className={`text-xs sm:text-sm truncate mt-0.5 ${
                        email.isUnread ? 'font-bold text-slate-100' : 'text-slate-300'
                      }`}
                    >
                      {email.subject}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {email.snippet}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
                      >
                        {email.priority}
                      </span>

                      {deadlineDesc && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center space-x-1"
                          title={`Deadline automatically generated: ${deadlineDesc}`}
                        >
                          <CalendarClock className="w-2.5 h-2.5 mr-1 text-amber-400" />
                          <span>Deadline: {deadlineDesc}</span>
                        </span>
                      )}

                      {email.summary && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center">
                          <Sparkles className="w-2.5 h-2.5 mr-1" />
                          Summarized
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 self-center hidden sm:block" />
                </div>
              );
            })
          )}
        </div>

        {/* Email Detail Panel (Desktop Right Pane or Mobile Full View) */}
        {selectedEmail && (
          <div className="flex-1 flex flex-col bg-slate-900 border-l border-slate-800">
            <EmailDetailView
              email={selectedEmail}
              onBack={() => onSelectEmail(null)}
              onSendReply={onSendReply}
              isSending={isSending}
              onUpdateEmailPriority={onUpdateEmailPriority}
            />
          </div>
        )}
      </div>
    </div>
  );
};
