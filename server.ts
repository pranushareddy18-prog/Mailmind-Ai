import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini SDK with User-Agent telemetry
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Track API rate-limiting / quota exhaustion to prevent repeated failed requests
let quotaCooldownUntil = 0;

function isQuotaExhausted(): boolean {
  return Date.now() < quotaCooldownUntil;
}

function handleQuotaError(err: any) {
  const errMsg = typeof err === 'string' ? err : err?.message || JSON.stringify(err || '');
  if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
    // Set 15-minute cooldown to avoid hammering the exhausted quota
    quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
  }
}

// Comprehensive date & time extraction helper
function extractDateFallback(text: string): string | null {
  const match = text.match(
    /\b(?:by|due|before|until|on|deadline:?)\s+([A-Za-z]+,\s+)?((?:next\s+|this\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)(?:\s+(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i
  );
  if (match) return match[0].trim();

  const explicitDate = text.match(
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?/i
  );
  if (explicitDate) return explicitDate[0].trim();

  return null;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!ai && !isQuotaExhausted(),
    quotaThrottled: isQuotaExhausted(),
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

// AI Email Summarization
app.post('/api/ai/summarize', async (req, res) => {
  const { subject, from, body, snippet } = req.body;
  const emailContent = (body || snippet || '').slice(0, 4000);
  const detectedDate = extractDateFallback(`${subject || ''} ${emailContent}`);

  const fallbackSummary = {
    summary: `Email from ${from || 'sender'} concerning "${subject || 'No Subject'}".`,
    keyPoints: [
      `Sender: ${from || 'Unknown'}`,
      `Subject: ${subject || 'No Subject'}`,
      detectedDate
        ? `Deadline automatically generated: ${detectedDate}`
        : `Preview: ${(snippet || body || '').slice(0, 120)}...`,
    ],
    actionRequired: detectedDate
      ? `Deadline automatically generated: ${detectedDate}`
      : 'Review message contents and respond if appropriate.',
    sentiment: detectedDate ? 'Time-Sensitive' : 'Professional',
    estimatedReadTime: '1 min',
  };

  if (!ai || isQuotaExhausted()) {
    return res.json(fallbackSummary);
  }

  try {
    const prompt = `You are MailMind AI, an elite executive email assistant. Analyze the following email:
From: ${from || 'Unknown'}
Subject: ${subject || 'No Subject'}
Content:
"""
${emailContent}
"""

Return a clean JSON object with:
- "summary": A concise 1 to 2 sentence executive summary highlighting what the email is about and its core point.
- "keyPoints": An array of 2 to 4 bullet points outlining key facts, decisions, requests, or takeaways.
- "actionRequired": What specific action the recipient needs to take (e.g. "Deadline automatically generated: [date]", "Reply with available time slots", or "None - Informational only"). Note: If any date or deadline is included in the email, explicitly state "Deadline automatically generated: [extracted date]".
- "sentiment": A brief tone label (e.g., "Urgent Request", "Professional Inquiry", "Appreciative", "Transactional", "Informational").
- "estimatedReadTime": e.g. "1 min" or "2 mins".

Respond strictly with valid JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    let actionRequired = parsed.actionRequired || fallbackSummary.actionRequired;
    if (detectedDate && !actionRequired.toLowerCase().includes('deadline automatically generated')) {
      actionRequired = `Deadline automatically generated: ${detectedDate}`;
    }

    res.json({
      summary: parsed.summary || fallbackSummary.summary,
      keyPoints: Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0 ? parsed.keyPoints : fallbackSummary.keyPoints,
      actionRequired,
      sentiment: parsed.sentiment || fallbackSummary.sentiment,
      estimatedReadTime: parsed.estimatedReadTime || '1 min',
    });
  } catch (error: any) {
    handleQuotaError(error);
    res.json(fallbackSummary);
  }
});

// AI Reply Suggestions
app.post('/api/ai/suggest-replies', async (req, res) => {
  const { subject, from, body, snippet, customInstructions } = req.body;
  const emailContent = (body || snippet || '').slice(0, 4000);
  const detectedDate = extractDateFallback(`${subject || ''} ${emailContent}`);

  const defaultSubject = subject?.startsWith('Re:') ? subject : `Re: ${subject || ''}`;
  const senderGreeting = from?.split('<')[0]?.replace(/["']/g, '').trim() || 'there';

  const fallbackSuggestions = [
    {
      id: 'rep-1',
      title: 'Acknowledge & Confirm',
      tone: 'Professional & Prompt',
      subject: defaultSubject,
      bodyText: detectedDate
        ? `Hi ${senderGreeting},\n\nThank you for reaching out. I noted the date (${detectedDate}) and will have this taken care of on schedule.\n\nBest regards,`
        : `Hi ${senderGreeting},\n\nThank you for reaching out. I have received your email and will follow up with you shortly.\n\nBest regards,`,
    },
    {
      id: 'rep-2',
      title: 'Detailed Acceptance',
      tone: 'Affirmative & Thorough',
      subject: defaultSubject,
      bodyText: `Hi ${senderGreeting},\n\nThanks for the comprehensive update. That works well for me, and I agree with the next steps outlined.\n\nBest,`,
    },
    {
      id: 'rep-3',
      title: 'Clarification / Reschedule',
      tone: 'Polite Inquiry',
      subject: defaultSubject,
      bodyText: `Hi ${senderGreeting},\n\nThanks for your note. Could you provide a bit more detail on this so I can review it properly?\n\nBest regards,`,
    },
  ];

  if (!ai || isQuotaExhausted()) {
    return res.json({ suggestions: fallbackSuggestions });
  }

  try {
    const prompt = `You are MailMind AI, an executive email communication assistant.
Generate 3 distinct, high-quality, professional email reply suggestions for the following incoming email:
From: ${from || 'Unknown'}
Subject: ${subject || 'No Subject'}
Incoming Email Content:
"""
${emailContent}
"""
${customInstructions ? `Special instruction from user: "${customInstructions}"` : ''}

Generate 3 varied options:
1. "Acknowledge & Confirm" (Brief, polite, professional acknowledgment)
2. "Detailed & Action-Oriented" (Comprehensive, clear response addressing the core points)
3. "Alternative / Needs Clarification / Reschedule" (Polite counter-proposal, clarification question, or polite decline)

Return a JSON object with:
"suggestions": [
  {
    "id": "1",
    "title": "Short title describing option",
    "tone": "Tone label",
    "subject": "Email subject line (prefixed with Re: )",
    "bodyText": "Complete ready-to-send draft body text"
  }
]

Return valid JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{"suggestions":[]}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      return res.json({ suggestions: parsed.suggestions });
    }
    return res.json({ suggestions: fallbackSuggestions });
  } catch (error: any) {
    handleQuotaError(error);
    return res.json({ suggestions: fallbackSuggestions });
  }
});

// AI Batch Priority Categorization (Urgent, High, Normal, Low)
app.post('/api/ai/prioritize-batch', async (req, res) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.json({ priorities: {} });
  }

  const sample = emails.slice(0, 20).map((e: any) => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    snippet: (e.snippet || '').slice(0, 200),
    date: e.date,
  }));

  // Build heuristic priorities
  const fallbackPriorities: Record<string, any> = {};
  for (const e of sample) {
    const text = `${e.subject} ${e.snippet}`.toLowerCase();
    const dateFound = extractDateFallback(text);
    let priority = 'normal';
    let reason = 'Standard correspondence';

    if (text.includes('urgent') || text.includes('asap') || text.includes('immediate') || text.includes('emergency')) {
      priority = 'urgent';
      reason = 'Keywords: urgent / action needed';
    } else if (dateFound || text.includes('deadline') || text.includes('reminder') || text.includes('due') || text.includes('important')) {
      priority = 'high';
      reason = dateFound ? `Deadline automatically generated: ${dateFound}` : 'Contains deadline or reminder';
    } else if (text.includes('newsletter') || text.includes('unsubscribe') || text.includes('digest') || text.includes('promotion')) {
      priority = 'low';
      reason = 'Newsletter / Promotional digest';
    }
    fallbackPriorities[e.id] = {
      priority,
      reason,
      hasDeadline: !!dateFound,
      deadlineDescription: dateFound || null,
    };
  }

  if (!ai || isQuotaExhausted()) {
    return res.json({ priorities: fallbackPriorities });
  }

  try {
    const prompt = `You are MailMind AI. Categorize each email into one of four priority categories:
- "urgent": Critical matters needing immediate attention today, emergencies, security alerts, blocking items.
- "high": Important tasks, clients, key deadlines, interview requests, financial or executive correspondence.
- "normal": Standard business communications, team updates, routine conversations.
- "low": Automated receipts, newsletters, marketing, social notifications, bulk announcements.

Emails to categorize:
${JSON.stringify(sample, null, 2)}

Return a JSON object with:
"results": [
  {
    "id": "email id",
    "priority": "urgent" | "high" | "normal" | "low",
    "reason": "Brief 4-8 word reason",
    "hasDeadline": true or false,
    "deadlineDescription": "optional extracted date or deadline string, or null"
  }
]

Return valid JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{"results":[]}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const priorities: Record<string, any> = { ...fallbackPriorities };
    if (Array.isArray(parsed.results)) {
      for (const r of parsed.results) {
        priorities[r.id] = {
          priority: r.priority || fallbackPriorities[r.id]?.priority || 'normal',
          reason: r.reason || fallbackPriorities[r.id]?.reason || 'General email',
          hasDeadline: !!r.hasDeadline || fallbackPriorities[r.id]?.hasDeadline,
          deadlineDescription: r.deadlineDescription || fallbackPriorities[r.id]?.deadlineDescription,
        };
      }
    }

    res.json({ priorities });
  } catch (error: any) {
    handleQuotaError(error);
    res.json({ priorities: fallbackPriorities });
  }
});

// AI Extract Deadlines & Reminders
app.post('/api/ai/extract-deadlines', async (req, res) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.json({ reminders: [] });
  }

  const sample = emails.slice(0, 15).map((e: any) => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    snippet: (e.snippet || e.body || '').slice(0, 300),
    date: e.date,
  }));

  // Build heuristic fallback reminders whenever a date is included
  const fallbackReminders: any[] = [];
  for (const e of sample) {
    const text = `${e.subject} ${e.snippet}`;
    const dateFound = extractDateFallback(text);
    if (dateFound) {
      fallbackReminders.push({
        id: `auto-date-${e.id}`,
        emailId: e.id,
        emailSubject: e.subject,
        from: e.from,
        title: `Action: ${e.subject.replace(/^(re:|fwd:)\s*/i, '').trim()}`,
        dueDate: dateFound,
        urgency: text.toLowerCase().includes('urgent') ? 'urgent' : 'high',
        type: /meeting|call|sync/i.test(text) ? 'meeting' : 'deadline',
        notice: `Deadline automatically generated: ${dateFound}`,
      });
    }
  }

  if (!ai || isQuotaExhausted()) {
    return res.json({ reminders: fallbackReminders });
  }

  try {
    const prompt = `You are MailMind AI. Analyze the following emails and extract any concrete deadlines, scheduled events, meetings, or time-sensitive commitments mentioned.
Emails:
${JSON.stringify(sample, null, 2)}

Return a JSON object with:
"reminders": [
  {
    "id": "unique string id",
    "emailId": "id of the source email",
    "emailSubject": "subject of the source email",
    "from": "sender",
    "title": "Clear action-oriented task or deadline title",
    "dueDate": "Extracted due date or time",
    "urgency": "urgent" | "high" | "normal",
    "type": "deadline" | "meeting" | "task" | "followup"
  }
]

Return valid JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{"reminders":[]}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const aiReminders = Array.isArray(parsed.reminders) ? parsed.reminders : [];
    const emailIdsWithReminders = new Set(aiReminders.map((r: any) => r.emailId));
    for (const fb of fallbackReminders) {
      if (!emailIdsWithReminders.has(fb.emailId)) {
        aiReminders.push(fb);
      }
    }

    res.json({ reminders: aiReminders });
  } catch (error: any) {
    handleQuotaError(error);
    res.json({ reminders: fallbackReminders });
  }
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MailMind AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
