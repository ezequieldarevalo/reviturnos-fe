'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { AdminSession, getAdminSession } from 'lib/adminAuth';

type AppointmentData = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  datos?: {
    customerName?: string;
    customerEmail?: string;
    vehicleDomain?: string;
    vehicleType?: string;
    price?: number;
  };
  cobro?: {
    method?: string;
    amount?: number;
    reference?: string;
  };
};

type ReprogSlot = {
  id: string;
  fecha: string;
  hora: string;
};

type DayAppointment = {
  id: string;
  fecha: string;
  hora: string;
  estado: string;
  datos?: {
    customerName?: string;
    vehicleDomain?: string;
  };
};

export default function ManageAppointmentsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchId, setSearchId] = useState('');
  const [searchDomain, setSearchDomain] = useState('');
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);

  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLine, setNewLine] = useState('');
  const [reprogSlots, setReprogSlots] = useState<ReprogSlot[]>([]);
  const [reprogDay, setReprogDay] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentTx, setPaymentTx] = useState('');

  const [dayAppointments, setDayAppointments] = useState<DayAppointment[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const hasAppointment = useMemo(() => !!appointment?.id, [appointment?.id]);
  const canMutate = useMemo(
    () => session?.user?.role === 'admin' || session?.user?.role === 'operator',
    [session?.user?.role],
  );
  const availableStatuses = useMemo(
    () => Array.from(new Set(dayAppointments.map((a) => a.estado))).sort(),
    [dayAppointments],
  );
  const filteredDayAppointments = useMemo(
    () =>
      statusFilter === 'ALL'
        ? dayAppointments
        : dayAppointments.filter((a) => a.estado === statusFilter),
    [dayAppointments, statusFilter],
  );
  const availableReprogDays = useMemo(
    () => Array.from(new Set(reprogSlots.map((slot) => slot.fecha))).sort(),
    [reprogSlots],
  );
  const reprogSlotsByDay = useMemo(
    () => reprogSlots.filter((slot) => !reprogDay || slot.fecha === reprogDay),
    [reprogSlots, reprogDay],
  );

  const loadDayAppointments = async (currentSession: AdminSession) => {
    const resp = await adminApi<{ turnosDia: DayAppointment[] }>(currentSession, 'auth/turDiaAct');
    setDayAppointments(resp?.turnosDia || []);
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
      try {
        await loadDayAppointments(current);
      } catch (_e) {
        // ignore and keep manual search available
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const refreshById = async (id: string) => {
    if (!session) return;
    const data = await adminApi<AppointmentData>(
      session,
      `auth/turId?id_turno=${encodeURIComponent(id)}`,
    );
    setAppointment(data);

    const vehicleType = data?.datos?.vehicleType;
    if (vehicleType) {
      try {
        const slots = await adminApi<{ turnos: ReprogSlot[] }>(
          session,
          `auth/obtTurRep?tipo_vehiculo=${encodeURIComponent(vehicleType)}`,
        );
        setReprogSlots(slots?.turnos || []);
        setReprogDay('');
      } catch (_e) {
        setReprogSlots([]);
      }
    } else {
      setReprogSlots([]);
    }
  };

  const findById = async () => {
    if (!session || !searchId.trim()) return;
    try {
      clearMessages();
      const data = await adminApi<AppointmentData>(
        session,
        `auth/turId?id_turno=${encodeURIComponent(searchId.trim())}`,
      );
      setAppointment(data);
      await loadDayAppointments(session);
    } catch (e: any) {
      setAppointment(null);
      setError(e?.message || 'No se encontró el turno');
    }
  };

  const findByDomain = async () => {
    if (!session || !searchDomain.trim()) return;
    try {
      clearMessages();
      const data = await adminApi<AppointmentData>(
        session,
        `auth/turDom?dominio=${encodeURIComponent(searchDomain.trim().toUpperCase())}`,
      );
      setAppointment(data);
      setSearchId(data.id);
      await loadDayAppointments(session);
    } catch (e: any) {
      setAppointment(null);
      setError(e?.message || 'No se encontró el turno por dominio');
    }
  };

  const doMarkCompleted = async () => {
    if (!session || !appointment?.id) return;
    try {
      clearMessages();
      await adminApi(session, 'auth/regRealTur', {
        method: 'POST',
        body: { id_turno: appointment.id },
      });
      setSuccess('Turno marcado como realizado');
      await refreshById(appointment.id);
      await loadDayAppointments(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo marcar como realizado');
    }
  };

  const doRegisterPayment = async () => {
    if (!session || !appointment?.id) return;
    try {
      clearMessages();
      await adminApi(session, 'auth/regPag', {
        method: 'POST',
        body: {
          turno_id: appointment.id,
          metodo: paymentMethod,
          referencia: paymentRef || undefined,
          transaction_id: paymentTx || undefined,
        },
      });
      setSuccess('Pago registrado');
      await refreshById(appointment.id);
      await loadDayAppointments(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo registrar el pago');
    }
  };

  const doReschedule = async () => {
    if (!session || !appointment?.id || !newDate || !newTime) return;
    try {
      clearMessages();
      const resp = await adminApi<{ turno_id: string }>(session, 'auth/repTur', {
        method: 'POST',
        body: {
          turno_id: appointment.id,
          nueva_fecha: newDate,
          nueva_hora: newTime,
          nueva_linea: newLine ? Number(newLine) : undefined,
        },
      });
      const newId = resp?.turno_id || appointment.id;
      setSearchId(newId);
      setSuccess('Turno reprogramado');
      await refreshById(newId);
      await loadDayAppointments(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo reprogramar el turno');
    }
  };

  const doRescheduleBySlot = async (newTurnoId: string) => {
    if (!session || !appointment?.id || !newTurnoId) return;
    try {
      clearMessages();
      const resp = await adminApi<{ turno_id?: string }>(session, 'auth/repTur', {
        method: 'POST',
        body: {
          id_turno_ant: appointment.id,
          id_turno_nuevo: newTurnoId,
        },
      });
      const updatedId = resp?.turno_id || newTurnoId;
      setSearchId(updatedId);
      setSuccess('Turno reprogramado por disponibilidad');
      await refreshById(updatedId);
      await loadDayAppointments(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo reprogramar por disponibilidad');
    }
  };

  if (loading) return <main className="admin-loading">Cargando...</main>;

  return (
    <main className="admin-page">
      <h1 className="admin-title">Planta · Gestionar turnos</h1>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success">{success}</div> : null}

      <section className="admin-card">
        <h3 className="admin-card-title">Turnos del día</h3>
        <div style={{ marginBottom: 8 }}>
          <label>
            Estado:
            <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">Todos</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="admin-list">
          {filteredDayAppointments.map((row) => (
            <li key={row.id} className="admin-list-item">
              {row.hora} · {row.estado} · {row.datos?.customerName || '-'} ·{' '}
              {(row.datos?.vehicleDomain || '-').toUpperCase()}{' '}
              <button
                className="admin-btn admin-btn-secondary"
                onClick={async () => {
                  setSearchId(row.id);
                  setSearchDomain('');
                  await refreshById(row.id);
                }}
              >
                Abrir
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h3 className="admin-card-title">Buscar turno</h3>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '2fr auto 2fr auto' }}>
          <input
            className="admin-input"
            placeholder="ID turno"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button className="admin-btn admin-btn-primary" onClick={findById}>Buscar por ID</button>

          <input
            className="admin-input"
            placeholder="Dominio (ej: ABC123)"
            value={searchDomain}
            onChange={(e) => setSearchDomain(e.target.value.toUpperCase())}
          />
          <button className="admin-btn admin-btn-primary" onClick={findByDomain}>Buscar por dominio</button>
        </div>
      </section>

      {hasAppointment ? (
        <>
          <section className="admin-card">
            <h3 className="admin-card-title">Turno encontrado</h3>
            <p>
              <b>ID:</b> {appointment?.id}
              <br />
              <b>Fecha/Hora:</b> {appointment?.appointmentDate} {appointment?.appointmentTime}
              <br />
              <b>Estado:</b> {appointment?.status}
              <br />
              <b>Cliente:</b> {appointment?.datos?.customerName || '-'}
              <br />
              <b>Dominio:</b> {(appointment?.datos?.vehicleDomain || '-').toUpperCase()}
              <br />
              <b>Vehículo:</b> {appointment?.datos?.vehicleType || '-'}
            </p>
          </section>

          {canMutate ? (
            <section className="admin-card">
              <h3 className="admin-card-title">Acciones</h3>

              <div style={{ marginBottom: 10 }}>
                <button className="admin-btn admin-btn-primary" onClick={doMarkCompleted}>Marcar como realizado</button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <h4 style={{ marginBottom: 6 }}>Registrar pago</h4>
                <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                  <select className="admin-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="efectivo">efectivo</option>
                    <option value="mercadopago">mercadopago</option>
                    <option value="transferencia">transferencia</option>
                  </select>
                  <input
                    className="admin-input"
                    placeholder="Referencia"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />
                  <input
                    className="admin-input"
                    placeholder="Transaction ID"
                    value={paymentTx}
                    onChange={(e) => setPaymentTx(e.target.value)}
                  />
                  <button className="admin-btn admin-btn-primary" onClick={doRegisterPayment}>Registrar pago</button>
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: 6 }}>Reprogramar</h4>
                <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                  <input className="admin-input" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  <input className="admin-input" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                  <input
                    className="admin-input"
                    placeholder="Línea (opcional)"
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                  />
                  <button className="admin-btn admin-btn-primary" onClick={doReschedule} disabled={!newDate || !newTime}>
                    Reprogramar
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <h4 style={{ marginBottom: 6 }}>Reprogramar por disponibilidad (legacy)</h4>
                {reprogSlots.length ? (
                  <>
                    <label>
                      Día:
                      <select className="admin-select" value={reprogDay} onChange={(e) => setReprogDay(e.target.value)}>
                        <option value="">Seleccionar</option>
                        {availableReprogDays.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="admin-actions" style={{ marginTop: 8 }}>
                      {reprogSlotsByDay.map((slot) => (
                        <button
                          key={slot.id}
                          className="admin-btn admin-btn-secondary"
                          onClick={() => doRescheduleBySlot(slot.id)}
                        >
                          {slot.hora?.slice(0, 5) || slot.hora}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, color: '#5f6d8f' }}>No hay disponibilidad cargada para este tipo de vehículo.</p>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
