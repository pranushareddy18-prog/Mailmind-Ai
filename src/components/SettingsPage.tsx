import React, { useState } from 'react';
import {
  Settings,
  User,
  Shield,
  Unlink,
  LogOut,
  Sliders,
  FolderTree,
  Terminal,
  ChevronDown,
  ChevronUp,
  Key,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { GmailProfile } from '../types/email';

interface SettingsPageProps {
  user: FirebaseUser | null;
  profile: GmailProfile | null;
  hasGmailAccess: boolean;
  onDisconnectGmail: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  profile,
  hasGmailAccess,
  onDisconnectGmail,
  onSignOut,
}) => {
  const [autoPrioritize, setAutoPrioritize] = useState(true);
  const [defaultTone, setDefaultTone] = useState('Professional & Direct');
  const [summaryDetail, setSummaryDetail] = useState('concise');
  const [showArchDocs, setShowArchDocs] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnectGmail();
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Settings className="w-7 h-7 text-indigo-400" />
          <span>Settings & Project Configuration</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your connected Google Workspace account, assistant preferences, and explore the full-stack architecture.
        </p>
      </div>

      {/* Account & Connection Panel */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <User className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Google Account & Gmail Connection</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-12 h-12 rounded-full border border-slate-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-base font-bold text-white">
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-white">{user?.displayName || 'Signed-in User'}</div>
              <div className="text-xs text-slate-400">{user?.email || 'No email attached'}</div>
              <div className="flex items-center space-x-2 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasGmailAccess ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[11px] text-slate-400">
                  {hasGmailAccess ? 'Live Gmail Active' : 'Gmail Authorization Needed'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasGmailAccess && (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <Unlink className="w-4 h-4 mr-1.5 text-amber-400" />
                <span>Disconnect Gmail</span>
              </button>
            )}

            <button
              onClick={onSignOut}
              className="flex items-center px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800/60 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-1.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Granted Scopes Table */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Granted Google Workspace OAuth 2.0 Scopes
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <code className="text-slate-300 font-mono text-[11px]">.../auth/gmail.readonly</code>
              <span className="text-slate-500">(Read emails & metadata)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <code className="text-slate-300 font-mono text-[11px]">.../auth/gmail.send</code>
              <span className="text-slate-500">(Send user-confirmed replies)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assistant Preferences Panel */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Assistant Intelligence Preferences</h2>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-200 block">Auto-Prioritize Inbox on Load</span>
              <span className="text-slate-400">Runs batch classification for Urgent/High/Normal/Low automatically.</span>
            </div>
            <button
              onClick={() => setAutoPrioritize(!autoPrioritize)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                autoPrioritize ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  autoPrioritize ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
            <div>
              <span className="font-semibold text-slate-200 block">Default Reply Tone</span>
              <span className="text-slate-400">The primary style applied when generating draft suggestions.</span>
            </div>
            <select
              value={defaultTone}
              onChange={(e) => setDefaultTone(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none"
            >
              <option value="Professional & Direct">Professional & Direct</option>
              <option value="Warm & Friendly">Warm & Friendly</option>
              <option value="Concise Executive">Concise Executive</option>
              <option value="Detailed & Analytical">Detailed & Analytical</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
            <div>
              <span className="font-semibold text-slate-200 block">Summary Synthesis Depth</span>
              <span className="text-slate-400">Controls the level of detail generated by Gemini 3.8.</span>
            </div>
            <select
              value={summaryDetail}
              onChange={(e) => setSummaryDetail(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none"
            >
              <option value="concise">Concise TL;DR (1-2 sentences)</option>
              <option value="detailed">In-Depth Actionable Breakdown</option>
            </select>
          </div>
        </div>
      </div>

      {/* Project Architecture & How to Run Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <button
          onClick={() => setShowArchDocs(!showArchDocs)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-3">
            <FolderTree className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white">Project Structure & How to Run the App</h2>
              <p className="text-xs text-slate-400">Complete architectural breakdown, API proxy, and execution manual.</p>
            </div>
          </div>
          {showArchDocs ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showArchDocs && (
          <div className="pt-4 border-t border-slate-800 space-y-6 text-xs text-slate-300">
            {/* Overview */}
            <div>
              <h3 className="font-semibold text-white mb-1.5 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-indigo-400" />
                Architecture Overview
              </h3>
              <p className="text-slate-400 leading-relaxed">
                MailMind AI is engineered as a secure full-stack application. Client-side authentication leverages
                Firebase Auth and Google Workspace OAuth 2.0 to retrieve short-lived bearer tokens held exclusively
                in volatile memory. The Express backend serves Vite middlewares in development and isolates the
                Gemini 3.8 API key, handling prompt generation, priority classification, and deadline extraction
                without exposing AI keys or sensitive tokens to the public client bundle.
              </p>
            </div>

            {/* File Structure */}
            <div>
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <FolderTree className="w-4 h-4 mr-2 text-blue-400" />
                Core File Tree & Responsibilities
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed overflow-x-auto text-slate-300">
                <pre>{`├── server.ts                    # Express full-stack backend, Gemini 3.8 SDK proxy & Vite middleware
├── firebase-applet-config.json  # Provisioned Google Cloud & Firebase Web config
├── package.json                 # Scripts: dev (tsx server.ts), build (vite build), start
├── index.html                   # Entry point with SEO tags and viewport config
├── src/
│   ├── main.tsx                 # React DOM root mounting
│   ├── App.tsx                  # Master application controller & state coordinator
│   ├── index.css                # Tailwind CSS imports & global styles
│   ├── types/
│   │   └── email.ts             # TypeScript interfaces: EmailMessage, ReminderItem, Profile
│   ├── services/
│   │   ├── firebaseAuth.ts      # Firebase Auth, GoogleAuthProvider, In-memory token caching
│   │   ├── gmailApi.ts          # Gmail REST API: list messages, get details, send RFC 2822
│   │   └── aiApi.ts             # Client bridge to server-side Gemini 3.8 endpoints
│   └── components/
│       ├── Navbar.tsx           # App header, badge counts, and user profile
│       ├── LoginView.tsx        # Sign-in page with official Google material button
│       ├── ConnectionPage.tsx   # Live connection health, OAuth scopes, diagnostics
│       ├── InboxView.tsx        # Email list, search, priority categories (Urgent/High/Normal/Low)
│       ├── EmailDetailView.tsx  # Message reader, AI summary panel, reply composer
│       ├── ConfirmSendModal.tsx # Mandatory safety confirmation dialog before sending emails
│       ├── DeadlinesPage.tsx    # Extracted deadlines, calendar commitments, manual reminders
│       └── SettingsPage.tsx     # Disconnect controls, preferences, and this documentation`}</pre>
              </div>
            </div>

            {/* How to Run */}
            <div>
              <h3 className="font-semibold text-white mb-2 flex items-center">
                <Terminal className="w-4 h-4 mr-2 text-emerald-400" />
                How to Run the Application
              </h3>
              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="font-semibold text-emerald-300 mb-1">1. Environment Setup</div>
                  <p className="text-slate-400 mb-2">
                    Ensure <code>.env.example</code> or <code>.env</code> has your keys:
                  </p>
                  <code className="text-indigo-300 block font-mono">
                    GEMINI_API_KEY="your-google-gemini-key"<br />
                    APP_URL="http://localhost:3000"
                  </code>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="font-semibold text-emerald-300 mb-1">2. Run in Development Mode</div>
                  <p className="text-slate-400 mb-1">
                    Starts the full-stack Express server with Vite middleware on port 3000:
                  </p>
                  <code className="text-emerald-400 block font-mono bg-slate-900 p-2 rounded">
                    npm run dev
                  </code>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="font-semibold text-emerald-300 mb-1">3. Build & Run in Production</div>
                  <code className="text-emerald-400 block font-mono bg-slate-900 p-2 rounded">
                    npm run build && npm start
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
