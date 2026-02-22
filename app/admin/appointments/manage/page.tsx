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
  lineId?: string | null;
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
  const [reprogSlots, setReprogSlots] = useState<ReprogSlot[]>([]);
  const [reprogDays, setReprogDays] = useState<string[]>([]);
  const [reprogDay, setReprogDay] = useState('');
  const [reprogLoading, setReprogLoading] = useState(false);
  const [reprogModalOpen, setReprogModalOpen] = useState(false);

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
    () => (reprogDays.length ? reprogDays : Array.from(new Set(reprogSlots.map((slot) => slot.fecha))).sort()),
    [reprogSlots, reprogDays],
  );
  const reprogSlotsByDay = useMemo(
    () => reprogSlots.filter((slot) => !reprogDay || slot.fecha === reprogDay),
    [reprogSlots, reprogDay],
  );
  const manualSlotsByDate = useMemo(
    () => reprogSlots.filter((slot) => slot.fecha === newDate),
    [reprogSlots, newDate],
  );
  const manualSlotTimes = useMemo(
    () => Array.from(new Set(manualSlotsByDate.map((slot) => slot.hora))).sort(),
    [manualSlotsByDate],
  );
  const selectedManualSlot = useMemo(
    () => manualSlotsByDate.find((slot) => slot.hora === newTime) || null,
    [manualSlotsByDate, newTime],
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

  const loadRescheduleAvailability = async (turnoId: string, vehicleType?: string) => {
    if (!session) return;

    setReprogLoading(true);
    try {
      try {
        const quotesForResc = await adminApi<{ dias?: string[]; turnos?: ReprogSlot[] }>(
          session,
          'auth/getQuotesForResc',
          {
            method: 'POST',
            body: { id_turno: turnoId },
          },
        );
        const normalizedSlots = (quotesForResc?.turnos || []).filter((s) => !!s?.hora && !!s?.fecha);
        setReprogDays(quotesForResc?.dias || []);
        setReprogSlots(normalizedSlots);
        const firstDay = (quotesForResc?.dias || [])[0] || normalizedSlots[0]?.fecha || '';
        setNewDate(firstDay);
        const firstSlotForDay = normalizedSlots.find((slot) => slot.fecha === firstDay);
        setNewTime(firstSlotForDay?.hora || '');
        setReprogDay('');
        return;
      } catch (_e0) {
        // fallback below
      }

      const safeVehicleType = vehicleType || appointment?.datos?.vehicleType || (appointment as any)?.datos?.tipo_vehiculo;

      if (safeVehicleType) {
        try {
          const quotes = await adminApi<{ dias?: string[]; turnos?: ReprogSlot[] }>(
            session,
            'auth/getQuotes',
            {
              method: 'POST',
              body: { tipoVehiculo: safeVehicleType },
            },
          );
          setReprogDays(quotes?.dias || []);
          const normalizedSlots = (quotes?.turnos || []).filter((s) => !!s?.hora && !!s?.fecha);
          setReprogSlots(normalizedSlots);
          const firstDay = (quotes?.dias || [])[0] || normalizedSlots[0]?.fecha || '';
          setNewDate(firstDay);
          const firstSlotForDay = normalizedSlots.find((slot) => slot.fecha === firstDay);
          setNewTime(firstSlotForDay?.hora || '');
          setReprogDay('');
          return;
        } catch (_e1) {
          try {
            const slots = await adminApi<{ turnos: ReprogSlot[] }>(
              session,
              `auth/obtTurRep?tipo_vehiculo=${encodeURIComponent(safeVehicleType)}`,
            );
            const normalizedSlots = slots?.turnos || [];
            setReprogDays([]);
            setReprogSlots(normalizedSlots);
            const firstDay = normalizedSlots[0]?.fecha || '';
            setNewDate(firstDay);
            const firstSlotForDay = normalizedSlots.find((slot) => slot.fecha === firstDay);
            setNewTime(firstSlotForDay?.hora || '');
            setReprogDay('');
            return;
          } catch (_e2) {
            setReprogDays([]);
            setReprogSlots([]);
            setNewDate('');
            setNewTime('');
          }
        }
      }

      setReprogDays([]);
      setReprogSlots([]);
      setNewDate('');
      setNewTime('');
      setReprogDay('');
      setError('No se pudo obtener disponibilidad para reprogramar en esta planta.');
    } finally {
      setReprogLoading(false);
    }
  };

  const refreshById = async (id: string) => {
    if (!session) return;
    const data = await adminApi<AppointmentData>(
      session,
      `auth/turId?id_turno=${encodeURIComponent(id)}`,
    );
    setAppointment(data);
  };

  const findById = async () => {
    if (!session || !searchId.trim()) return;
    try {
      clearMessages();
      await refreshById(searchId.trim());
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
      const id = data?.id;
      if (!id) throw new Error('No se obtuvo ID del turno para abrir el detalle');
      setSearchId(id);
      await refreshById(id);
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
    if (!session || !appointment?.id || !newDate || !newTime || !selectedManualSlot) return;
    try {
      clearMessages();
      const payload = selectedManualSlot.id
        ? {
            id_turno_ant: appointment.id,
            id_turno_nuevo: selectedManualSlot.id,
          }
        : {
            turno_id: appointment.id,
            nueva_fecha: newDate,
            nueva_hora: newTime,
            nueva_linea: selectedManualSlot.lineId ? Number(selectedManualSlot.lineId) : undefined,
          };

      const resp = await adminApi<{ turno_id: string }>(session, 'auth/repTur', {
        method: 'POST',
        body: payload,
      });
      const newId = resp?.turno_id || appointment.id;
      setSearchId(newId);
      setSuccess('Turno reprogramado');
      setReprogModalOpen(false);
      await refreshById(newId);
      await loadDayAppointments(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo reprogramar el turno');
    }
  };

  const doRescheduleBySlot = async (slot: ReprogSlot) => {
    if (!session || !appointment?.id) return;
    try {
      clearMessages();
      const payload = slot?.id
        ? {
            id_turno_ant: appointment.id,
            id_turno_nuevo: slot.id,
          }
        : {
            turno_id: appointment.id,
            nueva_fecha: slot.fecha,
            nueva_hora: slot.hora,
            nueva_linea: slot.lineId ? Number(slot.lineId) : undefined,
          };

      const resp = await adminApi<{ turno_id?: string }>(session, 'auth/repTur', {
        method: 'POST',
        body: payload,
      });
      const updatedId = resp?.turno_id || slot.id || appointment.id;
      setSearchId(updatedId);
      setSuccess('Turno reprogramado por disponibilidad');
      setReprogModalOpen(false);
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
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={async () => {
                    if (!appointment?.id) return;
                    clearMessages();
                    setReprogModalOpen(true);
                    await loadRescheduleAvailability(
                      appointment.id,
                      appointment?.datos?.vehicleType || (appointment as any)?.datos?.tipo_vehiculo,
                    );
                  }}
                >
                  Abrir disponibilidad y reprogramar
                </button>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {reprogModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 60,
            padding: 16,
          }}
          onClick={() => setReprogModalOpen(false)}
        >
          <section
            className="admin-card"
            style={{ width: 'min(980px, 100%)', maxHeight: '90vh', overflow: 'auto', marginBottom: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="admin-card-title" style={{ margin: 0 }}>
                Reprogramar turno por disponibilidad
              </h3>
              <button className="admin-btn admin-btn-secondary" onClick={() => setReprogModalOpen(false)}>
                Cerrar
              </button>
            </div>

            {reprogLoading ? (
              <p style={{ margin: 0, color: '#5f6d8f' }}>Consultando disponibilidad de la planta...</p>
            ) : reprogSlots.length ? (
              <>
                <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                  <select
                    className="admin-select"
                    value={newDate}
                    onChange={(e) => {
                      const day = e.target.value;
                      setNewDate(day);
                      const firstForDay = reprogSlots.find((slot) => slot.fecha === day);
                      setNewTime(firstForDay?.hora || '');
                    }}
                  >
                    <option value="">Seleccionar día</option>
                    {availableReprogDays.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <select className="admin-select" value={newTime} onChange={(e) => setNewTime(e.target.value)}>
                    <option value="">Seleccionar horario</option>
                    {manualSlotTimes.map((time) => (
                      <option key={time} value={time}>
                        {time?.slice(0, 5) || time}
                      </option>
                    ))}
                  </select>
                  <input className="admin-input" value={selectedManualSlot?.lineId ? String(selectedManualSlot.lineId) : '-'} readOnly />
                  <button className="admin-btn admin-btn-primary" onClick={doReschedule} disabled={!newDate || !newTime || !selectedManualSlot}>
                    Reprogramar
                  </button>
                </div>

                <div style={{ marginTop: 10 }}>
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
                        key={`${slot.id || slot.lineId || 'slot'}-${slot.fecha}-${slot.hora}`}
                        className="admin-btn admin-btn-secondary"
                        onClick={() => doRescheduleBySlot(slot)}
                      >
                        {slot.hora?.slice(0, 5) || slot.hora}
                      </button>
                    ))}
                  </div>
                </div>

                <p style={{ margin: '10px 0 0', color: '#5f6d8f', fontSize: 13 }}>
                  Solo se muestran días y horarios disponibles según la configuración de la planta.
                </p>
              </>
            ) : (
              <p style={{ margin: 0, color: '#5f6d8f' }}>
                No hay disponibilidad para reprogramar este turno en este momento.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
