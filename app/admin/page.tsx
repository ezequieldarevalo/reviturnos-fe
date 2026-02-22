'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminSession } from 'lib/adminAuth';

export default function AdminHomePage() {
  const router = useRouter();

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
    if (current.user.role === 'admin') {
      router.replace('/admin/plant/mp-config');
      return;
    }
    router.replace('/admin/appointments/today');
  }, [router]);

  return <main className="admin-loading">Cargando panel...</main>;
}
