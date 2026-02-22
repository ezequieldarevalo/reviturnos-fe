'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminSession, getAdminSession, AdminSession } from 'lib/adminAuth';
import { adminApi } from 'lib/adminApi';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);

  const links = useMemo(() => {
    const role = session?.user?.role;
    if (role === 'superadmin') {
      return [
        { href: '/admin/super/plants', label: 'Plantas' },
        { href: '/admin/super/users', label: 'Usuarios' },
        { href: '/admin/audit/actions', label: 'Auditoría acciones' },
      ];
    }
    if (role === 'admin') {
      return [
        { href: '/admin/plant/mp-config', label: 'MercadoPago' },
        { href: '/admin/appointments/today', label: 'Turnos de hoy' },
        { href: '/admin/appointments/manage', label: 'Gestionar turnos' },
        { href: '/admin/appointments/create', label: 'Crear turno' },
        { href: '/admin/audit/payments', label: 'Auditoría pagos' },
        { href: '/admin/audit/actions', label: 'Auditoría acciones' },
      ];
    }
    if (role === 'operator') {
      return [
        { href: '/admin/appointments/today', label: 'Turnos de hoy' },
        { href: '/admin/appointments/manage', label: 'Gestionar turnos' },
        { href: '/admin/appointments/create', label: 'Crear turno' },
        { href: '/admin/audit/payments', label: 'Auditoría pagos' },
        { href: '/admin/audit/actions', label: 'Auditoría acciones' },
      ];
    }
    if (role === 'viewer') {
      return [
        { href: '/admin/appointments/today', label: 'Turnos de hoy' },
        { href: '/admin/appointments/manage', label: 'Gestionar turnos' },
        { href: '/admin/audit/payments', label: 'Auditoría pagos' },
        { href: '/admin/audit/actions', label: 'Auditoría acciones' },
      ];
    }
    return [
      { href: '/admin/appointments/today', label: 'Turnos de hoy' },
    ];
  }, [session?.user?.role]);

  useEffect(() => {
    const currentSession = getAdminSession();
    if (!currentSession?.token) {
      router.replace('/login');
      return;
    }

    const validateSession = async () => {
      try {
        await adminApi(currentSession, 'auth/verify');
        setSession(currentSession);
      } catch (_error) {
        clearAdminSession();
        router.replace('/login');
      }
    };

    validateSession();

    if (pathname === '/admin' || pathname?.startsWith('/admin')) {
      setReady(true);
    }
  }, [router, pathname]);

  if (!ready) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <aside style={{ borderRight: '1px solid #ddd', padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Admin</h3>
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          {session?.user?.email}
          <br />
          Rol: {session?.user?.role}
        </p>

        <nav style={{ display: 'grid', gap: 8 }}>
          {links.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: active ? '#f0f4ff' : 'transparent',
                  border: active ? '1px solid #c8d7ff' : '1px solid transparent',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          style={{ marginTop: 18 }}
          onClick={() => {
            clearAdminSession();
            router.replace('/login');
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <section style={{ padding: 16 }}>{children}</section>
    </div>
  );
}
