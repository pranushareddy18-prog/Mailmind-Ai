import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { ConnectionPage } from './components/ConnectionPage';
import { InboxView } from './components/InboxView';
import { DeadlinesPage } from './components/DeadlinesPage';
import { SettingsPage } from './components/SettingsPage';
import { ReminderAlertModal } from './components/ReminderAlertModal';
import { EmailMessage, GmailProfile, PriorityLevel, ReminderItem } from './types/email';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setAccessToken,
} from './services/firebaseAuth';
import {
  getGmailProfile,
  listGmailMessages,
  batchFetchMessages,
  sendGmailMessage,
} from './services/gmailApi';
import { fetchBatchPriorities, fetchAiDeadlines } from './services/aiApi';
import { extractDateFromEmail } from './services/dateExtractor';
import {
  playReminderChime,
  triggerDesktopNotification,
  parseTargetTimestamp,
} from './services/reminderNotifier';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'deadlines' | 'connection' | 'settings'>('inbox');
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setTokenState] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Email and Profile State
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isEmailsLoading, setIsEmailsLoading] = useState<boolean>(false);
  const [isPrioritizing, setIsPrioritizing] = useState<boolean>(false);
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  // Deadlines and Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [isDeadlinesLoading, setIsDeadlinesLoading] = useState<boolean>(false);
  const [activeAlarmReminder, setActiveAlarmReminder] = useState<ReminderItem | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const hasGmailAccess = Boolean(user && accessToken);

  // 1-second interval to check if any scheduled reminder alarm has arrived
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setReminders((prevReminders) => {
        let alarmToTrigger: ReminderItem | null = null;

        const updated = prevReminders.map((r) => {
          if (!r.completed && !r.notified && r.targetTimestamp && r.targetTimestamp <= now) {
            alarmToTrigger = r;
            return { ...r, notified: true };
          }
          return r;
        });

        if (alarmToTrigger) {
          const item = alarmToTrigger as ReminderItem;
          // 1. Play audible alert sound with item's sound preference and triple repeats
          playReminderChime(item.soundStyle || 'chime', 3);

          // 2. Trigger browser system desktop notification
          triggerDesktopNotification(item.title, {
            body: `Scheduled reminder reached right now (${item.dueDate})!`,
          });

          // 3. Open in-app alert modal
          setActiveAlarmReminder(item);

          // 4. Send email message to user's connected account if option enabled
          if (item.sendEmailNotification && accessToken && user?.email) {
            sendGmailMessage(accessToken, {
              to: user.email,
              subject: `⏰ MailMind Reminder: ${item.title}`,
              body: `Hello,\n\nThis is your scheduled MailMind AI reminder notification.\n\nTask: ${item.title}\nDue: ${item.dueDate}\n\nTriggered at ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}.\n\n---\nMailMind AI Smart Email Assistant`,
            })
              .then(() => {
                showToast(`⏰ Reminder message sent to ${user?.email} for "${item.title}"`);
              })
              .catch((err) => {
                console.warn('Failed to send reminder email notification:', err);
              });
          } else {
            showToast(`⏰ Reminder reached: "${item.title}" (${item.dueDate})`);
          }
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [accessToken, user?.email]);

  // Load emails and profile for the authenticated session
  const loadGmailData = useCallback(async (token: string) => {
    setIsEmailsLoading(true);
    try {
      // 1. Fetch Profile
      const prof = await getGmailProfile(token);
      setProfile(prof);

      // 2. Fetch list of latest 15 message IDs
      const { messageIds } = await listGmailMessages(token, { maxResults: 15 });
      if (messageIds.length === 0) {
        setEmails([]);
        setIsEmailsLoading(false);
        return;
      }

      // 3. Batch fetch details
      const fetchedEmails = await batchFetchMessages(token, messageIds);

      // 4. Automatically detect dates and generate deadlines immediately
      const autoReminders: ReminderItem[] = [];
      const enrichedEmails = fetchedEmails.map((em) => {
        const dateInfo = extractDateFromEmail(em.subject, em.bodyText || em.snippet);
        if (dateInfo.hasDate && dateInfo.detectedDate) {
          const targetTimestamp = parseTargetTimestamp(dateInfo.detectedDate);
          autoReminders.push({
            id: `auto-date-${em.id}`,
            emailId: em.id,
            emailSubject: em.subject,
            from: em.fromName || em.from,
            title: dateInfo.taskTitle || `Action: ${em.subject}`,
            dueDate: dateInfo.detectedDate,
            targetTimestamp,
            urgency: dateInfo.urgency,
            type: dateInfo.type,
            completed: false,
            notified: false,
            sendEmailNotification: true,
            createdAt: em.timestamp || Date.now(),
          });
          return {
            ...em,
            hasDeadline: true,
            deadlineDescription: dateInfo.detectedDate,
            priority: em.priority === 'normal' && (dateInfo.urgency === 'urgent' || dateInfo.urgency === 'high')
              ? dateInfo.urgency
              : em.priority,
            priorityReason: `Deadline automatically generated: ${dateInfo.detectedDate}`,
          };
        }
        return em;
      });

      setEmails(enrichedEmails);

      if (autoReminders.length > 0) {
        setReminders((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const toAdd = autoReminders.filter((r) => !existingIds.has(r.id));
          return [...prev, ...toAdd];
        });
      }

      // 5. Background AI prioritization & deeper deadline extraction
      if (enrichedEmails.length > 0) {
        setIsPrioritizing(true);
        fetchBatchPriorities(enrichedEmails)
          .then((priorities) => {
            setEmails((prev) =>
              prev.map((em) => {
                const p = priorities[em.id];
                if (p) {
                  return {
                    ...em,
                    priority: (p.priority as PriorityLevel) || em.priority,
                    priorityReason: p.reason || em.priorityReason,
                    hasDeadline: p.hasDeadline || em.hasDeadline,
                    deadlineDescription: p.deadlineDescription || em.deadlineDescription,
                  };
                }
                return em;
              })
            );
          })
          .catch(() => {})
          .finally(() => setIsPrioritizing(false));

        fetchAiDeadlines(enrichedEmails)
          .then((extracted) => {
            if (extracted.length > 0) {
              setReminders((prev) => {
                const existingIds = new Set(prev.map((r) => r.id));
                const newItems = extracted.filter((r) => !existingIds.has(r.id));
                return [...prev, ...newItems];
              });
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed to load Gmail data:', err);
      if (err.message?.includes('AUTH_EXPIRED') || err.message?.includes('401')) {
        setTokenState(null);
        setAccessToken(null);
        showToast('Google OAuth token expired. Please reconnect Gmail.', 'error');
      } else {
        showToast(err.message || 'Error fetching Gmail messages', 'error');
      }
    } finally {
      setIsEmailsLoading(false);
    }
  }, []);

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setTokenState(token);
          loadGmailData(token);
        }
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setTokenState(null);
        setProfile(null);
        setEmails([]);
        setSelectedEmail(null);
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, [loadGmailData]);

  // Google Sign In & Scope Request
  const handleSignIn = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setTokenState(result.accessToken);
      showToast(`Connected successfully as ${result.user.email}!`);
      await loadGmailData(result.accessToken);
      setActiveTab('inbox');
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setAuthError(err.message || 'Google Sign-in failed');
      showToast(err.message || 'Sign in was cancelled or failed.', 'error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Disconnect Gmail (clears in-memory token while keeping session or resetting)
  const handleDisconnectGmail = async () => {
    setTokenState(null);
    setAccessToken(null);
    setEmails([]);
    setSelectedEmail(null);
    setProfile(null);
    showToast('Gmail disconnected and access token cleared from memory.');
    setActiveTab('connection');
  };

  // Full Sign Out
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setTokenState(null);
    setProfile(null);
    setEmails([]);
    setSelectedEmail(null);
    setReminders([]);
    showToast('Signed out of Google account.');
    setActiveTab('inbox');
  };

  // Test Connection Ping
  const handleTestPing = async () => {
    if (!accessToken) throw new Error('No active in-memory access token.');
    const prof = await getGmailProfile(accessToken);
    setProfile(prof);
  };

  // Refresh Inbox
  const handleRefreshInbox = async () => {
    if (!accessToken) {
      showToast('Please connect Gmail to refresh inbox.', 'error');
      setActiveTab('connection');
      return;
    }
    await loadGmailData(accessToken);
    showToast('Inbox refreshed with latest messages.');
  };

  // AI Prioritize All Current Emails
  const handlePrioritizeAll = async () => {
    if (emails.length === 0) return;
    setIsPrioritizing(true);
    try {
      const priorities = await fetchBatchPriorities(emails);
      setEmails((prev) =>
        prev.map((em) => {
          const p = priorities[em.id];
          if (p) {
            return {
              ...em,
              priority: (p.priority as PriorityLevel) || em.priority,
              priorityReason: p.reason || em.priorityReason,
              hasDeadline: p.hasDeadline || em.hasDeadline,
              deadlineDescription: p.deadlineDescription || em.deadlineDescription,
            };
          }
          return em;
        })
      );
      showToast('Emails prioritized!');
    } catch {
      showToast('Completed priority check.');
    } finally {
      setIsPrioritizing(false);
    }
  };

  // Scan Inbox for Deadlines
  const handleScanDeadlines = async () => {
    if (emails.length === 0) {
      showToast('No emails loaded to scan.', 'error');
      return;
    }
    setIsDeadlinesLoading(true);
    try {
      const extracted = await fetchAiDeadlines(emails);
      if (extracted.length === 0) {
        showToast('No upcoming deadlines detected in current emails.');
      } else {
        setReminders((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newItems = extracted.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newItems];
        });
        showToast(`Deadlines automatically generated: ${extracted.length} items found.`);
      }
    } catch {
      showToast('Completed deadline scan with auto-detection.');
    } finally {
      setIsDeadlinesLoading(false);
    }
  };

  // Send Reply via Gmail API
  const handleSendReply = async (params: {
    to: string;
    subject: string;
    body: string;
    inReplyTo: string;
    threadId: string;
  }) => {
    if (!accessToken) {
      showToast('Gmail authorization required to send emails.', 'error');
      return;
    }
    setIsSendingReply(true);
    try {
      await sendGmailMessage(accessToken, {
        to: params.to,
        subject: params.subject,
        body: params.body,
        inReplyTo: params.inReplyTo,
        threadId: params.threadId,
      });
      showToast(`Reply sent successfully to ${params.to}!`);
    } catch (err: any) {
      console.error('Failed to send reply:', err);
      showToast(`Failed to send email: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsSendingReply(false);
    }
  };

  // Toggle Reminder completion
  const handleToggleReminderComplete = (reminderId: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, completed: !r.completed } : r))
    );
  };

  // Snooze reminder
  const handleSnoozeReminder = (reminderId: string, minutes: number) => {
    const snoozeTimestamp = Date.now() + minutes * 60 * 1000;
    const snoozeTimeFormatted = new Date(snoozeTimestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId
          ? {
              ...r,
              targetTimestamp: snoozeTimestamp,
              dueDate: `Snoozed until ${snoozeTimeFormatted}`,
              notified: false,
            }
          : r
      )
    );
    setActiveAlarmReminder(null);
    showToast(`Reminder snoozed for ${minutes} minutes.`);
  };

  // Trigger test alarm immediately
  const handleTriggerTestAlarm = (reminder: ReminderItem) => {
    playReminderChime(reminder.soundStyle || 'chime', 2);
    triggerDesktopNotification(reminder.title, {
      body: `Test reminder alert at ${reminder.dueDate}!`,
    });
    setActiveAlarmReminder(reminder);
  };

  // Select email by ID (e.g., from Deadlines link)
  const handleSelectEmailById = (emailId: string) => {
    const target = emails.find((e) => e.id === emailId);
    if (target) {
      setSelectedEmail(target);
      setActiveTab('inbox');
    } else {
      showToast('Email not found in current inbox cache.', 'error');
    }
  };

  // Update email priority manually
  const handleUpdateEmailPriority = (emailId: string, priority: PriorityLevel) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, priority } : e))
    );
    if (selectedEmail && selectedEmail.id === emailId) {
      setSelectedEmail((prev) => (prev ? { ...prev, priority } : null));
    }
    showToast(`Updated priority to ${priority.toUpperCase()}`);
  };

  // Counts for Navbar
  const unreadCount = emails.filter((e) => e.isUnread).length;
  const pendingDeadlinesCount = reminders.filter((r) => !r.completed).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl flex items-center space-x-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 border ${
            toast.type === 'success'
              ? 'bg-slate-900 border-emerald-500/80 text-emerald-200'
              : 'bg-slate-900 border-rose-500/80 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        hasGmailAccess={hasGmailAccess}
        unreadCount={unreadCount}
        deadlinesCount={pendingDeadlinesCount}
        onLoginClick={handleSignIn}
        onLogoutClick={handleSignOut}
        onResetEmailView={() => setSelectedEmail(null)}
      />

      {/* View Switcher */}
      <main className="flex-1 flex flex-col">
        {!user && activeTab === 'inbox' ? (
          <LoginView
            onSignIn={handleSignIn}
            isLoading={isAuthLoading}
            errorMessage={authError}
          />
        ) : activeTab === 'inbox' ? (
          <InboxView
            emails={emails}
            selectedEmail={selectedEmail}
            onSelectEmail={setSelectedEmail}
            isLoading={isEmailsLoading}
            isPrioritizing={isPrioritizing}
            hasGmailAccess={hasGmailAccess}
            onRefresh={handleRefreshInbox}
            onPrioritizeAll={handlePrioritizeAll}
            onConnectClick={handleSignIn}
            onSendReply={handleSendReply}
            isSending={isSendingReply}
            onUpdateEmailPriority={handleUpdateEmailPriority}
          />
        ) : activeTab === 'deadlines' ? (
          <DeadlinesPage
            reminders={reminders}
            emails={emails}
            isLoading={isDeadlinesLoading}
            onScanDeadlines={handleScanDeadlines}
            onToggleComplete={handleToggleReminderComplete}
            onSelectEmailById={handleSelectEmailById}
            onAddCustomReminder={(item) => setReminders((prev) => [item, ...prev])}
            onDeleteReminder={(id) => setReminders((prev) => prev.filter((r) => r.id !== id))}
            onTriggerTestAlarm={handleTriggerTestAlarm}
          />
        ) : activeTab === 'connection' ? (
          <ConnectionPage
            user={user}
            hasGmailAccess={hasGmailAccess}
            accessToken={accessToken}
            profile={profile}
            isLoading={isEmailsLoading}
            onConnectGmail={handleSignIn}
            onDisconnectGmail={handleDisconnectGmail}
            onTestPing={handleTestPing}
          />
        ) : (
          <SettingsPage
            user={user}
            profile={profile}
            hasGmailAccess={hasGmailAccess}
            onDisconnectGmail={handleDisconnectGmail}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Real-time Reminder Alarm Popup */}
      <ReminderAlertModal
        reminder={activeAlarmReminder}
        onDismiss={() => setActiveAlarmReminder(null)}
        onMarkComplete={(id) => {
          handleToggleReminderComplete(id);
          setActiveAlarmReminder(null);
        }}
        onSnooze={handleSnoozeReminder}
        onViewEmail={(emailId) => {
          setActiveAlarmReminder(null);
          handleSelectEmailById(emailId);
        }}
      />
    </div>
  );
}
