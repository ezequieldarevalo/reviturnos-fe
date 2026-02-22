'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAdminSession } from 'lib/adminAuth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plantCode, setPlantCode] = useState('lasheras');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginResp = await fetch('/api/backend/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginResp.json();

      if (!loginResp.ok || !loginData?.access_token) {
        throw new Error(loginData?.message || 'Credenciales inválidas');
      }

      const userResp = await fetch(`/api/backend/auth/user?plant=${encodeURIComponent(plantCode)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginData.access_token}`,
        },
      });

      const userData = await userResp.json();
      if (!userResp.ok) {
        throw new Error(userData?.message || 'No se pudo obtener el usuario');
      }

      setAdminSession({
        token: loginData.access_token,
        plantCode,
        user: userData,
      });

      router.push('/admin');
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 460, margin: '40px auto', padding: 16 }}>
      <h1>Ingreso administrativo</h1>
      <p>Usá tu usuario del backend.</p>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Código de planta (ej: lasheras)"
          value={plantCode}
          onChange={(e) => setPlantCode(e.target.value.trim().toLowerCase())}
          required
        />

        {error ? <div style={{ color: '#b00020' }}>{error}</div> : null}

        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
