import { PriorityLevel, ReminderItem, EmailMessage } from '../types/email';
import { parseTargetTimestamp } from './reminderNotifier';

export interface ExtractedDateInfo {
  hasDate: boolean;
  detectedDate: string | null;
  taskTitle: string | null;
  urgency: PriorityLevel;
  type: 'deadline' | 'meeting' | 'task' | 'followup';
  notice: string | null;
}

// Regex patterns to detect dates, deadlines, and time references in email content
const DATE_PATTERNS = [
  // "by/due/before/until [day/date/time]" e.g., "by Friday at 5pm", "due tomorrow", "due Oct 20"
  /\b(?:by|due|before|until|deadline:?)\s+([A-Za-z]+,\s+)?((?:next\s+|this\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|tonight|eod|end of day)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?|\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)(?:\s+(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,

  // "meeting/call/sync on/at [date/time]"
  /\b(?:meeting|call|sync|discussion|review|interview|webinar)\s+(?:on|for|at)\s+([A-Za-z]+,\s+)?((?:next\s+|this\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,

  // Month Day format e.g. "October 15", "Oct 15th, 2026", "Nov 2 at 3pm"
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?(?:\s+(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,

  // ISO or slash dates e.g. "2026-10-15", "10/15/2026", "15/10/2026"
  /\b\d{4}-\d{2}-\d{2}(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?\b/,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?\b/,

  // Day of week references e.g. "this Friday at 4pm", "next Monday"
  /\b(?:this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,

  // "by EOD", "by end of week", "by 5 PM"
  /\b(?:by|before)\s+(?:eod|end of day|end of week|cob|close of business|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
];

export function extractDateFromEmail(subject: string, bodyOrSnippet: string): ExtractedDateInfo {
  const combined = `${subject}\n${bodyOrSnippet}`;

  for (const pattern of DATE_PATTERNS) {
    const match = combined.match(pattern);
    if (match) {
      const fullMatch = match[0].trim();
      // Clean up matched string
      let cleanedDate = fullMatch;
      // Capitalize first letter
      cleanedDate = cleanedDate.charAt(0).toUpperCase() + cleanedDate.slice(1);

      const isUrgent =
        /urgent|asap|today|tonight|immediately|emergency/i.test(combined) ||
        /today|tonight/i.test(cleanedDate);

      const isMeeting = /meeting|call|sync|interview|calendar/i.test(combined);

      let urgency: PriorityLevel = 'normal';
      if (isUrgent) {
        urgency = 'urgent';
      } else if (/tomorrow|this week|by friday|deadline|due/i.test(combined)) {
        urgency = 'high';
      }

      // Generate a clean task title from the subject or context
      const cleanSubject = subject.replace(/^(re:|fwd:)\s*/i, '').trim();
      const taskTitle = cleanSubject ? `Follow up on: ${cleanSubject}` : 'Action item from email';

      return {
        hasDate: true,
        detectedDate: cleanedDate,
        taskTitle,
        urgency,
        type: isMeeting ? 'meeting' : 'deadline',
        notice: `Deadline automatically generated: ${cleanedDate}`,
      };
    }
  }

  return {
    hasDate: false,
    detectedDate: null,
    taskTitle: null,
    urgency: 'normal',
    type: 'task',
    notice: null,
  };
}

// Convert extracted date info into a standard ReminderItem
export function buildReminderFromEmail(email: EmailMessage): ReminderItem | null {
  const extracted = extractDateFromEmail(email.subject, email.bodyText || email.snippet);
  if (!extracted.hasDate || !extracted.detectedDate) {
    return null;
  }

  const targetTimestamp = parseTargetTimestamp(extracted.detectedDate);

  return {
    id: `auto-date-${email.id}`,
    emailId: email.id,
    emailSubject: email.subject,
    from: email.fromName || email.from,
    title: extracted.taskTitle || `Action: ${email.subject}`,
    dueDate: extracted.detectedDate,
    targetTimestamp,
    urgency: extracted.urgency,
    type: extracted.type,
    completed: false,
    notified: false,
    sendEmailNotification: true,
    createdAt: email.timestamp || Date.now(),
  };
}
