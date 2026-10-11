// High-fidelity Web Audio API chime synthesis and audio alerts
// AudioContext requires user interaction in modern browsers to transition out of 'suspended'
let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn('Unable to initialize AudioContext:', err);
    return null;
  }
}

// Ensure audio context is warmed up on any user gesture
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Remove listeners once touched
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

export type ReminderSoundStyle = 'chime' | 'alarm' | 'bell' | 'ping';

// Play clear, loud, audible reminder chime with multi-harmonic tones
export function playReminderChime(style: ReminderSoundStyle = 'chime', repeatCount = 2) {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) {
      playFallbackBeep();
      return;
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.65, ctx.currentTime); // Louder, clearly audible volume
    masterGain.connect(ctx.destination);

    // Render tone bursts depending on selected style
    for (let i = 0; i < repeatCount; i++) {
      const burstDelay = i * 0.45;
      const t = ctx.currentTime + burstDelay;

      if (style === 'alarm') {
        // High attention alarm double-beep
        playTone(ctx, masterGain, 880, t, 0.18, 'triangle');
        playTone(ctx, masterGain, 1174.66, t + 0.08, 0.22, 'square', 0.4);
        playTone(ctx, masterGain, 880, t + 0.22, 0.18, 'triangle');
        playTone(ctx, masterGain, 1174.66, t + 0.3, 0.22, 'square', 0.4);
      } else if (style === 'bell') {
        // Church/service bell chime with harmonic overtones
        playTone(ctx, masterGain, 523.25, t, 0.8, 'sine', 0.6); // C5
        playTone(ctx, masterGain, 659.25, t + 0.05, 0.75, 'sine', 0.5); // E5
        playTone(ctx, masterGain, 783.99, t + 0.1, 0.85, 'sine', 0.6); // G5
        playTone(ctx, masterGain, 1046.5, t + 0.15, 0.9, 'sine', 0.4); // C6
      } else if (style === 'ping') {
        // Sharp metallic ping
        playTone(ctx, masterGain, 987.77, t, 0.35, 'sine', 0.8);
        playTone(ctx, masterGain, 1975.53, t, 0.25, 'sine', 0.3);
      } else {
        // Default 'chime': Rich, distinctive 3-tone arpeggio (C5 -> E5 -> G5 -> C6)
        playTone(ctx, masterGain, 523.25, t, 0.4, 'sine', 0.6);
        playTone(ctx, masterGain, 659.25, t + 0.1, 0.4, 'sine', 0.6);
        playTone(ctx, masterGain, 783.99, t + 0.2, 0.45, 'sine', 0.65);
        playTone(ctx, masterGain, 1046.5, t + 0.3, 0.7, 'sine', 0.8);
      }
    }
  } catch (err) {
    console.warn('Could not play reminder sound via Web Audio API:', err);
    playFallbackBeep();
  }
}

// Synthesize single note with envelope
function playTone(
  ctx: AudioContext,
  dest: AudioNode,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.5
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    // Fast attack, smooth decay
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, volume), startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch (e) {
    // Graceful silent fallback
  }
}

// Fallback HTML5 audio element beep using data URI WAV (100% self-contained)
function playFallbackBeep() {
  try {
    // Generate a simple 0.3s wav audio buffer in base64 if AudioContext fails
    const audio = new Audio(
      'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18AAAAAAAEBAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn8='
    );
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch (e) {
    // ignore
  }
}

// Request browser desktop notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

// Display native browser notification
export function triggerDesktopNotification(title: string, options: { body: string; tag?: string }) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`⏰ MailMind AI: ${title}`, {
        body: options.body,
        tag: options.tag || 'reminder',
        icon: '/favicon.ico',
      });
    } catch (err) {
      console.warn('Desktop notification failed:', err);
    }
  }
}

// Parse various time formats (e.g., "3:15am", "03:15 AM", "3:15", "3am", "15:30")
export function parseTimeString(t: string): { h: number; m: number } | null {
  if (!t) return null;
  const cleaned = t.trim().toLowerCase();

  // 12-hour format e.g. "3:15am", "03:15 am", "3:15 pm", "3:15"
  const matchColon = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i) ||
                     cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (matchColon) {
    let h = parseInt(matchColon[1], 10);
    const m = parseInt(matchColon[2], 10);
    const ampm = matchColon[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return { h, m };
  }

  // Hour only with am/pm e.g. "3am", "3 pm", "11pm"
  const matchHourOnly = cleaned.match(/^(\d{1,2})\s*(am|pm)$/i) ||
                        cleaned.match(/(\d{1,2})\s*(am|pm)/i);
  if (matchHourOnly) {
    let h = parseInt(matchHourOnly[1], 10);
    const ampm = matchHourOnly[2].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return { h, m: 0 };
  }

  return null;
}

// Format timestamp into human-readable representation (e.g. "Tomorrow, Oct 11 at 03:15 AM")
export function formatReminderDueDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();

  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const monthStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

  if (isToday) {
    return `Today at ${timeStr}`;
  }
  if (isTomorrow) {
    return `Tomorrow (${monthStr}) at ${timeStr}`;
  }
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${timeStr}`;
}

// Parse string formats into a target timestamp in milliseconds
export function parseTargetTimestamp(dateInput?: string, timeInput?: string): number {
  const now = new Date();

  let hours = now.getHours();
  let minutes = now.getMinutes() + 5;
  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();
  let dateExplicitlyProvided = false;

  // 1. Parse time if provided
  if (timeInput) {
    const parsed = parseTimeString(timeInput);
    if (parsed) {
      hours = parsed.h;
      minutes = parsed.m;
    }
  }

  // 2. Parse date input
  if (dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, mo, d] = dateInput.trim().split('-').map(Number);
    year = y;
    month = mo - 1;
    day = d;
    dateExplicitlyProvided = true;
  } else if (dateInput) {
    const timeInDate = parseTimeString(dateInput);
    if (timeInDate && !timeInput) {
      hours = timeInDate.h;
      minutes = timeInDate.m;
    }

    if (/tomorrow/i.test(dateInput)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      year = tomorrow.getFullYear();
      month = tomorrow.getMonth();
      day = tomorrow.getDate();
      dateExplicitlyProvided = true;
    }
  }

  const target = new Date(year, month, day, hours, minutes, 0, 0);

  // If the target time has already passed today (e.g. user selected 3:15 AM today when it's currently afternoon):
  // Roll forward to tomorrow at that time so it triggers at 3:15 AM upcoming!
  const isTargetToday =
    year === now.getFullYear() &&
    month === now.getMonth() &&
    day === now.getDate();

  if (target.getTime() <= now.getTime()) {
    if (isTargetToday || !dateExplicitlyProvided) {
      target.setDate(target.getDate() + 1);
    }
  }

  return target.getTime();
}
