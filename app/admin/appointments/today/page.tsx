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

  const toDateLabel = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('es-AR');
    }
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    return value;
  };

  const toHourLabel = (value?: string) => {
    if (!value) return '--:--';
    const hourMatch = value.match(/^(\d{2}:\d{2})/);
    if (hourMatch) return hourMatch[1];
    return value;
  };

  const loadToday = async (current: AdminSession) => {
    const resp = await adminApi<{ turnosDia: Turno[]; diasFuturos: any[] }>(current, 'auth/turDiaAct');
    const normalizedDates = (resp?.diasFuturos || [])
      .map((d: any) => (typeof d === 'string' ? d : d?.fecha || ''))
      .filter(Boolean);
    setTurnos(resp?.turnosDia || []);
    setDates(normalizedDates);
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
    <main className="admin-page space-y-4">
      <h1 className="admin-title">Planta · Turnos</h1>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

      <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-lg shadow-blue-100/40">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] text-sm font-semibold text-slate-700">
            Día
            <select
              className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-[15px] text-slate-900 outline-none transition focus:ring-4 focus:ring-blue-100"
              value={selectedDate}
              onChange={(e) => loadByDate(e.target.value)}
            >
              <option value="">Hoy</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {toDateLabel(d)}
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-800 transition hover:bg-blue-100"
            onClick={() => loadByDate(selectedDate)}
          >
            Actualizar
          </button>
          <button
            className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-violet-700"
            onClick={() => window.print()}
          >
            Imprimir
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-lg shadow-blue-100/40">
        <h3 className="admin-card-title">Listado ({turnos.length})</h3>
        <ul className="space-y-2">
          {turnos.map((t) => (
            <li key={t.id} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[15px] leading-6 text-slate-800">
              <span className="font-semibold">{toDateLabel(t.fecha)}</span> {toHourLabel(t.hora)} · {t.estado} · {t.datos?.customerName || '-'} ·{' '}
              {(t.datos?.vehicleDomain || '-').toUpperCase()} · Tel: {t.datos?.customerPhone || t.datos?.telefono || '-'} · Pago: $
              {Number(t.cobro?.amount ?? t.cobro?.monto ?? 0).toLocaleString('es-AR')}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
