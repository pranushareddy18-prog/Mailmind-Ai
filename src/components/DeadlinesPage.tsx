import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Mail,
  Plus,
  AlertCircle,
  Calendar,
  X,
  Trash2,
  Bell,
  BellRing,
  Volume2,
} from 'lucide-react';
import { EmailMessage, PriorityLevel, ReminderItem } from '../types/email';
import {
  parseTargetTimestamp,
  formatReminderDueDate,
  requestNotificationPermission,
  playReminderChime,
  ReminderSoundStyle,
} from '../services/reminderNotifier';

interface DeadlinesPageProps {
  reminders: ReminderItem[];
  emails: EmailMessage[];
  isLoading: boolean;
  onScanDeadlines: () => Promise<void>;
  onToggleComplete: (reminderId: string) => void;
  onSelectEmailById: (emailId: string) => void;
  onAddCustomReminder: (reminder: ReminderItem) => void;
  onDeleteReminder: (reminderId: string) => void;
  onTriggerTestAlarm: (reminder: ReminderItem) => void;
}

export const DeadlinesPage: React.FC<DeadlinesPageProps> = ({
  reminders,
  emails,
  isLoading,
  onScanDeadlines,
  onToggleComplete,
  onSelectEmailById,
  onAddCustomReminder,
  onDeleteReminder,
  onTriggerTestAlarm,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasNotificationPerm, setHasNotificationPerm] = useState<boolean>(true);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [newTime, setNewTime] = useState('03:15');
  const [newAmPm, setNewAmPm] = useState<'AM' | 'PM'>('AM');
  const [newUrgency, setNewUrgency] = useState<PriorityLevel>('high');
  const [newType, setNewType] = useState<'deadline' | 'meeting' | 'task' | 'followup'>('task');
  const [selectedEmailId, setSelectedEmailId] = useState<string>('');
  const [sendEmailNotification, setSendEmailNotification] = useState<boolean>(true);
  const [newSoundStyle, setNewSoundStyle] = useState<ReminderSoundStyle>('chime');

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasNotificationPerm(Notification.permission === 'granted');
    }
  }, []);

  const handleRequestPerm = async () => {
    const granted = await requestNotificationPermission();
    setHasNotificationPerm(granted);
    if (granted) {
      playReminderChime();
    }
  };

  const filteredReminders = reminders.filter((r) => {
    if (filter === 'pending') return !r.completed;
    if (filter === 'completed') return r.completed;
    return true;
  });

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const timeFormatted = `${newTime} ${newAmPm}`;
    const targetTimestamp = parseTargetTimestamp(newDueDate, timeFormatted);
    const formattedDueDate = formatReminderDueDate(targetTimestamp);
    const linkedEmail = emails.find((m) => m.id === selectedEmailId);

    const item: ReminderItem = {
      id: `custom-${Date.now()}`,
      emailId: selectedEmailId || '',
      emailSubject: linkedEmail?.subject || 'Manual Task Entry',
      from: linkedEmail?.fromName || 'Self',
      title: newTitle.trim(),
      dueDate: formattedDueDate,
      targetTimestamp,
      urgency: newUrgency,
      type: newType,
      completed: false,
      notified: false,
      sendEmailNotification,
      soundStyle: newSoundStyle,
      createdAt: Date.now(),
    };

    onAddCustomReminder(item);
    setNewTitle('');
    setSelectedEmailId('');
    setIsModalOpen(false);
  };

  // Quick preset helper
  const handleQuickPreset = (type: '10sec' | '1min' | '315am' | '315pm' | '15min') => {
    const now = new Date();
    if (type === '10sec') {
      const tenSecAhead = new Date(now.getTime() + 10000);
      setNewDueDate(tenSecAhead.toISOString().split('T')[0]);
      const h = tenSecAhead.getHours();
      const m = tenSecAhead.getMinutes();
      const isPm = h >= 12;
      const h12 = h % 12 || 12;
      setNewTime(`${h12 < 10 ? '0' : ''}${h12}:${m < 10 ? '0' : ''}${m}`);
      setNewAmPm(isPm ? 'PM' : 'AM');
    } else if (type === '1min') {
      const oneMinAhead = new Date(now.getTime() + 60000);
      setNewDueDate(oneMinAhead.toISOString().split('T')[0]);
      const h = oneMinAhead.getHours();
      const m = oneMinAhead.getMinutes();
      const isPm = h >= 12;
      const h12 = h % 12 || 12;
      setNewTime(`${h12 < 10 ? '0' : ''}${h12}:${m < 10 ? '0' : ''}${m}`);
      setNewAmPm(isPm ? 'PM' : 'AM');
    } else if (type === '315am') {
      // If 3:15 AM has passed today, schedule for tomorrow's date!
      const isPast315AmToday = now.getHours() > 3 || (now.getHours() === 3 && now.getMinutes() >= 15);
      const targetDate = new Date(now);
      if (isPast315AmToday) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      setNewDueDate(targetDate.toISOString().split('T')[0]);
      setNewTime('03:15');
      setNewAmPm('AM');
    } else if (type === '315pm') {
      // If 3:15 PM has passed today, schedule for tomorrow's date!
      const isPast315PmToday = now.getHours() > 15 || (now.getHours() === 15 && now.getMinutes() >= 15);
      const targetDate = new Date(now);
      if (isPast315PmToday) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      setNewDueDate(targetDate.toISOString().split('T')[0]);
      setNewTime('03:15');
      setNewAmPm('PM');
    } else if (type === '15min') {
      const fifteenAhead = new Date(now.getTime() + 15 * 60000);
      setNewDueDate(fifteenAhead.toISOString().split('T')[0]);
      const h = fifteenAhead.getHours();
      const m = fifteenAhead.getMinutes();
      const isPm = h >= 12;
      const h12 = h % 12 || 12;
      setNewTime(`${h12 < 10 ? '0' : ''}${h12}:${m < 10 ? '0' : ''}${m}`);
      setNewAmPm(isPm ? 'PM' : 'AM');
    }
  };

  const urgencyBadgeStyle: Record<PriorityLevel, string> = {
    urgent: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    high: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    normal: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    low: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <CalendarClock className="w-7 h-7 text-amber-400" />
            <span>Reminders & Scheduled Alarms</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Keep reminders with exact alarm times (e.g. 3:15 AM). The app sounds a chime, shows a desktop alert, and delivers a message at the scheduled time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => playReminderChime('chime', 2)}
            className="flex items-center px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 text-xs font-semibold shadow-sm transition-all"
            title="Test the reminder alarm chime sound right now"
          >
            <Volume2 className="w-4 h-4 mr-1.5 text-amber-400" />
            <span>Test Alarm Sound</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Set Reminder</span>
          </button>

          <button
            onClick={onScanDeadlines}
            disabled={isLoading || emails.length === 0}
            className="flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Scanning Mailbox...' : 'Scan Inbox with Gemini'}</span>
          </button>
        </div>
      </div>

      {/* Browser Notification Banner if not yet enabled */}
      {!hasNotificationPerm && (
        <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-indigo-200 text-xs">
          <div className="flex items-center space-x-2.5">
            <BellRing className="w-5 h-5 text-indigo-400 flex-shrink-0 animate-pulse" />
            <span>
              <strong>Enable Browser Alerts:</strong> Allow notifications so MailMind AI can ring the alarm and display popup alerts at your exact reminder time (e.g. 3:15 AM).
            </span>
          </div>
          <button
            onClick={handleRequestPerm}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex-shrink-0"
          >
            Enable Audio & Popups
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'pending'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Active Alarms & Tasks ({reminders.filter((r) => !r.completed).length})
        </button>

        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'completed'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Completed ({reminders.filter((r) => r.completed).length})
        </button>

        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Reminders ({reminders.length})
        </button>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-800 inline-block text-slate-500">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">
            {filter === 'completed' ? 'No Completed Reminders Yet' : 'No Active Alarms Scheduled'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click "Set Reminder" above to schedule an alert for any exact time (e.g. 3:15 AM). The app will chime and message you right on schedule!
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>Set Reminder for 3:15 AM</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReminders.map((reminder) => {
            const urgencyClass = urgencyBadgeStyle[reminder.urgency] || urgencyBadgeStyle.normal;

            return (
              <div
                key={reminder.id}
                className={`p-5 rounded-2xl border transition-all ${
                  reminder.completed
                    ? 'bg-slate-900/30 border-slate-800/60 opacity-60'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-lg shadow-black/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => onToggleComplete(reminder.id)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                      title={reminder.completed ? 'Mark pending' : 'Mark completed'}
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 hover:text-white" />
                      )}
                    </button>
                    <div>
                      <h3
                        className={`text-sm font-bold text-white ${
                          reminder.completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {reminder.title}
                      </h3>

                      <div className="flex items-center space-x-2 text-xs text-amber-300 font-semibold mt-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Scheduled for: {reminder.dueDate}</span>
                      </div>

                      {reminder.notified && !reminder.completed && (
                        <span className="inline-flex items-center text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 mt-1">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Alert Triggered at Scheduled Time
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onTriggerTestAlarm(reminder)}
                      className="flex items-center space-x-1 px-2 py-1 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800 text-[11px] font-semibold border border-slate-700 transition-colors"
                      title="Play alarm sound and test popup now"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="capitalize">{reminder.soundStyle || 'Chime'}</span>
                    </button>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${urgencyClass}`}
                    >
                      {reminder.urgency}
                    </span>

                    <button
                      onClick={() => onDeleteReminder(reminder.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Email context metadata */}
                {reminder.emailSubject && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center space-x-1.5 truncate max-w-[260px]">
                      <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{reminder.emailSubject}</span>
                    </div>

                    {reminder.emailId && (
                      <button
                        onClick={() => onSelectEmailById(reminder.emailId)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold whitespace-nowrap text-[11px]"
                      >
                        View Email →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Reminder Modal with exact Time & Alarm picker */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <span>Set Scheduled Alarm Reminder</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('315am')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
                >
                  3:15 AM
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('315pm')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
                >
                  3:15 PM
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('1min')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
                >
                  In 1 Min
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('15min')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
                >
                  In 15 Min
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('10sec')}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors"
                >
                  In 10 sec (Test Alarm)
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Check client email response"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Exact Time & Date Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Alarm Time (HH:MM)</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      required
                      placeholder="03:15"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-center font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={newAmPm}
                      onChange={(e) => setNewAmPm(e.target.value as 'AM' | 'PM')}
                      className="px-2 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Urgency</label>
                  <select
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Category</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  >
                    <option value="task">Action Item</option>
                    <option value="deadline">Project Deadline</option>
                    <option value="meeting">Meeting / Call</option>
                    <option value="followup">Follow-up</option>
                  </select>
                </div>
              </div>

              {emails.length > 0 && (
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Link to Email (Optional)</label>
                  <select
                    value={selectedEmailId}
                    onChange={(e) => setSelectedEmailId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none truncate"
                  >
                    <option value="">None (Standalone Task)</option>
                    {emails.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.subject} ({e.fromName || e.from})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Alarm Sound Tone Selection with Listen/Preview button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Alarm Sound Alert Tone</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => playReminderChime(newSoundStyle, 2)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
                  >
                    <span>Play Tone Preview</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'chime', label: 'Rich Chime' },
                      { id: 'alarm', label: 'Double Alarm' },
                      { id: 'bell', label: 'Church Bell' },
                      { id: 'ping', label: 'Metallic Ping' },
                    ] as const
                  ).map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => {
                        setNewSoundStyle(tone.id);
                        playReminderChime(tone.id, 1);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                        newSoundStyle === tone.id
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery notification options */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span>Send me an email message alert when the reminder triggers</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 shadow-md"
                >
                  Save Reminder Alarm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
