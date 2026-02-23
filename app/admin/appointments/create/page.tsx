'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { AdminSession, getAdminSession } from 'lib/adminAuth';

type VehicleType = {
  vehicleType?: string;
  description?: string;
};

type AvailableSlot = {
  fecha: string;
  hora: string;
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

const normalizeSlots = (rawSlots: any[]): AvailableSlot[] => {
  return (rawSlots || [])
    .map((slot: any) => {
      const fecha = normalizeDay(
        slot?.fecha ||
          slot?.dia ||
          slot?.date ||
          slot?.fecha_turno ||
          slot?.fecha_hora ||
          slot?.datetime ||
          slot?.fechaHora,
      );

      const hora = normalizeHour(
        slot?.hora ||
          slot?.horario ||
          slot?.time ||
          slot?.hora_turno ||
          slot?.fecha_hora ||
          slot?.datetime ||
          slot?.fechaHora,
      );

      const lineValue = slot?.lineId ?? slot?.line_id ?? slot?.id_linea ?? slot?.linea ?? null;

      return {
        fecha,
        hora,
        lineId: lineValue !== null && lineValue !== undefined ? String(lineValue) : null,
      } as AvailableSlot;
    })
    .filter((slot) => !!slot.fecha && !!slot.hora)
    .filter((slot) => /^\d{2}:\d{2}$/.test(slot.hora));
};

type CreateForm = {
  fecha: string;
  hora: string;
  dominio: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  marca: string;
  modelo: string;
  anio: string;
  tipo_vehiculo: string;
  combustible: string;
  linea: string;
};

const initialForm: CreateForm = {
  fecha: '',
  hora: '',
  dominio: '',
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  marca: '',
  modelo: '',
  anio: '',
  tipo_vehiculo: '',
  combustible: '',
  linea: '',
};

export default function CreateAppointmentPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [form, setForm] = useState<CreateForm>(initialForm);
  const [registerPaymentNow, setRegisterPaymentNow] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentTx, setPaymentTx] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

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

    if (current.user.role === 'viewer') {
      router.replace('/admin/appointments/today');
      return;
    }

    setSession(current);

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const types = await adminApi<VehicleType[]>(current, 'auth/tipVeh');
        setVehicleTypes(types || []);
        if (types?.length) {
          setForm((prev) => ({
            ...prev,
            tipo_vehiculo: types[0].vehicleType || types[0].description || '',
          }));
        }
      } catch (e: any) {
        setError(e?.message || 'No se pudieron cargar tipos de vehículo');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  useEffect(() => {
    if (!session || !form.tipo_vehiculo) return;

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      try {
        let slots: AvailableSlot[] = [];
        try {
          const quotes = await adminApi<{ turnos?: AvailableSlot[] }>(
            session,
            `auth/getQuotes?tipoVehiculo=${encodeURIComponent(form.tipo_vehiculo)}`,
          );
          slots = normalizeSlots(quotes?.turnos || []);
        } catch (_e0) {
          try {
            const quotes = await adminApi<{ turnos?: AvailableSlot[] }>(session, 'auth/getQuotes', {
              method: 'POST',
              body: { tipoVehiculo: form.tipo_vehiculo },
            });
            slots = normalizeSlots(quotes?.turnos || []);
          } catch (_e1) {
            slots = [];
          }
        }

        setAvailableSlots(slots);

        if (!slots.length) {
          setForm((prev) => ({ ...prev, fecha: '', hora: '', linea: '' }));
          return;
        }

        setForm((prev) => {
          const validCurrent = slots.find(
            (slot) =>
              normalizeDay(slot.fecha) === normalizeDay(prev.fecha) &&
              slot.hora === prev.hora &&
              String(slot.lineId || '') === String(prev.linea || ''),
          );
          if (validCurrent) return prev;

          const first = slots[0];
          return {
            ...prev,
            fecha: normalizeDay(first.fecha),
            hora: first.hora,
            linea: first.lineId ? String(first.lineId) : '',
          };
        });
      } catch (_e) {
        setAvailableSlots([]);
        setForm((prev) => ({ ...prev, fecha: '', hora: '', linea: '' }));
      } finally {
        setAvailabilityLoading(false);
      }
    };

    loadAvailability();
  }, [session, form.tipo_vehiculo]);

  const availableDays = Array.from(
    new Set(availableSlots.map((slot) => normalizeDay(slot.fecha)).filter(Boolean)),
  ).sort();

  const availableSlotsForDay = availableSlots
    .filter((slot) => normalizeDay(slot.fecha) === normalizeDay(form.fecha))
    .sort((a, b) => {
      if (a.hora === b.hora) return String(a.lineId || '').localeCompare(String(b.lineId || ''));
      return a.hora.localeCompare(b.hora);
    });

  const selectedSlotKey = `${form.hora}__${form.linea || ''}`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        ...form,
        dominio: form.dominio.trim().toUpperCase(),
        anio: form.anio ? Number(form.anio) : undefined,
        linea: form.linea || undefined,
      };

      const resp = await adminApi<any>(session, 'auth/creTur', {
        method: 'POST',
        body: payload,
      });

      const turnoId = resp?.turno_id;

      if (registerPaymentNow && turnoId) {
        await adminApi(session, 'auth/regPag', {
          method: 'POST',
          body: {
            turno_id: turnoId,
            metodo: paymentMethod,
            referencia: paymentRef || undefined,
            transaction_id: paymentTx || undefined,
          },
        });
      }

      setSuccess(
        registerPaymentNow
          ? `Turno creado y cobrado: ${turnoId || '-'} · ${resp?.fecha || ''} ${resp?.hora || ''}`
          : `Turno creado: ${turnoId || '-'} · ${resp?.fecha || ''} ${resp?.hora || ''}`,
      );
      setForm((prev) => ({
        ...initialForm,
        tipo_vehiculo: prev.tipo_vehiculo,
      }));
      setPaymentRef('');
      setPaymentTx('');
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear/cobrar el turno');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="admin-loading">Cargando formulario...</main>;

  return (
    <main className="admin-page">
      <h1 className="admin-title">Planta · Crear turno manual</h1>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success">{success}</div> : null}

      <form onSubmit={handleSubmit} className="admin-card">
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <select
            className="admin-select"
            value={form.fecha}
            onChange={(e) => {
              const nextDate = e.target.value;
              const firstSlotForDate = availableSlots
                .filter((slot) => normalizeDay(slot.fecha) === normalizeDay(nextDate))
                .sort((a, b) => a.hora.localeCompare(b.hora))[0];
              setForm((p) => ({
                ...p,
                fecha: nextDate,
                hora: firstSlotForDate?.hora || '',
                linea: firstSlotForDate?.lineId ? String(firstSlotForDate.lineId) : '',
              }));
            }}
            required
            disabled={availabilityLoading || !availableDays.length}
          >
            <option value="">{availabilityLoading ? 'Cargando días...' : 'Seleccionar día disponible'}</option>
            {availableDays.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={selectedSlotKey}
            onChange={(e) => {
              const [hora, lineId] = e.target.value.split('__');
              setForm((p) => ({ ...p, hora: hora || '', linea: lineId || '' }));
            }}
            required
            disabled={availabilityLoading || !form.fecha || !availableSlotsForDay.length}
          >
            <option value="">
              {availabilityLoading
                ? 'Cargando horarios...'
                : form.fecha
                  ? 'Seleccionar horario disponible'
                  : 'Primero seleccioná un día'}
            </option>
            {availableSlotsForDay.map((slot) => {
              const value = `${slot.hora}__${slot.lineId || ''}`;
              const lineLabel = slot.lineId ? ` · línea ${slot.lineId}` : '';
              return (
                <option key={`${slot.hora}-${slot.lineId || 'none'}`} value={value}>
                  {slot.hora}
                  {lineLabel}
                </option>
              );
            })}
          </select>

          <input
            className="admin-input"
            placeholder="Dominio"
            value={form.dominio}
            onChange={(e) => setForm((p) => ({ ...p, dominio: e.target.value.toUpperCase() }))}
            required
          />
          <select
            className="admin-select"
            value={form.tipo_vehiculo}
            onChange={(e) => setForm((p) => ({ ...p, tipo_vehiculo: e.target.value }))}
            required
          >
            {vehicleTypes.map((t, idx) => {
              const value = t.vehicleType || t.description || '';
              return (
                <option key={`${value}-${idx}`} value={value}>
                  {value}
                </option>
              );
            })}
          </select>

          <input
            className="admin-input"
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            required
          />
          <input
            className="admin-input"
            placeholder="Apellido"
            value={form.apellido}
            onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))}
            required
          />

          <input
            className="admin-input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <input
            className="admin-input"
            placeholder="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
            required
          />

          <input
            className="admin-input"
            placeholder="Marca"
            value={form.marca}
            onChange={(e) => setForm((p) => ({ ...p, marca: e.target.value }))}
          />
          <input
            className="admin-input"
            placeholder="Modelo"
            value={form.modelo}
            onChange={(e) => setForm((p) => ({ ...p, modelo: e.target.value }))}
          />

          <input
            className="admin-input"
            placeholder="Año"
            value={form.anio}
            onChange={(e) => setForm((p) => ({ ...p, anio: e.target.value }))}
          />

          <input
            className="admin-input"
            placeholder="Combustible (opcional)"
            value={form.combustible}
            onChange={(e) => setForm((p) => ({ ...p, combustible: e.target.value }))}
          />
          <input
            className="admin-input"
            placeholder="Línea"
            value={form.linea}
            readOnly
          />
        </div>

        {!availabilityLoading && !availableSlots.length ? (
          <p style={{ marginTop: 8, color: '#7a86ad' }}>
            No hay disponibilidad para el tipo de vehículo seleccionado.
          </p>
        ) : null}

        <div style={{ marginTop: 12, borderTop: '1px dashed #ccd7ef', paddingTop: 12 }}>
          <label className="admin-inline">
            <input
              type="checkbox"
              checked={registerPaymentNow}
              onChange={(e) => setRegisterPaymentNow(e.target.checked)}
            />
            Registrar pago en el momento
          </label>

          {registerPaymentNow ? (
            <div className="admin-form-grid" style={{ marginTop: 8, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <select className="admin-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="efectivo">efectivo</option>
                <option value="mercadopago">mercadopago</option>
                <option value="transferencia">transferencia</option>
              </select>
              <input
                className="admin-input"
                placeholder="Referencia (opcional)"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
              <input
                className="admin-input"
                placeholder="Transaction ID (opcional)"
                value={paymentTx}
                onChange={(e) => setPaymentTx(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <button type="submit" disabled={saving} className="admin-btn admin-btn-primary" style={{ marginTop: 12 }}>
          {saving
            ? registerPaymentNow
              ? 'Creando y cobrando...'
              : 'Creando...'
            : registerPaymentNow
              ? 'Crear y cobrar'
              : 'Crear turno'}
        </button>
      </form>
    </main>
  );
}
