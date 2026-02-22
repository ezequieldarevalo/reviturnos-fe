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
        await adminApi(currentSession, 'auth/verify', { method: 'POST' });
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
    <div className="admin-shell bg-gradient-to-b from-slate-50 via-blue-50/30 to-indigo-50/40">
      <aside className="admin-sidebar border-r border-blue-100/70 bg-white/95 backdrop-blur">
        <div className="admin-brand">Admin</div>
        <p className="admin-user-meta">
          {session?.user?.email || '-'}
          <br />
          Rol: {session?.user?.role || '-'}
        </p>

        <nav className="admin-nav">
          {links.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'admin-nav-link active shadow-sm ring-1 ring-blue-200'
                    : 'admin-nav-link hover:shadow-sm'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          className="admin-btn admin-btn-secondary admin-logout"
          onClick={() => {
            clearAdminSession();
            router.replace('/login');
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <section className="admin-content">{children}</section>

      <style jsx global>{`
        .admin-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 260px 1fr;
          background: linear-gradient(180deg, #f8faff 0%, #f3f6fc 100%);
        }

        .admin-sidebar {
          padding: 18px 14px;
          border-right: 1px solid #e4e9f5;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }

        .admin-brand {
          margin: 0 4px 10px;
          font-size: 20px;
          font-weight: 800;
          color: #1b2540;
        }

        .admin-user-meta {
          margin: 0 4px 16px;
          font-size: 12px;
          line-height: 1.45;
          color: #5a6786;
        }

        .admin-nav {
          display: grid;
          gap: 8px;
        }

        .admin-nav-link {
          display: block;
          border: 1px solid transparent;
          border-radius: 10px;
          padding: 10px 11px;
          color: #243257;
          text-decoration: none;
          transition: all 0.18s ease;
          font-weight: 600;
          font-size: 14px;
        }

        .admin-nav-link:hover {
          background: #f2f6ff;
          border-color: #dbe5ff;
        }

        .admin-nav-link.active {
          background: #edf3ff;
          border-color: #c7d7ff;
          color: #16357a;
        }

        .admin-content {
          padding: 22px;
        }

        .admin-page {
          max-width: 1100px;
        }

        .admin-title {
          margin: 0 0 14px;
          color: #1c2848;
          font-size: 26px;
          font-weight: 800;
        }

        .admin-subtitle {
          margin: -8px 0 14px;
          color: #5f6d8f;
          font-size: 14px;
        }

        .admin-alert {
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .admin-alert-error {
          background: #fff2f4;
          border: 1px solid #ffd3da;
          color: #9e1d2f;
        }

        .admin-alert-success {
          background: #ecfff2;
          border: 1px solid #c9f0d7;
          color: #0a6d32;
        }

        .admin-card {
          background: #fff;
          border: 1px solid #e2e8f6;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 14px;
          box-shadow: 0 2px 12px rgba(18, 41, 87, 0.04);
        }

        .admin-card-title {
          margin: 0 0 10px;
          color: #1c2848;
          font-size: 16px;
          font-weight: 700;
        }

        .admin-grid,
        .admin-form-grid,
        .admin-row {
          display: grid;
          gap: 8px;
        }

        .admin-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 8px;
        }

        .admin-list-item {
          line-height: 1.4;
        }

        .admin-input,
        .admin-select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfdaef;
          background: #fff;
          color: #1f2d4f;
          border-radius: 9px;
          padding: 9px 10px;
          min-height: 38px;
          outline: none;
        }

        .admin-input:focus,
        .admin-select:focus {
          border-color: #88a9ff;
          box-shadow: 0 0 0 3px rgba(64, 119, 255, 0.14);
        }

        .admin-btn {
          border: 1px solid transparent;
          border-radius: 9px;
          padding: 9px 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.16s ease;
        }

        .admin-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .admin-btn-primary {
          background: #265ee9;
          color: #fff;
        }

        .admin-btn-primary:hover:not(:disabled) {
          background: #194fd4;
        }

        .admin-btn-secondary {
          background: #f1f5ff;
          border-color: #d3dfff;
          color: #27417f;
        }

        .admin-btn-secondary:hover:not(:disabled) {
          background: #e8eeff;
        }

        .admin-btn-danger {
          background: #fff0f3;
          border-color: #ffd2db;
          color: #a11735;
        }

        .admin-logout {
          margin-top: 18px;
        }

        .admin-inline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .admin-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .admin-loading {
          padding: 12px;
          color: #516084;
        }

        @media (max-width: 980px) {
          .admin-shell {
            grid-template-columns: 1fr;
          }

          .admin-sidebar {
            border-right: 0;
            border-bottom: 1px solid #e4e9f5;
          }

          .admin-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
