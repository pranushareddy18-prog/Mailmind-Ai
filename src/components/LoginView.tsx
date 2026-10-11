import React from 'react';
import { Mail, Sparkles, Shield, Zap, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSignIn,
  isLoading,
  errorMessage,
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-indigo-500/20 mb-4 ring-1 ring-white/20">
          <Mail className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          MailMind AI
        </h1>
        <p className="mt-2 text-base text-slate-400">
          Executive Smart Email Assistant powered by Gmail & Gemini 3.8
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
          {/* Sign In CTA Box */}
          <div className="text-center pb-8 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-slate-100 mb-2">
              Connect Your Google Workspace Account
            </h2>
            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
              Authorize MailMind AI to securely read your inbox, categorize priorities, extract actionable deadlines, and generate smart reply suggestions.
            </p>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs text-left">
                <div className="font-semibold mb-1 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-rose-400 mr-2" />
                  Authentication Notice
                </div>
                {errorMessage}
              </div>
            )}

            {/* Official Google Material Sign-In Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onSignIn}
                disabled={isLoading}
                className="group relative inline-flex items-center justify-center px-6 py-3 border border-slate-700 hover:border-slate-500 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to Google...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      viewBox="0 0 48 48"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span className="font-semibold text-slate-800">Sign in with Google</span>
                  </div>
                )}
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Uses OAuth 2.0. Scopes: <code className="text-slate-400">gmail.readonly</code> & <code className="text-slate-400">gmail.send</code>
            </p>
          </div>

          {/* Highlights & Security Principles */}
          <div className="pt-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Enterprise Grade Intelligence & Privacy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center space-x-2 text-indigo-400 font-medium text-sm mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Gemini 3.8 Triage</span>
                </div>
                <p className="text-xs text-slate-400">
                  Classifies incoming mail into Urgent, High, Normal, and Low priority with reason tags.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center space-x-2 text-blue-400 font-medium text-sm mb-1">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span>Executive Summaries</span>
                </div>
                <p className="text-xs text-slate-400">
                  Instant TL;DR, extracted action items, and 1-click tailored reply suggestions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center space-x-2 text-amber-400 font-medium text-sm mb-1">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Deadline Tracking</span>
                </div>
                <p className="text-xs text-slate-400">
                  Automatically extracts meeting requests, task deadlines, and upcoming commitments.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
                <div className="flex items-center space-x-2 text-emerald-400 font-medium text-sm mb-1">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Strict Safety Model</span>
                </div>
                <p className="text-xs text-slate-400">
                  Zero stored mail credentials on disk. All outbound email requires explicit user confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
