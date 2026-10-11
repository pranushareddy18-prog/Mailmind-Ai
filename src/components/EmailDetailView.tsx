import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Reply,
  CheckCircle,
  Clock,
  Tag,
  Calendar,
  CalendarClock,
  AlertCircle,
  Copy,
  Check,
  Wand2,
  CornerDownRight,
  UserCheck,
  X,
  Inbox,
} from 'lucide-react';
import { EmailMessage, PriorityLevel, ReplySuggestion } from '../types/email';
import { fetchAiSummary, fetchAiReplySuggestions } from '../services/aiApi';
import { extractDateFromEmail } from '../services/dateExtractor';
import { ConfirmSendModal } from './ConfirmSendModal';

interface EmailDetailViewProps {
  email: EmailMessage;
  onBack: () => void;
  onSendReply: (params: { to: string; subject: string; body: string; inReplyTo: string; threadId: string }) => Promise<void>;
  isSending: boolean;
  onUpdateEmailPriority: (emailId: string, priority: PriorityLevel) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  onBack,
  onSendReply,
  isSending,
  onUpdateEmailPriority,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'ai'>('ai');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(email.summary || null);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replySuggestions, setReplySuggestions] = useState<ReplySuggestion[]>(email.replySuggestions || []);

  // Reply Composer State
  const [replyTo, setReplyTo] = useState(email.fromEmail || email.from);
  const [replySubject, setReplySubject] = useState(
    email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`
  );
  const [replyBody, setReplyBody] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isComposerHighlighted, setIsComposerHighlighted] = useState(false);
  const [activeSuggestionTitle, setActiveSuggestionTitle] = useState<string | null>(null);

  // Refs for direct scrolling and focusing into composer
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract date / deadline from email
  const dateInfo = extractDateFromEmail(email.subject, email.bodyText || email.snippet);
  const deadlineText = email.deadlineDescription || dateInfo.detectedDate;

  // Sync state when selected email changes
  useEffect(() => {
    setSummaryData(email.summary || null);
    setReplySuggestions(email.replySuggestions || []);
    setReplyTo(email.fromEmail || email.from);
    setReplySubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    setReplyBody('');
    setActiveSuggestionTitle(null);
    setIsComposerHighlighted(false);
  }, [email.id]);

  const priorityStyles: Record<PriorityLevel, { bg: string; text: string; border: string }> = {
    urgent: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' },
    high: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
    normal: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
    low: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/40' },
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await fetchAiSummary({
        subject: email.subject,
        from: email.from,
        body: email.bodyText,
        snippet: email.snippet,
      });
      setSummaryData(data);
      email.summary = data;
    } catch (err) {
      console.warn('Summary error resolved with fallback:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateReplies = async (customInstructionText?: string) => {
    setRepliesLoading(true);
    try {
      const suggestions = await fetchAiReplySuggestions({
        subject: email.subject,
        from: email.from,
        body: email.bodyText,
        snippet: email.snippet,
        customInstructions: customInstructionText || customInstructions,
      });
      setReplySuggestions(suggestions);
      email.replySuggestions = suggestions;
    } catch (err) {
      console.warn('Reply suggestion error resolved with fallback:', err);
    } finally {
      setRepliesLoading(false);
    }
  };

  // Directly sets up composer and scrolls directly to the response section of this mail id
  const handleSelectSuggestion = (suggestion: ReplySuggestion) => {
    // 1. Ensure tab is AI Assistant & Replies
    setActiveTab('ai');

    // 2. Load draft into composer for this mail id
    setReplyTo(email.fromEmail || email.from);
    setReplySubject(suggestion.subject || (email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`));
    setReplyBody(suggestion.bodyText);
    setActiveSuggestionTitle(suggestion.title);

    // 3. Highlight composer visually
    setIsComposerHighlighted(true);
    setTimeout(() => {
      setIsComposerHighlighted(false);
    }, 2800);

    // 4. Smooth scroll directly to composer and focus textarea
    setTimeout(() => {
      if (composerRef.current) {
        composerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 60);
  };

  const handleCopySuggestion = (suggestion: ReplySuggestion) => {
    navigator.clipboard.writeText(suggestion.bodyText);
    setCopiedId(suggestion.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInitiateSend = () => {
    if (!replyBody.trim()) {
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    await onSendReply({
      to: replyTo,
      subject: replySubject,
      body: replyBody,
      inReplyTo: email.id,
      threadId: email.threadId,
    });
    setShowConfirmModal(false);
    setReplyBody('');
    setActiveSuggestionTitle(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-white overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-sm gap-2">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-white truncate">{email.subject}</h2>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5 truncate">
            <span className="truncate">{email.fromName || email.from}</span>
            <span>•</span>
            <span className="whitespace-nowrap">{email.date}</span>
          </div>
        </div>

        {/* Priority Selector Pill & Close button */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-xs text-slate-400 hidden md:inline">Priority:</span>
          <select
            value={email.priority}
            onChange={(e) => onUpdateEmailPriority(email.id, e.target.value as PriorityLevel)}
            className={`text-xs font-semibold px-2 py-1 rounded-lg border uppercase tracking-wider ${
              priorityStyles[email.priority].bg
            } ${priorityStyles[email.priority].text} ${priorityStyles[email.priority].border} bg-slate-900 focus:outline-none`}
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Display all emails in inbox"
          >
            <Inbox className="w-3.5 h-3.5 text-indigo-300" />
            <span>All Mails</span>
          </button>
        </div>
      </div>

      {/* Prominent Automatic Deadline Banner (If date is included) */}
      {deadlineText && (
        <div className="bg-amber-950/60 border-b border-amber-800/80 px-4 py-2.5 flex items-center justify-between text-amber-200 text-xs">
          <div className="flex items-center space-x-2.5">
            <CalendarClock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Deadline automatically generated:</strong> {deadlineText}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
            Date Detected
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Assistant & Smart Replies</span>
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'content'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Original Message Content</span>
          </button>
        </div>

        {/* Quick jump to composer button */}
        <button
          onClick={() => {
            setActiveTab('ai');
            setTimeout(() => {
              composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              textareaRef.current?.focus();
            }, 60);
          }}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center transition-colors"
        >
          <CornerDownRight className="w-3 h-3 mr-1" />
          <span>Reply Composer</span>
        </button>
      </div>

      {/* Main Body Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
        {activeTab === 'content' ? (
          /* Original Message Content View */
          <div className="space-y-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500 font-medium">From: </span>
                  <span className="font-semibold">{email.from}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">To: </span>
                  <span>{email.to || 'Me'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Date: </span>
                  <span>{email.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Labels: </span>
                  <span className="font-mono">{email.labels.join(', ') || 'INBOX'}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
              {email.bodyText || email.snippet || '(No message body)'}
            </div>
          </div>
        ) : (
          /* AI Assistant & Smart Reply Studio */
          <div className="space-y-6">
            {/* AI Executive Summary Panel */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-800/40 space-y-4 shadow-lg shadow-indigo-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Executive Summary</h3>
                    <p className="text-[11px] text-indigo-300">Gemini 3.8 Flash Synthesis</p>
                  </div>
                </div>

                <button
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                  className="flex items-center px-3 py-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-semibold border border-indigo-500/50 transition-colors disabled:opacity-50"
                >
                  {summaryLoading ? (
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin" />
                      <span>Synthesizing...</span>
                    </div>
                  ) : (
                    <span>{summaryData ? 'Regenerate' : 'Analyze with AI'}</span>
                  )}
                </button>
              </div>

              {summaryData ? (
                <div className="space-y-3 pt-2 text-xs">
                  {/* TL;DR Banner */}
                  <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-slate-200">
                    <span className="font-bold text-indigo-300 block mb-1 uppercase tracking-wider text-[10px]">
                      Core Takeaway
                    </span>
                    <p className="text-sm font-medium leading-relaxed">{summaryData.summary}</p>
                  </div>

                  {/* Key points */}
                  {summaryData.keyPoints && summaryData.keyPoints.length > 0 && (
                    <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                      <span className="font-semibold text-slate-400 block text-[11px]">Key Highlights:</span>
                      <ul className="space-y-1">
                        {summaryData.keyPoints.map((pt, idx) => (
                          <li key={idx} className="flex items-start text-slate-300 text-xs">
                            <span className="text-indigo-400 mr-2 font-bold">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Required & Meta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Action Needed</span>
                      <span className="text-xs font-medium text-amber-300">
                        {deadlineText
                          ? `Deadline automatically generated: ${deadlineText}`
                          : summaryData.actionRequired}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estimated Read / Tone</span>
                      <span className="text-xs font-medium text-slate-300">
                        {summaryData.estimatedReadTime} • {summaryData.sentiment}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 bg-slate-950/30 rounded-xl border border-slate-800/60">
                  <p className="text-xs">
                    {deadlineText
                      ? `Date found in email. Deadline automatically generated: ${deadlineText}. Click "Analyze with AI" for full breakdown.`
                      : 'Click "Analyze with AI" to extract instant TL;DR, key takeaways, and action items.'}
                  </p>
                </div>
              )}
            </div>

            {/* AI Reply Suggestions Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Reply className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Suggested Reply Drafts</h3>
                </div>
                <button
                  onClick={() => handleGenerateReplies()}
                  disabled={repliesLoading}
                  className="flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
                >
                  {repliesLoading ? (
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      <span>Drafting...</span>
                    </div>
                  ) : (
                    <span>{replySuggestions.length > 0 ? 'Regenerate Drafts' : 'Suggest Replies'}</span>
                  )}
                </button>
              </div>

              {replySuggestions.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {replySuggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-600/60 transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-indigo-300">{sug.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                            {sug.tone}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCopySuggestion(sug)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                            title="Copy text"
                          >
                            {copiedId === sug.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleSelectSuggestion(sug)}
                            className="flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all"
                            title={`Load draft and jump directly to composer for ${email.fromName || email.from}`}
                          >
                            <CornerDownRight className="w-3.5 h-3.5 mr-1.5" />
                            <span>Use in Composer</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                        {sug.bodyText}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 bg-slate-950/30 rounded-xl border border-slate-800/60">
                  <p className="text-xs">No reply drafts generated yet. Click "Suggest Replies" to create 3 ready-to-edit options.</p>
                </div>
              )}
            </div>

            {/* Smart Reply Composer (Directly targeted by "Use in Composer") */}
            <div
              ref={composerRef}
              id={`composer-${email.id}`}
              className={`p-5 rounded-2xl border transition-all duration-300 space-y-4 ${
                isComposerHighlighted
                  ? 'bg-slate-950 border-indigo-500 ring-2 ring-indigo-500/50 shadow-2xl shadow-indigo-500/20'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    Compose Outbound Reply
                  </h3>
                </div>

                {/* Target email feedback badge */}
                <div className="flex items-center space-x-2 text-xs">
                  <span className="flex items-center px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700/80 font-mono text-[11px]">
                    <UserCheck className="w-3 h-3 mr-1 text-emerald-400" />
                    Replying to: {email.fromName || email.fromEmail || email.from}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {email.id.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Notice when draft is actively loaded into composer */}
              {activeSuggestionTitle && (
                <div className="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-700/60 flex items-center justify-between text-indigo-200 text-xs animate-in fade-in">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>
                      Loaded draft: <strong>{activeSuggestionTitle}</strong> directly into response composer.
                    </span>
                  </div>
                  <span className="text-[11px] text-indigo-300 underline cursor-pointer" onClick={() => textareaRef.current?.focus()}>
                    Edit below
                  </span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    To Recipient <span className="text-slate-500 font-normal">(Sender of mail #{email.id.slice(0, 8)})</span>
                  </label>
                  <input
                    type="text"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-medium">Message Body</label>
                    <span className="text-[11px] text-slate-500">Edit or personalize directly</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    rows={7}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type your response here or click 'Use in Composer' above to load a suggestion..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 placeholder-slate-500 leading-relaxed shadow-inner"
                  />
                </div>

                {/* AI Polish Field */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center space-x-2 text-slate-300 flex-1">
                    <Wand2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Prompt AI to polish (e.g., 'Make it friendlier', 'Accept meeting on Thursday')..."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleGenerateReplies(customInstructions)}
                    disabled={repliesLoading || !customInstructions.trim()}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-medium border border-indigo-500/50 transition-colors disabled:opacity-40"
                  >
                    Polish with Gemini
                  </button>
                </div>

                {/* Send Button */}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[11px] text-slate-400">
                    {replyBody.trim().length > 0 ? (
                      <span className="text-emerald-400 flex items-center">
                        <Check className="w-3.5 h-3.5 mr-1" /> Ready to review & send
                      </span>
                    ) : (
                      <span>Select a suggestion or type a reply</span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={handleInitiateSend}
                    disabled={!replyBody.trim() || isSending}
                    className="flex items-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    <span>Send Reply via Gmail</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal before Sending Email */}
      <ConfirmSendModal
        isOpen={showConfirmModal}
        to={replyTo}
        subject={replySubject}
        body={replyBody}
        isLoading={isSending}
        onConfirm={handleConfirmSend}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
};
