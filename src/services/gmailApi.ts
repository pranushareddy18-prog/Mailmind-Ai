import { EmailMessage, GmailProfile, PriorityLevel } from '../types/email';

// Helper to decode Gmail's base64url encoded payloads
function decodeBase64Url(input: string): string {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    console.warn('Failed to decode base64 body:', err);
    return '';
  }
}

// Recursively parse body text from Gmail payload parts
function parseMessageBody(payload: any): string {
  if (!payload) return '';

  // Direct body data
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Nested parts
  if (payload.parts && Array.isArray(payload.parts)) {
    // Prefer text/plain
    const plainPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (plainPart && plainPart.body && plainPart.body.data) {
      return decodeBase64Url(plainPart.body.data);
    }

    // Fallback to text/html
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      const html = decodeBase64Url(htmlPart.body.data);
      // Strip html tags for plain preview
      return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    }

    // Traverse recursive subparts
    for (const part of payload.parts) {
      const sub = parseMessageBody(part);
      if (sub) return sub;
    }
  }

  return '';
}

// Extract sender name and clean email from header string
function parseSender(fromHeader: string): { name: string; email: string } {
  if (!fromHeader) return { name: 'Unknown', email: '' };
  const match = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
  if (match) {
    const name = match[1].replace(/["']/g, '').trim();
    return {
      name: name || match[2],
      email: match[2].trim(),
    };
  }
  return { name: fromHeader.trim(), email: fromHeader.trim() };
}

// Determine preliminary heuristic priority before AI pass
function getPreliminaryPriority(subject: string, snippet: string): PriorityLevel {
  const combined = `${subject} ${snippet}`.toLowerCase();
  if (
    combined.includes('urgent') ||
    combined.includes('asap') ||
    combined.includes('immediately') ||
    combined.includes('action required') ||
    combined.includes('emergency') ||
    combined.includes('security alert')
  ) {
    return 'urgent';
  }
  if (
    combined.includes('deadline') ||
    combined.includes('reminder') ||
    combined.includes('due date') ||
    combined.includes('important') ||
    combined.includes('invoice') ||
    combined.includes('payment')
  ) {
    return 'high';
  }
  if (
    combined.includes('newsletter') ||
    combined.includes('unsubscribe') ||
    combined.includes('digest') ||
    combined.includes('promotions') ||
    combined.includes('sale') ||
    combined.includes('no-reply') ||
    combined.includes('noreply')
  ) {
    return 'low';
  }
  return 'normal';
}

// Fetch user's Gmail profile
export async function getGmailProfile(accessToken: string): Promise<GmailProfile> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED: Access token has expired or is invalid.');
    }
    if (res.status === 403) {
      throw new Error('PERMISSION_DENIED: Gmail permissions are missing or not granted.');
    }
    throw new Error(`Gmail API error (${res.status}): ${errorText}`);
  }

  return await res.json();
}

// List message IDs from Gmail
export async function listGmailMessages(
  accessToken: string,
  options: {
    maxResults?: number;
    q?: string;
    pageToken?: string;
    labelIds?: string[];
  } = {}
): Promise<{ messageIds: string[]; nextPageToken?: string }> {
  const params = new URLSearchParams();
  params.set('maxResults', String(options.maxResults || 20));
  if (options.q) params.set('q', options.q);
  if (options.pageToken) params.set('pageToken', options.pageToken);
  if (options.labelIds && options.labelIds.length > 0) {
    options.labelIds.forEach((l) => params.append('labelIds', l));
  }

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED: Access token has expired.');
    }
    if (res.status === 403) {
      throw new Error('PERMISSION_DENIED: Gmail read permission not granted.');
    }
    throw new Error(`Failed to list messages: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const messageIds = (data.messages || []).map((m: any) => m.id);
  return { messageIds, nextPageToken: data.nextPageToken };
}

// Fetch individual message details and parse headers + body
export async function getGmailMessageDetail(
  accessToken: string,
  messageId: string
): Promise<EmailMessage> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch message ${messageId}: ${res.statusText}`);
  }

  const data = await res.json();
  const headers = data.payload?.headers || [];

  const getHeader = (name: string): string => {
    const h = headers.find((item: any) => item.name?.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
  };

  const subject = getHeader('Subject') || '(No Subject)';
  const fromHeader = getHeader('From');
  const { name: fromName, email: fromEmail } = parseSender(fromHeader);
  const to = getHeader('To');
  const dateHeader = getHeader('Date');

  const snippet = data.snippet || '';
  const bodyText = parseMessageBody(data.payload) || snippet;
  const labels: string[] = data.labelIds || [];
  const isUnread = labels.includes('UNREAD');

  const timestamp = data.internalDate ? parseInt(data.internalDate, 10) : Date.now();
  const priority = getPreliminaryPriority(subject, snippet);

  return {
    id: data.id,
    threadId: data.threadId,
    snippet,
    subject,
    from: fromHeader,
    fromName,
    fromEmail,
    to,
    date: dateHeader || new Date(timestamp).toLocaleDateString(),
    timestamp,
    isUnread,
    labels,
    bodyText: bodyText.trim(),
    priority,
  };
}

// Batch fetch messages in parallel with concurrency throttling
export async function batchFetchMessages(
  accessToken: string,
  messageIds: string[]
): Promise<EmailMessage[]> {
  const results: EmailMessage[] = [];
  const chunkSize = 6;

  for (let i = 0; i < messageIds.length; i += chunkSize) {
    const chunk = messageIds.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (id) => {
        try {
          return await getGmailMessageDetail(accessToken, id);
        } catch (err) {
          console.warn(`Could not load email ${id}:`, err);
          return null;
        }
      })
    );
    results.push(...(chunkResults.filter(Boolean) as EmailMessage[]));
  }

  return results;
}

// Send Email or Reply via Gmail API (Constructs RFC 2822 base64url message)
export async function sendGmailMessage(
  accessToken: string,
  params: {
    to: string;
    subject: string;
    body: string;
    inReplyTo?: string;
    references?: string;
    threadId?: string;
  }
): Promise<{ id: string; threadId: string }> {
  const headers = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
  ];

  if (params.inReplyTo) {
    headers.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  if (params.references) {
    headers.push(`References: ${params.references}`);
  }

  const rawMessage = `${headers.join('\r\n')}\r\n\r\n${params.body}`;

  // Base64url encode with UTF-8 safety
  const utf8Bytes = new TextEncoder().encode(rawMessage);
  let binaryString = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binaryString += String.fromCharCode(utf8Bytes[i]);
  }
  const base64Url = btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const payload: any = { raw: base64Url };
  if (params.threadId) {
    payload.threadId = params.threadId;
  }

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to send email (${res.status}): ${errorText}`);
  }

  return await res.json();
}
