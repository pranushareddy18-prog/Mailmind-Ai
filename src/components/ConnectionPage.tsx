import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  Mail,
  Cpu,
  Lock,
  ExternalLink,
  Unlink,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GmailProfile } from '../types/email';

interface ConnectionPageProps {
  user: User | null;
  hasGmailAccess: boolean;
  accessToken: string | null;
  profile: GmailProfile | null;
  isLoading: boolean;
  onConnectGmail: () => Promise<void>;
  onDisconnectGmail: () => Promise<void>;
  onTestPing: () => Promise<void>;
}

export const ConnectionPage: React.FC<ConnectionPageProps> = ({
  user,
  hasGmailAccess,
  accessToken,
  profile,
  isLoading,
  onConnectGmail,
  onDisconnectGmail,
  onTestPing,
}) => {
  const [pingSuccess, setPingSuccess] = useState<boolean | null>(null);
  const [pingMessage, setPingMessage] = useState<string>('');

  const handlePing = async () => {
    try {
      setPingMessage('Pinging Gmail API profile endpoint...');
      await onTestPing();
      setPingSuccess(true);
      setPingMessage('Live Gmail connection verified successfully!');
      setTimeout(() => setPingSuccess(null), 4000);
    } catch (err: any) {
      setPingSuccess(false);
      setPingMessage(err.message || 'Verification ping failed.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
          <ShieldCheck className="w-7 h-7 text-indigo-400" />
          <span>Gmail Integration & Security Status</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Monitor your live Google Workspace connection health, OAuth 2.0 permission grants, and server-side AI runtime.
        </p>
      </div>

      {/* Main Status Hero Card */}
      <div
        className={`p-6 rounded-2xl border ${
          hasGmailAccess && user
            ? 'bg-emerald-950/20 border-emerald-800/60'
            : 'bg-amber-950/20 border-amber-800/60'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div
              className={`p-3 rounded-xl ${
                hasGmailAccess && user
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {hasGmailAccess && user ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-white">
                  {hasGmailAccess && user
                    ? 'Gmail Connected & Active'
                    : user
                    ? 'Gmail Token Expired or Missing Scope'
                    : 'Not Connected to Google Account'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    hasGmailAccess && user
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {hasGmailAccess && user ? 'ONLINE' : 'ACTION REQUIRED'}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                {hasGmailAccess && user
                  ? `Live session established with ${user.email}. MailMind AI is actively authorized to synchronize your inbox and generate AI summaries.`
                  : user
                  ? 'Your Google authentication is signed in, but the live Gmail access token is currently not cached in memory. Click "Reconnect Gmail" to restore access.'
                  : 'You have not connected a Google Workspace account yet. Please sign in to allow MailMind AI to inspect your inbox.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasGmailAccess && user ? (
              <>
                <button
                  onClick={handlePing}
                  disabled={isLoading}
                  className="flex items-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
                <button
                  onClick={onDisconnectGmail}
                  disabled={isLoading}
                  className="flex items-center px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-sm font-medium border border-rose-800/60 transition-colors"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <button
                onClick={onConnectGmail}
                disabled={isLoading}
                className="flex items-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                <span>{user ? 'Reconnect Gmail' : 'Sign in & Connect Gmail'}</span>
              </button>
            )}
          </div>
        </div>

        {pingMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center space-x-2 ${
              pingSuccess === true
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                : pingSuccess === false
                ? 'bg-rose-950/60 border border-rose-800 text-rose-200'
                : 'bg-slate-800 border border-slate-700 text-slate-300'
            }`}
          >
            <span>{pingMessage}</span>
          </div>
        )}
      </div>

      {/* Grid of Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Google Identity */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-300">
              <Mail className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-sm">Google User Identity</h3>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${user ? 'bg-emerald-400' : 'bg-slate-600'}`}
            />
          </div>
          <div className="text-xs space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>Account:</span>
              <span className="font-medium text-slate-200">{user?.email || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span>Display Name:</span>
              <span className="font-medium text-slate-200">{user?.displayName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Auth Provider:</span>
              <span className="font-medium text-slate-200">Google OAuth 2.0</span>
            </div>
          </div>
        </div>

        {/* Card 2: Gmail Read Scope */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-300">
              <Lock className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-sm">gmail.readonly Scope</h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                hasGmailAccess
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {hasGmailAccess ? 'GRANTED' : 'PENDING'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Allows the assistant to list inbox threads, parse message headers, and read body content for AI summarization.
          </p>
        </div>

        {/* Card 3: Gmail Send Scope */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-300">
              <Mail className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold text-sm">gmail.send Scope</h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                hasGmailAccess
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {hasGmailAccess ? 'GRANTED' : 'PENDING'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Allows sending drafted replies with explicit user confirmation. No automated unattended sending.
          </p>
        </div>

        {/* Card 4: In-Memory Token Safety */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-300">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-sm">Token Memory Cache</h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                accessToken
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {accessToken ? 'IN-MEMORY ACTIVE' : 'NO ACTIVE TOKEN'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Per security guidelines, tokens are kept purely in volatile memory and never persisted into localStorage.
          </p>
        </div>

        {/* Card 5: Gemini 3.8 AI Engine */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-300">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-sm">Gemini 3.8 AI Engine</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-800">
              SERVER PROXY
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Backend runs <code>gemini-3.8-flash</code> via <code>@google/genai</code>. Keeps API credentials isolated on the server.
          </p>
        </div>

        {/* Card 6: Mailbox Metadata */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-300">
              <Mail className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-sm">Live Mailbox Volume</h3>
            </div>
          </div>
          <div className="text-xs space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>Mailbox Address:</span>
              <span className="font-medium text-slate-200 truncate max-w-[150px]">
                {profile?.emailAddress || user?.email || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Messages:</span>
              <span className="font-medium text-slate-200">
                {profile?.messagesTotal?.toLocaleString() || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Threads:</span>
              <span className="font-medium text-slate-200">
                {profile?.threadsTotal?.toLocaleString() || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Architecture Note */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
          <Lock className="w-4 h-4 mr-2 text-indigo-400" />
          How MailMind AI Protects Your Mailbox
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          MailMind AI uses the official Google Workspace OAuth 2.0 flow. Your password is never entered or seen by this application.
          When you authorize, Google issues a scoped access token directly to your browser session. All messages requested for summarization
          are processed in real time and are not permanently stored on any secondary database. Outbound actions always prompt for user confirmation.
        </p>
      </div>
    </div>
  );
};
