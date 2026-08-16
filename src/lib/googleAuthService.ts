/**
 * Unified Google Services Authentication & API Engine
 * Manages 3-Month Permission persistence for Gmail API & Google Drive Backup
 */

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const STORAGE_KEY = "zorba_google_services_auth_v2";
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export interface GoogleSessionData {
  accessToken: string;
  tokenExpiresAt: number;
  permissionGrantedAt: number;
  permissionValidUntil: number;
  email?: string;
  scopes: string[];
}

/**
 * In-memory storage for Google OAuth session tokens.
 * Keeping access tokens in memory (instead of localStorage) prevents extraction
 * via XSS or untrusted scripts running in the origin.
 */
let inMemoryGoogleSession: GoogleSessionData | null = null;

// Purge any legacy tokens stored in localStorage from previous versions
try {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem(STORAGE_KEY);
  }
} catch {
  // Ignore storage errors in restricted contexts
}

/**
 * Loads the active Google session from memory
 */
export function getStoredGoogleSession(): GoogleSessionData | null {
  return inMemoryGoogleSession;
}

/**
 * Persists the Google session in memory for the active session
 */
export function saveGoogleSession(data: GoogleSessionData): void {
  inMemoryGoogleSession = data;
}

/**
 * Clears the active Google session from memory and purges legacy storage
 */
export function clearGoogleSession(): void {
  inMemoryGoogleSession = null;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Gets permission validity information (e.g. days remaining on 3-month authorization)
 */
export function getGooglePermissionStatus(): {
  isAuthorized: boolean;
  daysRemaining: number;
  email?: string;
  permissionValidUntil: number;
} {
  const session = getStoredGoogleSession();
  if (!session) {
    return {
      isAuthorized: false,
      daysRemaining: 0,
      permissionValidUntil: 0,
    };
  }

  const now = Date.now();
  const msRemaining = session.permissionValidUntil - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

  return {
    isAuthorized: msRemaining > 0,
    daysRemaining,
    email: session.email || auth.currentUser?.email || undefined,
    permissionValidUntil: session.permissionValidUntil,
  };
}

/**
 * Request or reuse a Google OAuth Access Token.
 * - Reuses existing token if unexpired and contains ALL required scopes (no prompt).
 * - If token expired or missing scopes but within 3-month authorization window, prompts with select_account.
 * - If expired beyond 3-month authorization, prompts with full consent screen.
 */
export async function getGoogleServicesToken(
  requiredScopes: string[] = [GMAIL_SEND_SCOPE, DRIVE_FILE_SCOPE],
  forceConsentPrompt = false
): Promise<string> {
  const now = Date.now();
  const session = getStoredGoogleSession();

  // Check if current stored session contains all requested scopes
  const hasAllRequiredScopes =
    session &&
    Array.isArray(session.scopes) &&
    requiredScopes.every((scope) => session.scopes.includes(scope));

  // 1. If valid in-memory/stored token exists, has all required scopes, and has > 2 min remaining
  if (
    !forceConsentPrompt &&
    session &&
    session.accessToken &&
    hasAllRequiredScopes &&
    now < session.tokenExpiresAt - 120000 &&
    now < session.permissionValidUntil
  ) {
    return session.accessToken;
  }

  // 2. Check if we are still within the 3-month permission grant
  const isWithin3MonthWindow = session && now < session.permissionValidUntil && hasAllRequiredScopes;

  const provider = new GoogleAuthProvider();
  // Always include standard unified scopes so token works for both Gmail and Drive
  const unifiedScopes = Array.from(new Set([...requiredScopes, GMAIL_SEND_SCOPE, DRIVE_FILE_SCOPE]));
  unifiedScopes.forEach((s) => provider.addScope(s));

  if (forceConsentPrompt || !isWithin3MonthWindow) {
    // Prompt for 3-month consent
    provider.setCustomParameters({
      prompt: "consent",
      access_type: "online",
    });
  } else {
    // Re-authenticate silently without repeating permissions screen
    provider.setCustomParameters({
      prompt: "select_account",
    });
  }

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error("Unable to obtain Google OAuth access token. Please grant permission.");
  }

  // Calculate timestamps
  const tokenExpiresAt = Date.now() + 3550 * 1000; // ~1 hr Google token lifetime
  const permissionGrantedAt = isWithin3MonthWindow && session
    ? session.permissionGrantedAt
    : Date.now();
  const permissionValidUntil = isWithin3MonthWindow && session
    ? session.permissionValidUntil
    : Date.now() + THREE_MONTHS_MS;

  const newSession: GoogleSessionData = {
    accessToken: token,
    tokenExpiresAt,
    permissionGrantedAt,
    permissionValidUntil,
    email: result.user?.email || auth.currentUser?.email || undefined,
    scopes: unifiedScopes,
  };

  saveGoogleSession(newSession);
  return token;
}

/**
 * Encodes a string to RFC 4648 Base64URL without padding
 */
export function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Safely encodes a UTF-8 string to base64 for MIME encoded-word syntax (=?utf-8?B?...?=)
 */
function encodeMimeWord(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary);
}

/**
 * Builds a MIME RFC 2822 email message string
 */
export function createMimeMessage(params: {
  fromName?: string;
  fromEmail?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): string {
  const senderEmail = params.fromEmail || auth.currentUser?.email || "zorbainfotech@gmail.com";
  const senderName = params.fromName || "Zorba Infotech";
  const fromHeader = `From: =?utf-8?B?${encodeMimeWord(senderName)}?= <${senderEmail}>\r\n`;
  const toHeader = `To: <${params.to.trim()}>\r\n`;
  const subjectHeader = `Subject: =?utf-8?B?${encodeMimeWord(params.subject)}?=\r\n`;

  const headers = [
    fromHeader,
    toHeader,
    subjectHeader,
    "MIME-Version: 1.0\r\n",
    "Content-Type: text/html; charset=UTF-8\r\n",
    "Content-Transfer-Encoding: 7bit\r\n\r\n",
    params.html,
  ];

  return headers.join("");
}

export interface SendGmailResult {
  success: boolean;
  messageId?: string;
  senderEmail?: string;
  error?: string;
}

/**
 * Sends an email directly via the signed-in user's Gmail API in the background.
 * Uses the persistent 3-month Google OAuth session.
 */
export async function sendDirectGmailMessage(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}): Promise<SendGmailResult> {
  const token = await getGoogleServicesToken([GMAIL_SEND_SCOPE]);
  const senderEmail = auth.currentUser?.email || undefined;

  const rawMime = createMimeMessage({
    fromName: params.fromName || "Zorba Infotech Service Center",
    fromEmail: senderEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  const base64UrlMessage = base64UrlEncode(rawMime);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: base64UrlMessage,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gmail API HTTP ${response.status}`;
    throw new Error(`Gmail API error: ${message}`);
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.id,
    senderEmail,
  };
}
