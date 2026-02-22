'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { AdminSession, getAdminSession } from 'lib/adminAuth';

type TurnoDia = {
  id: string;
  fecha: string;
  hora: string;
  estado: string;
  datos?: {
    customerName?: string;
    vehicleDomain?: string;
  };
  cobro?: {
    amount?: number;
    method?: string;
    reference?: string;
    status?: string;
  } | null;
};

export default function PaymentsAuditPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [turnos, setTurnos] = useState<TurnoDia[]>([]);

  const toDateLabel = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('es-AR');
    }
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    return value;
  };

  const paidRows = useMemo(() => turnos.filter((t) => !!t.cobro), [turnos]);
  const total = useMemo(
    () => paidRows.reduce((acc, row) => acc + Number(row.cobro?.amount || 0), 0),
    [paidRows],
  );

  const loadToday = async (current: AdminSession) => {
    const resp = await adminApi<{ turnosDia: TurnoDia[]; diasFuturos: any[] }>(current, 'auth/turDiaAct');
    const normalizedDates = (resp?.diasFuturos || [])
      .map((d: any) => (typeof d === 'string' ? d : d?.fecha || ''))
      .filter(Boolean);
    setTurnos(resp?.turnosDia || []);
    setAvailableDates(normalizedDates);
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
        setError(e?.message || 'No se pudo cargar la auditoría');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const onChangeDate = async (dia: string) => {
    if (!session) return;
    try {
      setError('');
      setSelectedDate(dia);
      if (!dia) {
        await loadToday(session);
        return;
      }
      const resp = await adminApi<TurnoDia[]>(session, `auth/turDiaFut?dia=${encodeURIComponent(dia)}`);
      setTurnos(resp || []);
    } catch (e: any) {
      setError(e?.message || 'No se pudo filtrar por fecha');
    }
  };

  const exportCsv = () => {
    const header = [
      'id_turno',
      'fecha',
      'hora',
      'cliente',
      'dominio',
      'monto',
      'metodo',
      'estado_pago',
      'referencia',
    ];

    const rows = paidRows.map((row) => [
      row.id,
      row.fecha,
      row.hora,
      row.datos?.customerName || '',
      (row.datos?.vehicleDomain || '').toUpperCase(),
      String(Number(row.cobro?.amount || 0)),
      row.cobro?.method || '',
      row.cobro?.status || '',
      row.cobro?.reference || '',
    ]);

    const csv = [header, ...rows]
      .map((line) =>
        line
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagos_${selectedDate || 'hoy'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <main className="admin-loading">Cargando auditoría...</main>;

  return (
    <main className="admin-page space-y-4">
      <h1 className="admin-title">Planta · Auditoría de pagos</h1>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

      <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-lg shadow-blue-100/40">
        <label className="block max-w-xs text-sm font-semibold text-slate-700">
          Fecha
          <select
            className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-[15px] text-slate-900 outline-none transition focus:ring-4 focus:ring-blue-100"
            value={selectedDate}
            onChange={(e) => onChangeDate(e.target.value)}
          >
            <option value="">Hoy</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {toDateLabel(date)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-lg shadow-blue-100/40 text-slate-800">
        <b>Pagos registrados:</b> {paidRows.length} · <b>Total:</b> ${total.toLocaleString('es-AR')}
        <button
          className="ml-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={exportCsv}
          disabled={!paidRows.length}
        >
          Exportar CSV
        </button>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-lg shadow-blue-100/40">
        <h3 className="admin-card-title">Detalle</h3>
        <ul className="space-y-2">
          {paidRows.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[15px] leading-6 text-slate-800">
              {toDateLabel(row.fecha)} {row.hora?.slice(0, 5) || row.hora} · {row.datos?.customerName || '-'} ·{' '}
              {(row.datos?.vehicleDomain || '-').toUpperCase()} · ${Number(row.cobro?.amount || 0).toLocaleString('es-AR')} ·{' '}
              {row.cobro?.method || '-'} · {row.cobro?.status || '-'}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
