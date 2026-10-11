import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'mailmind_db.json');

export interface StoredDeadline {
  id: string;
  userId: string;
  emailId: string;
  threadId: string;
  emailSubject: string;
  from: string;
  title: string;
  description?: string;
  dueDateIso: string; // ISO 8601 string
  dueDateFormatted: string;
  isExplicit: boolean; // explicitly stated vs AI-inferred
  isAmbiguous: boolean; // ambiguous or contradictory
  supportingSentence: string; // exact sentence from email
  confidence: number; // 0 - 100
  urgency: 'urgent' | 'high' | 'normal' | 'low';
  type: 'deadline' | 'meeting' | 'payment' | 'submission' | 'registration' | 'task';
  completed: boolean;
  dismissed: boolean;
  needsReview: boolean; // flagged for user confirmation
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  userId: string;
  timezone: string;
  autoSyncEnabled: boolean;
  syncIntervalSeconds: number;
  reminders: {
    atDeadline: boolean;
    oneHourBefore: boolean;
    twentyFourHoursBefore: boolean;
    browserNotifications: boolean;
  };
  summaryDetail: 'concise' | 'detailed';
  defaultTone: string;
}

export interface DatabaseSchema {
  deadlines: StoredDeadline[];
  processedMessageIds: Record<string, number>; // messageId -> timestamp
  preferences: Record<string, UserPreferences>; // userId -> preferences
}

// In-memory cache + persistent disk write
let dbCache: DatabaseSchema = {
  deadlines: [],
  processedMessageIds: {},
  preferences: {},
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadDatabase(): DatabaseSchema {
  try {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      dbCache = {
        deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : [],
        processedMessageIds: parsed.processedMessageIds || {},
        preferences: parsed.preferences || {},
      };
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error('Failed to load database from disk:', err);
  }
  return dbCache;
}

export function saveDatabase(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database to disk:', err);
  }
}

// Initialize on module load
loadDatabase();

// Deadlines operations
export function getDeadlines(userId?: string): StoredDeadline[] {
  if (!userId) return dbCache.deadlines;
  return dbCache.deadlines.filter((d) => !d.userId || d.userId === userId);
}

export function saveDeadline(deadline: StoredDeadline): StoredDeadline {
  const index = dbCache.deadlines.findIndex((d) => d.id === deadline.id);
  const now = Date.now();
  if (index >= 0) {
    dbCache.deadlines[index] = { ...deadline, updatedAt: now };
  } else {
    dbCache.deadlines.push({ ...deadline, createdAt: now, updatedAt: now });
  }
  saveDatabase();
  return deadline;
}

export function saveDeadlinesBatch(newDeadlines: StoredDeadline[]): StoredDeadline[] {
  const now = Date.now();
  for (const item of newDeadlines) {
    // Deduplicate by (threadId + title + dueDateIso) or id
    const existingIndex = dbCache.deadlines.findIndex(
      (d) =>
        d.id === item.id ||
        (d.threadId && d.threadId === item.threadId && d.title.toLowerCase() === item.title.toLowerCase())
    );

    if (existingIndex >= 0) {
      // Update existing if not completed
      if (!dbCache.deadlines[existingIndex].completed) {
        dbCache.deadlines[existingIndex] = {
          ...dbCache.deadlines[existingIndex],
          ...item,
          id: dbCache.deadlines[existingIndex].id,
          updatedAt: now,
        };
      }
    } else {
      dbCache.deadlines.push({ ...item, createdAt: now, updatedAt: now });
    }
  }
  saveDatabase();
  return dbCache.deadlines;
}

export function updateDeadline(id: string, updates: Partial<StoredDeadline>): StoredDeadline | null {
  const item = dbCache.deadlines.find((d) => d.id === id);
  if (!item) return null;
  Object.assign(item, updates, { updatedAt: Date.now() });
  saveDatabase();
  return item;
}

export function deleteDeadline(id: string): boolean {
  const initialLen = dbCache.deadlines.length;
  dbCache.deadlines = dbCache.deadlines.filter((d) => d.id !== id);
  if (dbCache.deadlines.length !== initialLen) {
    saveDatabase();
    return true;
  }
  return false;
}

// Processed messages tracking
export function isMessageProcessed(messageId: string): boolean {
  return Boolean(dbCache.processedMessageIds[messageId]);
}

export function markMessagesProcessed(messageIds: string[]): void {
  const now = Date.now();
  messageIds.forEach((id) => {
    dbCache.processedMessageIds[id] = now;
  });
  saveDatabase();
}

export function getProcessedMessageIds(): string[] {
  return Object.keys(dbCache.processedMessageIds);
}

// User preferences
export function getUserPreferences(userId: string): UserPreferences {
  if (dbCache.preferences[userId]) {
    return dbCache.preferences[userId];
  }
  const defaultPrefs: UserPreferences = {
    userId,
    timezone: 'UTC',
    autoSyncEnabled: true,
    syncIntervalSeconds: 60,
    reminders: {
      atDeadline: true,
      oneHourBefore: true,
      twentyFourHoursBefore: true,
      browserNotifications: false,
    },
    summaryDetail: 'concise',
    defaultTone: 'Professional & Direct',
  };
  dbCache.preferences[userId] = defaultPrefs;
  saveDatabase();
  return defaultPrefs;
}

export function updateUserPreferences(userId: string, updates: Partial<UserPreferences>): UserPreferences {
  const existing = getUserPreferences(userId);
  const updated: UserPreferences = {
    ...existing,
    ...updates,
    reminders: {
      ...existing.reminders,
      ...(updates.reminders || {}),
    },
  };
  dbCache.preferences[userId] = updated;
  saveDatabase();
  return updated;
}
