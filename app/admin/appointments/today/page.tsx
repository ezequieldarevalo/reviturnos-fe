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
    nombre?: string;
    customerName?: string;
    dominio?: string;
    vehicleDomain?: string;
    telefono?: string;
    customerPhone?: string;
    email?: string;
    tipo_vehiculo?: string;
    marca?: string;
    modelo?: string;
    anio?: number | string;
    combustible?: string;
  };
  cobro?: {
    fecha?: string;
    amount?: number;
    monto?: number;
    method?: string;
    metodo?: string;
    reference?: string;
    nro_op?: string;
    status?: string;
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
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const estadoLabel = (estado?: string) => {
    if (!estado) return '-';
    if (estado === 'C') return 'Confirmado';
    if (estado === 'P') return 'Pago';
    if (estado === 'A') return 'Resultado - Apto';
    if (estado === 'K') return 'Resultado - Condicional';
    if (estado === 'F') return 'Resultado - Rechazado';
    if (estado === 'T') return 'Realizado';
    return estado;
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

  const openTurnoDetail = async (idTurno: string) => {
    if (!session) return;
    try {
      setError('');
      setDetailLoading(true);
      const detail = await adminApi<Turno>(session, 'auth/tur', {
        method: 'POST',
        body: { id_turno: idTurno },
      });
      setSelectedTurno(detail || null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el detalle del turno');
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <main className="admin-loading">Cargando turnos...</main>;

  return (
    <main className="admin-page">
      <h1 className="admin-title">Planta · Turnos</h1>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

      <section className="today-card">
        <div className="today-toolbar">
          <label className="today-label">
            Día
            <select className="today-select" value={selectedDate} onChange={(e) => loadByDate(e.target.value)}>
              <option value="">Hoy</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {toDateLabel(d)}
                </option>
              ))}
            </select>
          </label>

          <div className="today-actions">
            <button className="today-btn today-btn-light" onClick={() => loadByDate(selectedDate)}>
              Actualizar
            </button>
            <button className="today-btn today-btn-primary" onClick={() => window.print()}>
              Imprimir
            </button>
          </div>
        </div>
      </section>

      <section className="today-card">
        <h3 className="admin-card-title">Listado ({turnos.length})</h3>
        {!turnos.length ? (
          <p className="today-empty">No hay turnos para el día seleccionado.</p>
        ) : (
          <div className="today-table-wrap">
            <table className="today-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Cliente</th>
                  <th>Dominio</th>
                  <th>Teléfono</th>
                  <th>Pago</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((t) => (
                  <tr key={t.id}>
                    <td>{toDateLabel(t.fecha)}</td>
                    <td>{toHourLabel(t.hora)}</td>
                    <td>{estadoLabel(t.estado)}</td>
                    <td>{t.datos?.customerName || t.datos?.nombre || '-'}</td>
                    <td>{(t.datos?.vehicleDomain || t.datos?.dominio || '-').toUpperCase()}</td>
                    <td>{t.datos?.customerPhone || t.datos?.telefono || '-'}</td>
                    <td>${Number(t.cobro?.amount ?? t.cobro?.monto ?? 0).toLocaleString('es-AR')}</td>
                    <td>
                      <button className="today-btn today-btn-light" onClick={() => openTurnoDetail(t.id)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedTurno ? (
        <div className="modal-backdrop" onClick={() => setSelectedTurno(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Detalle del turno #{selectedTurno.id}</h3>
              <button className="today-btn today-btn-light" onClick={() => setSelectedTurno(null)}>
                Cerrar
              </button>
            </div>

            <div className="modal-grid">
              <section>
                <h4>Turno</h4>
                <p><b>Fecha:</b> {toDateLabel(selectedTurno.fecha)}</p>
                <p><b>Hora:</b> {toHourLabel(selectedTurno.hora)}</p>
                <p><b>Estado:</b> {estadoLabel(selectedTurno.estado)}</p>
              </section>

              <section>
                <h4>Cliente / Vehículo</h4>
                <p><b>Nombre:</b> {selectedTurno.datos?.customerName || selectedTurno.datos?.nombre || '-'}</p>
                <p><b>Email:</b> {selectedTurno.datos?.email || '-'}</p>
                <p><b>Tel:</b> {selectedTurno.datos?.customerPhone || selectedTurno.datos?.telefono || '-'}</p>
                <p><b>Dominio:</b> {(selectedTurno.datos?.vehicleDomain || selectedTurno.datos?.dominio || '-').toUpperCase()}</p>
                <p><b>Tipo vehículo:</b> {selectedTurno.datos?.tipo_vehiculo || '-'}</p>
                <p><b>Marca/Modelo:</b> {selectedTurno.datos?.marca || '-'} / {selectedTurno.datos?.modelo || '-'}</p>
                <p><b>Año / Combustible:</b> {selectedTurno.datos?.anio || '-'} / {selectedTurno.datos?.combustible || '-'}</p>
              </section>

              <section>
                <h4>Pago</h4>
                <p><b>Monto:</b> ${Number(selectedTurno.cobro?.amount ?? selectedTurno.cobro?.monto ?? 0).toLocaleString('es-AR')}</p>
                <p><b>Método:</b> {selectedTurno.cobro?.method || selectedTurno.cobro?.metodo || '-'}</p>
                <p><b>Referencia:</b> {selectedTurno.cobro?.reference || selectedTurno.cobro?.nro_op || '-'}</p>
                <p><b>Estado:</b> {selectedTurno.cobro?.status || '-'}</p>
                <p><b>Fecha pago:</b> {selectedTurno.cobro?.fecha || '-'}</p>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {detailLoading ? <div className="admin-alert">Cargando detalle...</div> : null}

      <style jsx>{`
        .today-card {
          background: #fff;
          border: 1px solid #dbe5fb;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 8px 22px rgba(34, 66, 150, 0.08);
          margin-bottom: 14px;
        }

        .today-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: flex-end;
          justify-content: space-between;
        }

        .today-label {
          min-width: 230px;
          display: grid;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
          color: #31436a;
        }

        .today-select {
          width: 100%;
          min-height: 42px;
          border-radius: 10px;
          border: 1px solid #c8d6f8;
          background: #fff;
          padding: 9px 11px;
          font-size: 14px;
          color: #1f2d4f;
          outline: none;
        }

        .today-select:focus {
          border-color: #7ea0ff;
          box-shadow: 0 0 0 3px rgba(65, 120, 255, 0.16);
        }

        .today-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .today-btn {
          min-height: 42px;
          border-radius: 10px;
          padding: 0 14px;
          border: 1px solid transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
        }

        .today-btn-light {
          background: #f1f5ff;
          border-color: #d4dfff;
          color: #294288;
        }

        .today-btn-primary {
          background: linear-gradient(135deg, #265ee9 0%, #5a2ce0 100%);
          color: #fff;
        }

        .today-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .today-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          color: #24365d;
        }

        .today-table th,
        .today-table td {
          border-bottom: 1px solid #e6ecfb;
          padding: 10px 8px;
          text-align: left;
          vertical-align: middle;
        }

        .today-table th {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: #5b6f9e;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.48);
          display: grid;
          place-items: center;
          z-index: 50;
          padding: 20px;
        }

        .modal-card {
          width: min(920px, 100%);
          max-height: 88vh;
          overflow: auto;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #dbe5fb;
          box-shadow: 0 18px 50px rgba(19, 39, 89, 0.35);
          padding: 16px;
        }

        .modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .modal-head h3 {
          margin: 0;
          color: #1c2c55;
        }

        .modal-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .modal-grid section {
          border: 1px solid #e1e8fa;
          border-radius: 12px;
          background: #f8faff;
          padding: 12px;
        }

        .modal-grid h4 {
          margin: 0 0 8px;
          color: #1e3364;
          font-size: 14px;
        }

        .modal-grid p {
          margin: 4px 0;
          font-size: 13px;
          color: #2c3e67;
        }

        .today-empty {
          margin: 0;
          color: #6a7898;
          font-size: 14px;
        }

        @media (max-width: 980px) {
          .modal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
