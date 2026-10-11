import React, { useEffect } from 'react';
import { Bell, Clock, CheckCircle2, Mail, X, ArrowRight, Volume2 } from 'lucide-react';
import { ReminderItem } from '../types/email';
import { playReminderChime } from '../services/reminderNotifier';

interface ReminderAlertModalProps {
  reminder: ReminderItem | null;
  onDismiss: () => void;
  onMarkComplete: (reminderId: string) => void;
  onSnooze: (reminderId: string, minutes: number) => void;
  onViewEmail: (emailId: string) => void;
}

export const ReminderAlertModal: React.FC<ReminderAlertModalProps> = ({
  reminder,
  onDismiss,
  onMarkComplete,
  onSnooze,
  onViewEmail,
}) => {
  // Re-sound the alarm chime upon user seeing this dialog to guarantee audibility
  useEffect(() => {
    if (reminder) {
      playReminderChime(reminder.soundStyle || 'chime', 2);
    }
  }, [reminder?.id]);

  if (!reminder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-amber-500/20 text-white space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header with pulsing alarm bell */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-bounce">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                Reminder Alert Now
              </span>
              <h2 className="text-lg font-bold text-white mt-1">Scheduled Time Reached</h2>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Details Card */}
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
          <h3 className="text-base font-bold text-white leading-snug">{reminder.title}</h3>

          <div className="flex items-center space-x-2 text-xs text-amber-300 font-semibold">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Due at: {reminder.dueDate}</span>
          </div>

          {reminder.emailSubject && (
            <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-1.5 truncate max-w-[240px]">
                <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate">{reminder.emailSubject}</span>
              </div>
              {reminder.emailId && (
                <button
                  onClick={() => onViewEmail(reminder.emailId)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold text-[11px] flex items-center ml-2 flex-shrink-0"
                >
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => playReminderChime(reminder.soundStyle || 'chime', 2)}
              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors flex items-center justify-center space-x-1"
              title="Play alarm sound again"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Ring Sound</span>
            </button>
            <button
              onClick={() => onSnooze(reminder.id, 5)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors flex-1 sm:flex-none text-center"
            >
              Snooze 5m
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium hover:bg-slate-800 transition-colors flex-1 sm:flex-none text-center"
            >
              Dismiss
            </button>
          </div>

          <button
            onClick={() => onMarkComplete(reminder.id)}
            className="flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span>Mark Complete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
