'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { getAdminSession, AdminSession } from 'lib/adminAuth';

type Turno = {
  id: string;
  fecha: string;
  hora: string;
  estado: string;
  datos?: {
    customerName?: string;
    vehicleDomain?: string;
    telefono?: string;
    customerPhone?: string;
  };
  cobro?: {
    amount?: number;
    monto?: number;
  } | null;
};

export default function TodayAppointmentsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [turnos, setTurnos] = useState<Turno[]>([]);

  const loadToday = async (current: AdminSession) => {
    const resp = await adminApi<{ turnosDia: Turno[]; diasFuturos: string[] }>(current, 'auth/turDiaAct');
    setTurnos(resp?.turnosDia || []);
    setDates(resp?.diasFuturos || []);
    setSelectedDate('');
  };

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

    setSession(current);

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await loadToday(current);
      } catch (e: any) {
        setError(e?.message || 'No se pudieron cargar turnos');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const loadByDate = async (dia: string) => {
    if (!session) return;
    try {
      setError('');
      setSelectedDate(dia);
      if (!dia) {
        await loadToday(session);
        return;
      }
      const resp = await adminApi<Turno[]>(session, `auth/turDiaFut?dia=${encodeURIComponent(dia)}`);
      setTurnos(resp || []);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar turnos del día');
    }
  };

  if (loading) return <main className="admin-loading">Cargando turnos...</main>;

  return (
    <main className="admin-page">
      <h1 className="admin-title">Planta · Turnos</h1>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

      <div className="admin-card">
        <div className="admin-actions">
          <label style={{ minWidth: 220 }}>
            Día:
            <select className="admin-select" value={selectedDate} onChange={(e) => loadByDate(e.target.value)}>
              <option value="">Hoy</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-btn admin-btn-secondary" onClick={() => loadByDate(selectedDate)}>
            Actualizar
          </button>
          <button className="admin-btn admin-btn-primary" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
      </div>

      <section className="admin-card">
        <h3 className="admin-card-title">Listado ({turnos.length})</h3>
        <ul className="admin-list">
          {turnos.map((t) => (
            <li key={t.id} className="admin-list-item">
              {t.fecha} {t.hora} · {t.estado} · {t.datos?.customerName || '-'} ·{' '}
              {(t.datos?.vehicleDomain || '-').toUpperCase()} · Tel: {t.datos?.customerPhone || t.datos?.telefono || '-'} · Pago: $
              {Number(t.cobro?.amount ?? t.cobro?.monto ?? 0).toLocaleString('es-AR')}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
