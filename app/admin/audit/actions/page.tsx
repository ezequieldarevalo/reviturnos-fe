'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { AdminSession, getAdminSession } from 'lib/adminAuth';

type ActionLog = {
  id: string;
  createdAt: string;
  plantId?: string | null;
  userEmail: string;
  userRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: any;
};

export default function ActionAuditPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');

  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const targets = useMemo(
    () => Array.from(new Set(logs.map((l) => l.targetType))).sort(),
    [logs],
  );

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        if (actionFilter && log.action !== actionFilter) return false;
        if (targetFilter && log.targetType !== targetFilter) return false;
        return true;
      }),
    [logs, actionFilter, targetFilter],
  );

  const loadLogs = async (current: AdminSession) => {
    const endpoint =
      current.user.role === 'superadmin' ? 'auth/super/action-logs?limit=120' : 'auth/admin/action-logs?limit=120';
    const resp = await adminApi<ActionLog[]>(current, endpoint);
    setLogs(resp || []);
  };

  useEffect(() => {
    const current = getAdminSession();
    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await loadLogs(current);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar la auditoría de acciones');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  if (loading) return <main className="admin-loading">Cargando auditoría de acciones...</main>;

  return (
    <main className="admin-page">
      <h1 className="admin-title">Auditoría de acciones</h1>
      <p className="admin-subtitle">Rol activo: {session?.user?.role}</p>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

      <div className="admin-card admin-actions">
        <label>
          Acción:
          <select className="admin-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">Todas</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>

        <label>
          Recurso:
          <select className="admin-select" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
            <option value="">Todos</option>
            {targets.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
        </label>

        <button
          className="admin-btn admin-btn-primary"
          onClick={async () => {
            if (!session) return;
            setError('');
            try {
              await loadLogs(session);
            } catch (e: any) {
              setError(e?.message || 'No se pudo refrescar');
            }
          }}
        >
          Refrescar
        </button>
      </div>

      <section className="admin-card">
        <h3 className="admin-card-title">Eventos ({filtered.length})</h3>
        <ul className="admin-list">
          {filtered.map((log) => (
            <li key={log.id} className="admin-list-item">
              {new Date(log.createdAt).toLocaleString('es-AR')} · <b>{log.action}</b> · {log.targetType}
              {log.targetId ? `:${log.targetId}` : ''} · {log.userEmail} ({log.userRole})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
