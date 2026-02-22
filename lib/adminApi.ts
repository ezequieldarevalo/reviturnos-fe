import { AdminSession } from './adminAuth';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  plantCode?: string;
};

export async function adminApi<T = any>(
  session: AdminSession,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const plant = options.plantCode || session.plantCode;
  const hasQuery = path.includes('?');
  const query = plant ? `${hasQuery ? '&' : '?'}plant=${encodeURIComponent(plant)}` : '';

  const response = await fetch(`/api/backend/${path}${query}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.message || payload?.reason || 'Error en la solicitud';
    throw new Error(message);
  }

  return payload;
}
