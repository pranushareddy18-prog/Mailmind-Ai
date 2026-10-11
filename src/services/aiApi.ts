import { EmailMessage, EmailSummary, ReminderItem, ReplySuggestion } from '../types/email';
import { extractDateFromEmail } from './dateExtractor';

export async function fetchAiSummary(email: {
  subject: string;
  from: string;
  body: string;
  snippet?: string;
}): Promise<EmailSummary> {
  const dateInfo = extractDateFromEmail(email.subject, email.body || email.snippet || '');

  try {
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
    });

    if (res.ok) {
      const data = await res.json();
      let action = data.actionRequired || 'Review message contents.';
      if (dateInfo.hasDate && dateInfo.detectedDate && !action.toLowerCase().includes('deadline automatically generated')) {
        action = `Deadline automatically generated: ${dateInfo.detectedDate}`;
      }
      return {
        summary: data.summary || `Email regarding "${email.subject}".`,
        keyPoints: Array.isArray(data.keyPoints) && data.keyPoints.length > 0 ? data.keyPoints : [
          `Sender: ${email.from || 'Unknown'}`,
          dateInfo.hasDate ? `Deadline automatically generated: ${dateInfo.detectedDate}` : 'Review details',
        ],
        actionRequired: action,
        sentiment: data.sentiment || (dateInfo.hasDate ? 'Time-Sensitive' : 'Standard'),
        estimatedReadTime: data.estimatedReadTime || '1 min',
      };
    }
  } catch {
    // Network call failed, use local synthesis fallback
  }

  // Graceful fallback
  return {
    summary: `Email from ${email.from || 'sender'} concerning "${email.subject || 'message'}".`,
    keyPoints: [
      `Sender: ${email.from || 'Unknown'}`,
      `Subject: ${email.subject || 'No Subject'}`,
      dateInfo.hasDate ? `Deadline automatically generated: ${dateInfo.detectedDate}` : 'Standard business correspondence',
    ],
    actionRequired: dateInfo.hasDate
      ? `Deadline automatically generated: ${dateInfo.detectedDate}`
      : 'Review message contents and reply if needed.',
    sentiment: dateInfo.hasDate ? 'Time-Sensitive' : 'Professional',
    estimatedReadTime: '1 min',
  };
}

export async function fetchAiReplySuggestions(params: {
  subject: string;
  from: string;
  body: string;
  snippet?: string;
  customInstructions?: string;
}): Promise<ReplySuggestion[]> {
  const dateInfo = extractDateFromEmail(params.subject, params.body || params.snippet || '');
  const cleanSubject = params.subject.startsWith('Re:') ? params.subject : `Re: ${params.subject || ''}`;
  const senderName = params.from?.split('<')[0]?.replace(/["']/g, '').trim() || 'there';

  const defaultDrafts: ReplySuggestion[] = [
    {
      id: 'rep-1',
      title: 'Acknowledge & Confirm',
      tone: 'Professional & Prompt',
      subject: cleanSubject,
      bodyText: dateInfo.hasDate
        ? `Hi ${senderName},\n\nThank you for reaching out. I have noted the date (${dateInfo.detectedDate}) and will have this taken care of on schedule.\n\nBest regards,`
        : `Hi ${senderName},\n\nThank you for reaching out. I have received your email and will follow up with you shortly.\n\nBest regards,`,
    },
    {
      id: 'rep-2',
      title: 'Detailed Acceptance',
      tone: 'Affirmative & Thorough',
      subject: cleanSubject,
      bodyText: `Hi ${senderName},\n\nThanks for the thorough update. Everything looks great to me, and I agree with the next steps outlined.\n\nBest regards,`,
    },
    {
      id: 'rep-3',
      title: 'Clarification / Reschedule',
      tone: 'Polite Inquiry',
      subject: cleanSubject,
      bodyText: `Hi ${senderName},\n\nThanks for your note. Could you provide a bit more detail on this so I can review it properly?\n\nBest regards,`,
    },
  ];

  try {
    const res = await fetch('/api/ai/suggest-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        return data.suggestions;
      }
    }
  } catch {
    // Fallback to default drafts
  }

  return defaultDrafts;
}

export async function fetchBatchPriorities(
  emails: EmailMessage[]
): Promise<Record<string, { priority: string; reason: string; hasDeadline: boolean; deadlineDescription?: string }>> {
  // Pre-fill with date extractor so deadlines are always automatically detected!
  const localPriorities: Record<string, { priority: string; reason: string; hasDeadline: boolean; deadlineDescription?: string }> = {};
  for (const e of emails) {
    const dateInfo = extractDateFromEmail(e.subject, e.bodyText || e.snippet);
    if (dateInfo.hasDate) {
      localPriorities[e.id] = {
        priority: dateInfo.urgency,
        reason: `Deadline automatically generated: ${dateInfo.detectedDate}`,
        hasDeadline: true,
        deadlineDescription: dateInfo.detectedDate || undefined,
      };
    }
  }

  try {
    const payload = emails.map((e) => ({
      id: e.id,
      subject: e.subject,
      from: e.from,
      snippet: e.snippet,
      date: e.date,
    }));

    const res = await fetch('/api/ai/prioritize-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: payload }),
    });

    if (res.ok) {
      const data = await res.json();
      return { ...localPriorities, ...(data.priorities || {}) };
    }
  } catch {
    // Fallback to local priorities
  }

  return localPriorities;
}

export async function fetchAiDeadlines(emails: EmailMessage[]): Promise<ReminderItem[]> {
  // Extract all deadlines locally first using dateExtractor
  const localReminders: ReminderItem[] = [];
  for (const email of emails) {
    const dateInfo = extractDateFromEmail(email.subject, email.bodyText || email.snippet);
    if (dateInfo.hasDate && dateInfo.detectedDate) {
      localReminders.push({
        id: `auto-date-${email.id}`,
        emailId: email.id,
        emailSubject: email.subject,
        from: email.fromName || email.from,
        title: dateInfo.taskTitle || `Action on: ${email.subject}`,
        dueDate: dateInfo.detectedDate,
        urgency: dateInfo.urgency,
        type: dateInfo.type,
        completed: false,
        createdAt: email.timestamp || Date.now(),
      });
    }
  }

  try {
    const payload = emails.map((e) => ({
      id: e.id,
      subject: e.subject,
      from: e.from,
      snippet: e.snippet,
      date: e.date,
    }));

    const res = await fetch('/api/ai/extract-deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: payload }),
    });

    if (res.ok) {
      const data = await res.json();
      const serverReminders = (data.reminders || []).map((r: any) => ({
        ...r,
        createdAt: Date.now(),
        completed: false,
      }));

      // Combine both lists without duplicates
      const seenIds = new Set(serverReminders.map((r: any) => r.emailId));
      for (const lr of localReminders) {
        if (!seenIds.has(lr.emailId)) {
          serverReminders.push(lr);
        }
      }
      return serverReminders;
    }
  } catch {
    // Fallback to local reminders
  }

  return localReminders;
}
