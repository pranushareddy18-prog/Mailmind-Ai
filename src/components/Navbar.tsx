import React from 'react';
import { Mail, CalendarClock, ShieldCheck, Settings, LogIn, LogOut, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'inbox' | 'deadlines' | 'connection' | 'settings';
  setActiveTab: (tab: 'inbox' | 'deadlines' | 'connection' | 'settings') => void;
  user: User | null;
  hasGmailAccess: boolean;
  unreadCount: number;
  deadlinesCount: number;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onResetEmailView?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  hasGmailAccess,
  unreadCount,
  deadlinesCount,
  onLoginClick,
  onLogoutClick,
  onResetEmailView,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => {
              setActiveTab('inbox');
              onResetEmailView?.();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  MailMind AI
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                  <Sparkles className="w-3 h-3 mr-1 text-indigo-400" />
                  Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Smart Email Assistant</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => {
                if (activeTab === 'inbox') {
                  onResetEmailView?.();
                } else {
                  setActiveTab('inbox');
                }
              }}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Inbox – click to display all emails"
            >
              <Mail className="w-4 h-4 mr-2" />
              <span>Inbox</span>
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('deadlines')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'deadlines'
                  ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CalendarClock className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Deadlines & Reminders</span>
              <span className="md:hidden">Reminders</span>
              {deadlinesCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-slate-900">
                  {deadlinesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('connection')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'connection'
                  ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Gmail Status</span>
              <span
                className={`ml-2 w-2 h-2 rounded-full ${
                  hasGmailAccess ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
                title={hasGmailAccess ? 'Gmail Connected' : 'Gmail Connection Needed'}
              />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </nav>

          {/* User Auth Info */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-200">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {user.email}
                  </span>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold text-white">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onLogoutClick}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4 mr-1.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
