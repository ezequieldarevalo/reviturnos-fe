export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  role: 'superadmin' | 'admin' | 'operator' | 'viewer';
  plantId?: string;
};

export type AdminSession = {
  token: string;
  user: SessionUser;
  plantCode?: string;
};

const SESSION_KEY = 'turnero_admin_session';

export function getAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function setAdminSession(session: AdminSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
}
