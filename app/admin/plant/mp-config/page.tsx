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

  if (loading) return <main>Cargando configuración...</main>;

  return (
    <main>
      <h1>Planta · MercadoPago</h1>
      <p>Planta activa en sesión: {session?.plantCode}</p>
      <p>Token configurado: {configured ? 'Sí' : 'No'}</p>

      {error ? <div style={{ color: '#b00020', marginBottom: 10 }}>{error}</div> : null}

      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Habilitado
      </label>

      <button style={{ marginTop: 10 }} onClick={save}>
        Guardar
      </button>
    </main>
  );
}
