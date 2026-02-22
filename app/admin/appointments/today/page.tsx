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
  };
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

  if (loading) return <main>Cargando turnos...</main>;

  return (
    <main>
      <h1>Planta · Turnos</h1>

      {error ? <div style={{ color: '#b00020', marginBottom: 10 }}>{error}</div> : null}

      <div style={{ marginBottom: 12 }}>
        <label>
          Día: 
          <select value={selectedDate} onChange={(e) => loadByDate(e.target.value)}>
            <option value="">Hoy</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section style={{ border: '1px solid #ddd', padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Listado ({turnos.length})</h3>
        <ul>
          {turnos.map((t) => (
            <li key={t.id}>
              {t.fecha} {t.hora} · {t.estado} · {t.datos?.customerName || '-'} ·{' '}
              {(t.datos?.vehicleDomain || '-').toUpperCase()}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
