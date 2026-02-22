'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from 'lib/adminApi';
import { getAdminSession, AdminSession } from 'lib/adminAuth';

type Plant = {
  id: string;
  code: string;
  name: string;
};

type ListedUser = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  plantId: string;
};

type UserDrafts = Record<string, { role: string; active: boolean; plantId: string }>;

export default function SuperUsersPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<UserDrafts>({});

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [plantId, setPlantId] = useState('');

  const canCreate = useMemo(() => !!email && !!password && !!plantId, [email, password, plantId]);

  const loadData = async (currentSession: AdminSession) => {
    const [plantsResp, usersResp] = await Promise.all([
      adminApi<Plant[]>(currentSession, 'auth/super/plants'),
      adminApi<ListedUser[]>(currentSession, 'auth/super/users'),
    ]);

    setPlants(plantsResp || []);
    setUsers(usersResp || []);
    setDrafts(
      (usersResp || []).reduce((acc, user) => {
        acc[user.id] = {
          role: user.role,
          active: user.active,
          plantId: user.plantId,
        };
        return acc;
      }, {} as UserDrafts),
    );

    if (!plantId && plantsResp?.length) {
      setPlantId(plantsResp[0].id);
    }
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
        await loadData(current);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar la información');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const createUser = async () => {
    if (!session || !canCreate) return;
    try {
      setError('');
      await adminApi(session, 'auth/super/users', {
        method: 'POST',
        body: { email, password, role, plantId },
      });
      setEmail('');
      setPassword('');
      await loadData(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear el usuario');
    }
  };

  const saveUser = async (userId: string) => {
    if (!session) return;
    const payload = drafts[userId];
    if (!payload) return;
    try {
      setError('');
      await adminApi(session, `auth/super/users/${userId}`, {
        method: 'PATCH',
        body: payload,
      });
      await loadData(session);
    } catch (e: any) {
      setError(e?.message || 'No se pudo actualizar el usuario');
    }
  };

  if (loading) return <main>Cargando usuarios...</main>;

  return (
    <main>
      <h1>Superadmin · Usuarios</h1>

      {error ? <div style={{ color: '#b00020', marginBottom: 10 }}>{error}</div> : null}

      <section style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Crear usuario</h3>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">admin</option>
            <option value="operator">operator</option>
            <option value="viewer">viewer</option>
            <option value="superadmin">superadmin</option>
          </select>
          <select value={plantId} onChange={(e) => setPlantId(e.target.value)}>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>
          <button disabled={!canCreate} onClick={createUser}>
            Crear
          </button>
        </div>
      </section>

      <section style={{ border: '1px solid #ddd', padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Listado</h3>
        <ul>
          {users.map((user) => (
            <li key={user.id} style={{ marginBottom: 8 }}>
              {user.email} ·{' '}
              <select
                value={drafts[user.id]?.role || user.role}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [user.id]: {
                      ...(prev[user.id] || {
                        role: user.role,
                        active: user.active,
                        plantId: user.plantId,
                      }),
                      role: e.target.value,
                    },
                  }))
                }
              >
                <option value="admin">admin</option>
                <option value="operator">operator</option>
                <option value="viewer">viewer</option>
                <option value="superadmin">superadmin</option>
              </select>{' '}
              <select
                value={drafts[user.id]?.plantId || user.plantId}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [user.id]: {
                      ...(prev[user.id] || {
                        role: user.role,
                        active: user.active,
                        plantId: user.plantId,
                      }),
                      plantId: e.target.value,
                    },
                  }))
                }
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>{' '}
              <label>
                <input
                  type="checkbox"
                  checked={!!drafts[user.id]?.active}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [user.id]: {
                        ...(prev[user.id] || {
                          role: user.role,
                          active: user.active,
                          plantId: user.plantId,
                        }),
                        active: e.target.checked,
                      },
                    }))
                  }
                />{' '}
                activo
              </label>{' '}
              <button onClick={() => saveUser(user.id)}>Guardar</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
