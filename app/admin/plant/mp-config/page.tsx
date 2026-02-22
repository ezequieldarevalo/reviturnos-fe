'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { getAdminSession, AdminSession } from 'lib/adminAuth';

export default function PlantMpConfigPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const current = getAdminSession();
    if (!current) {
      router.replace('/login');
      return;
    }

    if (current.user.role === 'superadmin') {
      router.replace('/admin/super/plants');
      return;
    }

    if (current.user.role !== 'admin') {
      router.replace('/admin/appointments/today');
      return;
    }

    setSession(current);

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const config = await adminApi<any>(current, 'auth/admin/mp-config');
        setConfigured(!!config?.configured);
        setEnabled(!!config?.enabled);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar la configuración');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const save = async () => {
    if (!session) return;
    try {
      setError('');
      await adminApi(session, 'auth/admin/mp-config', {
        method: 'POST',
        body: { enabled },
      });
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar la configuración');
    }
  };

  if (loading) return <main className="admin-loading">Cargando configuración...</main>;

  return (
    <main className="admin-page">
      <h1 className="admin-title">Planta · MercadoPago</h1>
      <p className="admin-subtitle">Planta activa en sesión: {session?.plantCode}</p>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

      <section className="admin-card">
        <h3 className="admin-card-title">Configuración</h3>
        <p>Token configurado: <b>{configured ? 'Sí' : 'No'}</b></p>

        <label className="admin-inline">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Habilitado
        </label>

        <div style={{ marginTop: 12 }}>
          <button className="admin-btn admin-btn-primary" onClick={save}>
            Guardar
          </button>
        </div>
      </section>
    </main>
  );
}
