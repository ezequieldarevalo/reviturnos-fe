'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { AdminSession, getAdminSession } from 'lib/adminAuth';

type VehicleType = {
  vehicleType?: string;
  description?: string;
};

type CreateForm = {
  fecha: string;
  hora: string;
  dominio: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
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
        linea: form.linea ? Number(form.linea) : undefined,
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
          <input
            className="admin-input"
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
            required
          />
          <input
            className="admin-input"
            type="time"
            value={form.hora}
            onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
            required
          />

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
            placeholder="Combustible (opcional)"
            value={form.combustible}
            onChange={(e) => setForm((p) => ({ ...p, combustible: e.target.value }))}
          />
          <input
            className="admin-input"
            placeholder="Línea (opcional)"
            value={form.linea}
            onChange={(e) => setForm((p) => ({ ...p, linea: e.target.value }))}
          />
        </div>

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
