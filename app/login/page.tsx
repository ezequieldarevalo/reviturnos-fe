'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { setAdminSession } from 'lib/adminAuth';

const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at 10% 20%, #e8f0ff 0%, #eef2f7 35%, #f8fafc 100%);
`;

const Card = styled.section`
  width: 100%;
  max-width: 440px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 28px;
`;

const Title = styled.h1`
  margin: 0 0 6px;
  font-size: 28px;
  line-height: 1.2;
  color: #0f172a;
`;

const Subtitle = styled.p`
  margin: 0 0 20px;
  color: #475569;
  font-size: 14px;
`;

const Form = styled.form`
  display: grid;
  gap: 10px;
`;

const Label = styled.label`
  display: grid;
  gap: 6px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
`;

const Input = styled.input`
  height: 42px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
`;

const ErrorText = styled.div`
  margin-top: 2px;
  color: #b00020;
  font-size: 13px;
`;

const SubmitButton = styled.button`
  margin-top: 8px;
  height: 42px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(37, 99, 235, 0.25);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Hint = styled.p`
  margin: 14px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
`;

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
      const loginResp = await fetch(`/api/backend/auth/login?plant=${encodeURIComponent(plantCode)}`, {
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
    <Page>
      <Card>
        <Title>Ingreso administrativo</Title>
        <Subtitle>Accedé con tu usuario backend para gestionar turnos y configuración.</Subtitle>

        <Form onSubmit={onSubmit}>
          <Label>
            Email
            <Input
              type="email"
              placeholder="admin@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Label>

          <Label>
            Contraseña
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Label>

          <Label>
            Código de planta
            <Input
              type="text"
              placeholder="lasheras"
              value={plantCode}
              onChange={(e) => setPlantCode(e.target.value.trim().toLowerCase())}
              required
            />
          </Label>

          {error ? <ErrorText>{error}</ErrorText> : null}

          <SubmitButton type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </SubmitButton>
        </Form>

        <Hint>
          Ejemplos de planta: lasheras, maipu, godoycruz.
        </Hint>
      </Card>
    </Page>
  );
}
