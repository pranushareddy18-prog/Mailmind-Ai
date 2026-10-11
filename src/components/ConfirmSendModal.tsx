import React from 'react';
import { Send, AlertCircle, X } from 'lucide-react';

interface ConfirmSendModalProps {
  isOpen: boolean;
  to: string;
  subject: string;
  body: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmSendModal: React.FC<ConfirmSendModalProps> = ({
  isOpen,
  to,
  subject,
  body,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-white">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Confirm Email Delivery</h3>
              <p className="text-xs text-slate-400">Gmail API Outbound Authorization</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning banner */}
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start space-x-2.5 text-amber-200 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <span>
            This action will send a real email from your connected Gmail address to the recipient. Please review the details below carefully before confirming.
          </span>
        </div>

        {/* Details breakdown */}
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 font-medium">To Recipient:</span>
            <div className="font-semibold text-slate-200 mt-0.5 break-all">{to || '(No recipient)'}</div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Subject:</span>
            <div className="font-semibold text-slate-200 mt-0.5">{subject || '(No subject)'}</div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Message Body Preview:</span>
            <div className="mt-1 p-2.5 rounded-lg bg-slate-900 text-slate-300 font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap border border-slate-800">
              {body}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending via Gmail...</span>
              </div>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                <span>Confirm & Send via Gmail</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
