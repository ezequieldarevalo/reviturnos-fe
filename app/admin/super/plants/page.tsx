'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { getAdminSession, AdminSession } from 'lib/adminAuth';

type Plant = {
  id: string;
  code: string;
  slug: string;
  name: string;
  active: boolean;
};

type PlantDrafts = Record<string, { name: string; slug: string; active: boolean }>;

export default function SuperPlantsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<PlantDrafts>({});

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  const loadPlants = async (currentSession: AdminSession) => {
    const data = await adminApi<Plant[]>(currentSession, 'auth/super/plants');
    setPlants(data || []);
    setDrafts(
      (data || []).reduce((acc, p) => {
        acc[p.id] = { name: p.name, slug: p.slug, active: p.active };
        return acc;
      }, {} as PlantDrafts),
    );
  };

  useEffect(() => {
    const current = getAdminSession();
    if (!current) {
      router.replace('/login');
      return;
    }
    if (current.user.role !== 'superadmin') {
      router.replace('/admin');
      return;
    }

    setSession(current);

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await loadPlants(current);
      } catch (e: any) {
        setError(e?.message || 'No se pudieron cargar las plantas');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const createPlant = async () => {
    if (!session) return;
    try {
      setError('');
      await adminApi(session, 'auth/super/plants', {
        method: 'POST',
        body: {
          code: newCode,
          slug: newCode,
          name: newName,
          active: true,
        },
      });
      setNewCode('');
      setNewName('');
      await loadPlants(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear la planta');
    }
  };

  const toggleActive = async (plantId: string, active: boolean) => {
    if (!session) return;
    try {
      setError('');
      await adminApi(session, `auth/super/plants/${plantId}`, {
        method: 'PATCH',
        body: { active: !active },
      });
      await loadPlants(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo actualizar la planta');
    }
  };

  const updatePlant = async (plantId: string) => {
    if (!session) return;
    const payload = drafts[plantId];
    if (!payload) return;
    try {
      setError('');
      await adminApi(session, `auth/super/plants/${plantId}`, {
        method: 'PATCH',
        body: payload,
      });
      await loadPlants(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo actualizar la planta');
    }
  };

  if (loading) return <main className="admin-loading">Cargando plantas...</main>;

  return (
    <main className="admin-page">
      <h1 className="admin-title">Superadmin · Plantas</h1>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}

      <section className="admin-card">
        <h3 className="admin-card-title">Crear planta</h3>
        <div className="admin-actions">
          <input
            className="admin-input"
            placeholder="Código"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.trim().toLowerCase())}
          />
          <input className="admin-input" placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="admin-btn admin-btn-primary" disabled={!newCode || !newName} onClick={createPlant}>
            Crear
          </button>
        </div>
      </section>

      <section className="admin-card">
        <h3 className="admin-card-title">Listado</h3>
        <ul className="admin-list">
          {plants.map((plant) => (
            <li key={plant.id} className="admin-list-item">
              <b>{plant.code}</b>{' '}
              <input
                className="admin-input"
                style={{ marginLeft: 8, maxWidth: 220, display: 'inline-block' }}
                value={drafts[plant.id]?.name || ''}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [plant.id]: { ...(prev[plant.id] || { name: '', slug: '', active: false }), name: e.target.value },
                  }))
                }
              />
              <input
                className="admin-input"
                style={{ marginLeft: 8, maxWidth: 180, display: 'inline-block' }}
                value={drafts[plant.id]?.slug || ''}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [plant.id]: {
                      ...(prev[plant.id] || { name: '', slug: '', active: false }),
                      slug: e.target.value.trim().toLowerCase(),
                    },
                  }))
                }
              />
              <label style={{ marginLeft: 8 }}>
                <input
                  type="checkbox"
                  checked={!!drafts[plant.id]?.active}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [plant.id]: {
                        ...(prev[plant.id] || { name: '', slug: '', active: false }),
                        active: e.target.checked,
                      },
                    }))
                  }
                />{' '}
                activa
              </label>{' '}
              <button className="admin-btn admin-btn-primary" onClick={() => updatePlant(plant.id)}>Guardar</button>{' '}
              <button className="admin-btn admin-btn-secondary" onClick={() => toggleActive(plant.id, plant.active)}>
                {plant.active ? 'Desactivar' : 'Activar'}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
