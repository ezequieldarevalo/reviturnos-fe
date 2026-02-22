'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { getAdminSession, AdminSession } from 'lib/adminAuth';

type Turno = {
  id: string;
  fecha?: string;
  hora?: string;
  appointmentDate?: string;
  appointmentTime?: string;
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
  const [expandedTurnoId, setExpandedTurnoId] = useState<string | null>(null);
  const [turnoDetails, setTurnoDetails] = useState<Record<string, Turno>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

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

  const toDateTimeLabel = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.toLocaleDateString('es-AR')} ${parsed.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
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

  const pagoMetodoLabel = (metodo?: string) => {
    if (!metodo) return '-';
    const raw = metodo.trim();
    const [methodPart, ...rest] = raw.split(/\s-\s/);
    const suffix = rest.length ? ` - ${rest.join(' - ')}` : '';
    const key = methodPart
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');
    const map: Record<string, string> = {
      credit_card: 'Tarjeta de crédito',
      debit_card: 'Tarjeta de débito',
      prepaid_card: 'Tarjeta prepaga',
      account_money: 'Dinero en cuenta',
      bank_transfer: 'Transferencia bancaria',
      ticket: 'Pago en efectivo',
      atm: 'Cajero automático',
      digital_currency: 'Moneda digital',
      wallet_purchase: 'Billetera digital',
      mercadopago: 'Mercado Pago',
      transferencia: 'Transferencia',
      efectivo: 'Efectivo',
    };
    const normalized = map[key] || methodPart.replace(/_/g, ' ');
    return `${normalized}${suffix}`;
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const handlePrintBasic = () => {
    const rows = turnos
      .map((t) => {
        const fecha = toDateLabel(t.fecha || t.appointmentDate);
        const hora = toHourLabel(t.hora || t.appointmentTime);
        const estado = estadoLabel(t.estado);
        const cliente = t.datos?.customerName || t.datos?.nombre || '-';
        const dominio = (t.datos?.vehicleDomain || t.datos?.dominio || '-').toUpperCase();
        const pago = `$${Number(t.cobro?.amount ?? t.cobro?.monto ?? 0).toLocaleString('es-AR')}`;

        return `<tr>
          <td>${escapeHtml(fecha)}</td>
          <td>${escapeHtml(hora)}</td>
          <td>${escapeHtml(estado)}</td>
          <td>${escapeHtml(cliente)}</td>
          <td>${escapeHtml(dominio)}</td>
          <td>${escapeHtml(pago)}</td>
        </tr>`;
      })
      .join('');

    const titleDate = selectedDate ? toDateLabel(selectedDate) : 'Hoy';
    const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Turnos ${escapeHtml(titleDate)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 18px; color: #1f2d4f; }
          h1 { margin: 0 0 6px; font-size: 20px; }
          p { margin: 0 0 12px; color: #4e5e84; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cfd8ee; padding: 8px; text-align: left; font-size: 13px; }
          th { background: #eef3ff; }
        </style>
      </head>
      <body>
        <h1>Turnos del día</h1>
        <p>Día: ${escapeHtml(titleDate)} · Total: ${turnos.length}</p>
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Hora</th><th>Estado</th><th>Cliente</th><th>Dominio</th><th>Pago</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 500);
    }, 120);
  };

  const goToManage = (turno: Turno) => {
    const qs = new URLSearchParams();
    if (turno.id) qs.set('id', turno.id);
    const domain = (turno.datos?.vehicleDomain || turno.datos?.dominio || '').toUpperCase();
    if (domain) qs.set('domain', domain);
    router.push(`/admin/appointments/manage${qs.toString() ? `?${qs.toString()}` : ''}`);
  };

  const pagoEstadoLabel = (estado?: string) => {
    if (!estado) return '-';
    const key = estado.toLowerCase();
    const map: Record<string, string> = {
      approved: 'Aprobado',
      pending: 'Pendiente',
      authorized: 'Autorizado',
      in_process: 'En proceso',
      in_mediation: 'En mediación',
      rejected: 'Rechazado',
      cancelled: 'Cancelado',
      refunded: 'Reintegrado',
      charged_back: 'Contracargo',
    };
    return map[key] || estado.replace(/_/g, ' ');
  };

  const loadToday = async (current: AdminSession) => {
    const resp = await adminApi<{ turnosDia: Turno[]; diasFuturos: any[] }>(current, 'auth/turDiaAct');
    const normalizedDates = (resp?.diasFuturos || [])
      .map((d: any) => (typeof d === 'string' ? d : d?.fecha || ''))
      .filter(Boolean);
    setTurnos(resp?.turnosDia || []);
    setTurnoDetails({});
    setExpandedTurnoId(null);
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
      setTurnoDetails({});
      setExpandedTurnoId(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar turnos del día');
    }
  };

  const toggleTurnoDetail = async (idTurno: string) => {
    if (expandedTurnoId === idTurno) {
      setExpandedTurnoId(null);
      return;
    }

    setExpandedTurnoId(idTurno);
    if (turnoDetails[idTurno]) return;
    if (!session) return;

    try {
      setError('');
      setDetailLoadingId(idTurno);
      const detail = await adminApi<Turno>(session, 'auth/tur', {
        method: 'POST',
        body: { id_turno: idTurno },
      });

      if (detail) {
        setTurnoDetails((prev) => ({ ...prev, [idTurno]: detail }));
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el detalle del turno');
    } finally {
      setDetailLoadingId(null);
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
            <button className="today-btn today-btn-primary" onClick={handlePrintBasic}>
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
          <div className="today-cards">
            {turnos.map((t) => {
              const detail = turnoDetails[t.id] || t;
              const isExpanded = expandedTurnoId === t.id;
              return (
                <article className="today-turno-card" key={t.id}>
                  <div className="today-turno-head">
                    <div className="today-turno-summary">
                      <span className="today-summary-item"><b>Hora:</b> {toHourLabel(t.hora || t.appointmentTime)}</span>
                      <span className="today-summary-item"><b>Dominio:</b> {(t.datos?.vehicleDomain || t.datos?.dominio || '-').toUpperCase()}</span>
                      <span className="today-summary-item"><b>Cliente:</b> {t.datos?.customerName || t.datos?.nombre || '-'}</span>
                      <span className="today-summary-item"><b>Estado pago:</b> {pagoEstadoLabel(t.cobro?.status)}</span>
                      <span className="today-summary-item"><b>Vehículo:</b> {t.datos?.tipo_vehiculo || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        className="today-btn today-btn-light"
                        onClick={() => toggleTurnoDetail(t.id)}
                        aria-label={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                        title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                        style={{ minWidth: 42, width: 42, padding: 0 }}
                      >
                        {isExpanded ? '▴' : '▾'}
                      </button>
                      <button
                        className="today-btn today-btn-primary"
                        onClick={() => goToManage(t)}
                        aria-label="Gestionar turno"
                        title="Gestionar turno"
                        style={{ minWidth: 42, width: 42, padding: 0 }}
                      >
                        ⚙
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="today-detail-grid">
                      <section>
                        <h4>Turno</h4>
                        <p><b>ID:</b> {detail.id}</p>
                        <p><b>Fecha:</b> {toDateLabel(detail.fecha || detail.appointmentDate)}</p>
                        <p><b>Hora:</b> {toHourLabel(detail.hora || detail.appointmentTime)}</p>
                        <p><b>Estado:</b> {estadoLabel(detail.estado)}</p>
                      </section>

                      <section>
                        <h4>Cliente / Vehículo</h4>
                        <p><b>Nombre:</b> {detail.datos?.customerName || detail.datos?.nombre || '-'}</p>
                        <p><b>Email:</b> {detail.datos?.email || '-'}</p>
                        <p><b>Tel:</b> {detail.datos?.customerPhone || detail.datos?.telefono || '-'}</p>
                        <p><b>Dominio:</b> {(detail.datos?.vehicleDomain || detail.datos?.dominio || '-').toUpperCase()}</p>
                        <p><b>Tipo vehículo:</b> {detail.datos?.tipo_vehiculo || '-'}</p>
                        <p><b>Marca/Modelo:</b> {detail.datos?.marca || '-'} / {detail.datos?.modelo || '-'}</p>
                      </section>

                      <section>
                        <h4>Pago</h4>
                        <p><b>Monto:</b> ${Number(detail.cobro?.amount ?? detail.cobro?.monto ?? 0).toLocaleString('es-AR')}</p>
                        <p><b>Método:</b> {pagoMetodoLabel(detail.cobro?.method || detail.cobro?.metodo)}</p>
                        <p><b>Referencia:</b> {detail.cobro?.reference || detail.cobro?.nro_op || '-'}</p>
                        <p><b>Estado:</b> {pagoEstadoLabel(detail.cobro?.status)}</p>
                        <p><b>Fecha pago:</b> {toDateTimeLabel(detail.cobro?.fecha)}</p>
                      </section>
                    </div>
                  ) : null}

                  {detailLoadingId === t.id ? <p className="today-loading">Cargando detalle...</p> : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

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

        .today-cards {
          display: grid;
          gap: 10px;
        }

        .today-turno-card {
          border: 1px solid #dce6fb;
          border-radius: 12px;
          background: #fbfdff;
          padding: 10px;
        }

        .today-turno-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          flex-wrap: nowrap;
        }

        .today-turno-summary {
          display: flex;
          gap: 8px;
          width: 100%;
          overflow-x: auto;
          white-space: nowrap;
        }

        .today-summary-item {
          border: 1px solid #e1e8fa;
          border-radius: 8px;
          background: #f7f9ff;
          padding: 6px 8px;
          color: #2b3d67;
          font-size: 13px;
        }

        .today-detail-grid {
          margin-top: 10px;
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .today-detail-grid section {
          border: 1px solid #e1e8fa;
          border-radius: 12px;
          background: #f8faff;
          padding: 10px;
        }

        .today-detail-grid h4 {
          margin: 0 0 8px;
          color: #1e3364;
          font-size: 14px;
        }

        .today-detail-grid p {
          margin: 4px 0;
          font-size: 13px;
          color: #2c3e67;
        }

        .today-loading {
          margin: 8px 0 0;
          color: #5e6f96;
          font-size: 13px;
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
          .today-turno-head {
            flex-wrap: wrap;
          }

          .today-detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
