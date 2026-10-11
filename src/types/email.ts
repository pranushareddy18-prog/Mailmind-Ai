export type PriorityLevel = 'urgent' | 'high' | 'normal' | 'low';

export interface EmailSummary {
  summary: string;
  keyPoints: string[];
  actionRequired: string;
  sentiment: string;
  estimatedReadTime: string;
}

export interface ReplySuggestion {
  id: string;
  title: string;
  tone: string;
  subject: string;
  bodyText: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string;
  date: string;
  timestamp: number;
  isUnread: boolean;
  labels: string[];
  bodyText: string;
  priority: PriorityLevel;
  priorityReason?: string;
  hasDeadline?: boolean;
  deadlineDescription?: string;
  summary?: EmailSummary;
  replySuggestions?: ReplySuggestion[];
}

export interface ReminderItem {
  id: string;
  emailId: string;
  emailSubject: string;
  from: string;
  title: string;
  dueDate: string;
  targetTimestamp?: number;
  urgency: PriorityLevel;
  type: 'deadline' | 'meeting' | 'task' | 'followup';
  completed: boolean;
  notified?: boolean;
  sendEmailNotification?: boolean;
  soundStyle?: 'chime' | 'alarm' | 'bell' | 'ping';
  createdAt: number;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId?: string;
}
