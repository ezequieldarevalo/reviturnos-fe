'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { AdminSession, getAdminSession } from 'lib/adminAuth';

type AppointmentData = {
  id: string;
  appointmentDate?: string;
  appointmentTime?: string;
  fecha?: string;
  hora?: string;
  status?: string;
  estado?: string;
  datos?: {
    nombre?: string;
    customerName?: string;
    email?: string;
    customerEmail?: string;
    telefono?: string;
    customerPhone?: string;
    dominio?: string;
    vehicleDomain?: string;
    tipo_vehiculo?: string;
    vehicleType?: string;
    marca?: string;
    modelo?: string;
    anio?: number | string;
    combustible?: string;
    price?: number;
  };
  cobro?: {
    fecha?: string;
    method?: string;
    metodo?: string;
    amount?: number;
    monto?: number;
    reference?: string;
    nro_op?: string;
    status?: string;
  };
};

type ReprogSlot = {
  id: string;
  fecha: string;
  hora: string;
  horaRaw?: string;
  lineId?: string | null;
};

const normalizeDay = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const latam = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (latam) return `${latam[3]}-${latam[2]}-${latam[1]}`;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const d = `${parsed.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return raw.slice(0, 10);
};

const normalizeHour = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const hhmm = raw.match(/(?:^|\D)(\d{1,2}):(\d{2})(?::\d{2})?(?:\D|$)/);
  if (hhmm) {
    const hour = `${Number(hhmm[1])}`.padStart(2, '0');
    return `${hour}:${hhmm[2]}`;
  }

  const compact = raw.match(/^(\d{1,2})[.:](\d{2})$/);
  if (compact) {
    const hour = `${Number(compact[1])}`.padStart(2, '0');
    return `${hour}:${compact[2]}`;
  }

  return raw;
};

const normalizeReprogSlots = (rawSlots: any[]): ReprogSlot[] => {
  return (rawSlots || [])
    .map((slot: any) => {
      const hourCandidates = [
        slot?.fecha_hora,
        slot?.datetime,
        slot?.fechaHora,
        slot?.hora_turno,
        slot?.time,
        slot?.horario,
        slot?.hora,
        slot?.fecha,
        slot?.date,
        slot?.dia,
      ];

      const fecha = normalizeDay(
        slot?.fecha ||
          slot?.dia ||
          slot?.date ||
          slot?.fecha_turno ||
          slot?.fecha_hora ||
          slot?.datetime ||
          slot?.fechaHora,
      );
      const horaRaw =
        hourCandidates
          .map((candidate) => String(candidate || '').trim())
          .find((candidate) => !!normalizeHour(candidate)) || '';
      const hora = normalizeHour(horaRaw);

      const idValue = slot?.id || slot?.id_turno || slot?.turno_id || '';
      const lineValue = slot?.lineId ?? slot?.line_id ?? slot?.id_linea ?? slot?.linea ?? null;

      return {
        id: idValue ? String(idValue) : '',
        fecha,
        hora,
        horaRaw: horaRaw || hora,
        lineId: lineValue !== null && lineValue !== undefined ? String(lineValue) : null,
      } as ReprogSlot;
    })
    .filter((slot) => !!slot.fecha && !!slot.hora)
    .filter((slot) => /^\d{2}:\d{2}$/.test(slot.hora));
};

const formatDayKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDayKey = (day: string): Date | null => {
  const normalized = normalizeDay(day);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const monthKeyFromDay = (day: string): string => {
  const normalized = normalizeDay(day);
  return normalized ? `${normalized.slice(0, 7)}-01` : '';
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
  const searchParams = useSearchParams();
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
  const [reprogLoading, setReprogLoading] = useState(false);
  const [reprogModalOpen, setReprogModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState('');

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
    () =>
      (
        reprogDays.length
          ? reprogDays.map((d) => normalizeDay(d)).filter(Boolean)
          : Array.from(new Set(reprogSlots.map((slot) => normalizeDay(slot.fecha))))
      ).sort(),
    [reprogSlots, reprogDays],
  );
  const manualSlotsByDate = useMemo(
    () => reprogSlots.filter((slot) => normalizeDay(slot.fecha) === normalizeDay(newDate)),
    [reprogSlots, newDate],
  );
  const manualSlotTimes = useMemo(
    () => Array.from(new Set(manualSlotsByDate.map((slot) => slot.hora))).sort((a, b) => a.localeCompare(b)),
    [manualSlotsByDate],
  );
  const availableDaySet = useMemo(
    () => new Set(availableReprogDays.map((d) => normalizeDay(d))),
    [availableReprogDays],
  );
  const availableDayBounds = useMemo(() => {
    const days = availableReprogDays.map((d) => normalizeDay(d)).filter(Boolean).sort();
    return {
      min: days[0] || '',
      max: days[days.length - 1] || '',
    };
  }, [availableReprogDays]);
  const calendarBaseDate = useMemo(() => {
    const fallback = availableDayBounds.min || normalizeDay(newDate) || '';
    const key = calendarMonth || monthKeyFromDay(fallback);
    return parseDayKey(key) || parseDayKey(monthKeyFromDay(availableDayBounds.min || '')) || new Date();
  }, [calendarMonth, availableDayBounds.min, newDate]);
  const calendarTitle = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        month: 'long',
        year: 'numeric',
      }).format(calendarBaseDate),
    [calendarBaseDate],
  );
  const calendarDays = useMemo(() => {
    const monthStart = new Date(calendarBaseDate.getFullYear(), calendarBaseDate.getMonth(), 1);
    const mondayIndex = (monthStart.getDay() + 6) % 7;
    const firstVisible = new Date(monthStart);
    firstVisible.setDate(monthStart.getDate() - mondayIndex);

    const cells: Array<{ key: string; day: number; inMonth: boolean; enabled: boolean }> = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(firstVisible);
      date.setDate(firstVisible.getDate() + i);
      const key = formatDayKey(date);
      cells.push({
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === calendarBaseDate.getMonth(),
        enabled: availableDaySet.has(key),
      });
    }
    return cells;
  }, [calendarBaseDate, availableDaySet]);
  const selectedManualSlot = useMemo(
    () => manualSlotsByDate.find((slot) => slot.hora === newTime) || null,
    [manualSlotsByDate, newTime],
  );

  useEffect(() => {
    if (!reprogModalOpen) return;
    if (!availableReprogDays.length) return;
    setCalendarMonth((prev) => prev || monthKeyFromDay(availableReprogDays[0]));
  }, [reprogModalOpen, availableReprogDays]);

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

  const toDateLabel = (value?: string) => {
    if (!value) return '-';
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('es-AR');
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

  const isPaidAppointment = useMemo(() => {
    const status = (appointment?.estado || appointment?.status || '').toUpperCase();
    if (status === 'P') return true;

    const paymentStatus = String(appointment?.cobro?.status || '').toLowerCase();
    if (paymentStatus === 'approved') return true;

    const amount = Number(appointment?.cobro?.amount ?? appointment?.cobro?.monto ?? 0);
    const hasMethod = !!(appointment?.cobro?.method || appointment?.cobro?.metodo);
    return amount > 0 && hasMethod;
  }, [appointment]);

  const isCompletedAppointment = useMemo(() => {
    const status = (appointment?.estado || appointment?.status || '').toUpperCase();
    return status === 'T';
  }, [appointment]);

  const hasActionableControls = useMemo(() => {
    if (!canMutate) return false;
    const canMarkOrReschedule = !isCompletedAppointment;
    const canRegisterPayment = !isPaidAppointment;
    return canMarkOrReschedule || canRegisterPayment;
  }, [canMutate, isCompletedAppointment, isPaidAppointment]);

  const updateManageQuery = (id?: string, domain?: string) => {
    const qs = new URLSearchParams(searchParams?.toString() || '');
    if (id) qs.set('id', id);
    else qs.delete('id');

    if (domain) qs.set('domain', domain);
    else qs.delete('domain');

    const query = qs.toString();
    router.replace(`/admin/appointments/manage${query ? `?${query}` : ''}`);
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
        const normalizedSlots = normalizeReprogSlots(quotesForResc?.turnos || []);
        setReprogDays(quotesForResc?.dias || []);
        setReprogSlots(normalizedSlots);
        setNewDate('');
        setNewTime('');
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
          const normalizedSlots = normalizeReprogSlots(quotes?.turnos || []);
          setReprogSlots(normalizedSlots);
          setNewDate('');
          setNewTime('');
          return;
        } catch (_e1) {
          try {
            const slots = await adminApi<{ turnos: ReprogSlot[] }>(
              session,
              `auth/obtTurRep?tipo_vehiculo=${encodeURIComponent(safeVehicleType)}`,
            );
            const normalizedSlots = normalizeReprogSlots(slots?.turnos || []);
            setReprogDays([]);
            setReprogSlots(normalizedSlots);
            setNewDate('');
            setNewTime('');
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
    const resolvedId = data?.id || id;

    try {
      const detail = await adminApi<AppointmentData>(session, 'auth/tur', {
        method: 'POST',
        body: { id_turno: resolvedId },
      });

      setAppointment({
        ...data,
        ...detail,
        datos: {
          ...(data?.datos || {}),
          ...(detail?.datos || {}),
        },
        cobro: detail?.cobro || data?.cobro,
      });
    } catch (_e) {
      setAppointment(data);
    }
  };

  const findById = async () => {
    if (!session || !searchId.trim()) return;
    try {
      clearMessages();
      const id = searchId.trim();
      await refreshById(id);
      updateManageQuery(id, undefined);
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
      setSearchDomain(searchDomain.trim().toUpperCase());
      await refreshById(id);
      updateManageQuery(id, searchDomain.trim().toUpperCase());
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
            nueva_hora: selectedManualSlot.horaRaw || newTime,
            nueva_linea: selectedManualSlot.lineId || undefined,
          };

      const resp = await adminApi<{ turno_id: string }>(session, 'auth/repTur', {
        method: 'POST',
        body: payload,
      });
      const newId = resp?.turno_id || appointment.id;
      setSearchId(newId);
      setSuccess('Turno reprogramado');
      setReprogModalOpen(false);
      updateManageQuery(newId, undefined);
      await refreshById(newId);
      await loadDayAppointments(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo reprogramar el turno');
    }
  };

  useEffect(() => {
    if (!session) return;

    const idParam = searchParams?.get('id')?.trim() || '';
    const domainParam = searchParams?.get('domain')?.trim() || '';
    if (!idParam && !domainParam) return;

    const restore = async () => {
      try {
        if (idParam) {
          if (appointment?.id !== idParam) {
            setSearchId(idParam);
            await refreshById(idParam);
          }
          return;
        }

        if (domainParam) {
          const data = await adminApi<AppointmentData>(
            session,
            `auth/turDom?dominio=${encodeURIComponent(domainParam.toUpperCase())}`,
          );
          if (data?.id && appointment?.id !== data.id) {
            setSearchDomain(domainParam.toUpperCase());
            setSearchId(data.id);
            await refreshById(data.id);
          }
        }
      } catch (_e) {
        // ignore restore failures
      }
    };

    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, searchParams]);

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
                  updateManageQuery(row.id, undefined);
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
            <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <section>
                <p><b>ID:</b> {appointment?.id}</p>
                <p><b>Fecha:</b> {toDateLabel(appointment?.fecha || appointment?.appointmentDate)}</p>
                <p><b>Hora:</b> {toHourLabel(appointment?.hora || appointment?.appointmentTime)}</p>
                <p><b>Estado:</b> {estadoLabel(appointment?.estado || appointment?.status)}</p>
              </section>

              <section>
                <p><b>Nombre:</b> {appointment?.datos?.customerName || appointment?.datos?.nombre || '-'}</p>
                <p><b>Email:</b> {appointment?.datos?.customerEmail || appointment?.datos?.email || '-'}</p>
                <p><b>Tel:</b> {appointment?.datos?.customerPhone || appointment?.datos?.telefono || '-'}</p>
                <p><b>Dominio:</b> {(appointment?.datos?.vehicleDomain || appointment?.datos?.dominio || '-').toUpperCase()}</p>
                <p><b>Vehículo:</b> {appointment?.datos?.vehicleType || appointment?.datos?.tipo_vehiculo || '-'}</p>
                <p><b>Marca/Modelo:</b> {appointment?.datos?.marca || '-'} / {appointment?.datos?.modelo || '-'}</p>
                <p><b>Año / Comb:</b> {appointment?.datos?.anio || '-'} / {appointment?.datos?.combustible || '-'}</p>
              </section>

              <section>
                <p><b>Monto:</b> ${Number(appointment?.cobro?.amount ?? appointment?.cobro?.monto ?? 0).toLocaleString('es-AR')}</p>
                <p><b>Método:</b> {pagoMetodoLabel(appointment?.cobro?.method || appointment?.cobro?.metodo)}</p>
                <p><b>Referencia:</b> {appointment?.cobro?.reference || appointment?.cobro?.nro_op || '-'}</p>
                <p><b>Estado pago:</b> {pagoEstadoLabel(appointment?.cobro?.status)}</p>
                <p><b>Fecha pago:</b> {toDateTimeLabel(appointment?.cobro?.fecha)}</p>
              </section>
            </div>
          </section>

          {hasActionableControls ? (
            <section className="admin-card">
              <h3 className="admin-card-title">Acciones</h3>

              {!isCompletedAppointment ? (
                <div style={{ marginBottom: 10 }}>
                  <button className="admin-btn admin-btn-primary" onClick={doMarkCompleted}>Marcar como realizado</button>
                </div>
              ) : null}

              {!isPaidAppointment ? (
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
              ) : (
                <div style={{ marginBottom: 12, color: '#2f8a52', fontWeight: 600 }}>
                  Pago ya registrado para este turno.
                </div>
              )}

              {!isCompletedAppointment ? (
                <div>
                  <h4 style={{ marginBottom: 6 }}>Reprogramar</h4>
                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={async () => {
                      if (!appointment?.id) return;
                      clearMessages();
                      setReprogModalOpen(true);
                      setCalendarMonth('');
                      await loadRescheduleAvailability(
                        appointment.id,
                        appointment?.datos?.vehicleType || (appointment as any)?.datos?.tipo_vehiculo,
                      );
                    }}
                  >
                    Abrir disponibilidad y reprogramar
                  </button>
                </div>
              ) : null}
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
            style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflow: 'auto', marginBottom: 0 }}
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
                <div style={{ marginBottom: 12, border: '1px solid #d7def4', borderRadius: 10, padding: 10, background: '#f8faff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      style={{ minWidth: 34, padding: '6px 10px' }}
                      onClick={() => {
                        const prev = new Date(calendarBaseDate.getFullYear(), calendarBaseDate.getMonth() - 1, 1);
                        setCalendarMonth(formatDayKey(prev));
                      }}
                    >
                      ◀
                    </button>
                    <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{calendarTitle}</div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      style={{ minWidth: 34, padding: '6px 10px' }}
                      onClick={() => {
                        const next = new Date(calendarBaseDate.getFullYear(), calendarBaseDate.getMonth() + 1, 1);
                        setCalendarMonth(formatDayKey(next));
                      }}
                    >
                      ▶
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4, fontSize: 11, color: '#6072a8' }}>
                    {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map((w) => (
                      <div key={w} style={{ textAlign: 'center', fontWeight: 700 }}>{w}</div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 4,
                    }}
                  >
                    {calendarDays.map((cell) => {
                      const selected = normalizeDay(newDate) === cell.key;
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          disabled={!cell.enabled}
                          className={`admin-btn ${selected ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                          style={{
                            minWidth: 0,
                            width: '100%',
                            padding: '8px 6px',
                            fontSize: 13,
                            opacity: cell.enabled ? 1 : 0.45,
                            borderStyle: cell.inMonth ? 'solid' : 'dashed',
                          }}
                          onClick={() => {
                            if (!cell.enabled) return;
                            setError('');
                            setNewDate(cell.key);
                            setNewTime('');
                          }}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ marginBottom: 6, fontSize: 13, color: '#5f6d8f' }}>
                    {newDate ? 'Seleccioná un horario' : 'Primero seleccioná un día'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 38 }}>
                    {manualSlotTimes.map((time) => {
                      const selected = newTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          className={`admin-btn ${selected ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                          style={{ minWidth: 74, padding: '7px 10px' }}
                          onClick={() => setNewTime(time)}
                        >
                          {time?.slice(0, 5) || time}
                        </button>
                      );
                    })}
                    {newDate && !manualSlotTimes.length ? (
                      <span style={{ color: '#7a86ad', fontSize: 13 }}>No hay horarios para el día seleccionado.</span>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="admin-btn admin-btn-primary" onClick={doReschedule} disabled={!newDate || !newTime || !selectedManualSlot}>
                    Reprogramar
                  </button>
                </div>

                <p style={{ margin: '10px 0 0', color: '#5f6d8f', fontSize: 13 }}>
                  Elegí día y horario. Solo se aceptan días con disponibilidad de la planta.
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
