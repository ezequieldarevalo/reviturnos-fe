import { NextRequest, NextResponse } from 'next/server';

type PlantCode = 'lasheras' | 'maipu' | 'rivadavia' | 'godoycruz' | 'sanmartin';

const VALID_PLANTS: PlantCode[] = ['lasheras', 'maipu', 'rivadavia', 'godoycruz', 'sanmartin'];
const UNIFIED_BACKEND_URL = process.env.UNIFIED_BACKEND_URL;

async function proxy(req: NextRequest, path: string[], plant?: string) {
  if (!plant || !VALID_PLANTS.includes(plant as PlantCode)) {
    return NextResponse.json({ reason: 'BAD_REQUEST', message: 'Invalid plant' }, { status: 400 });
  }

  const plantCode = plant as PlantCode;
  const baseUrl = UNIFIED_BACKEND_URL;

  if (!baseUrl) {
    return NextResponse.json(
      { reason: 'INTERNAL_ERROR_SERVER', message: 'Backend URL not configured' },
      { status: 500 },
    );
  }

  const targetBaseUrl = `${baseUrl.replace(/\/$/, '')}/${path.join('/')}`;
  const forwardSearchParams = new URLSearchParams(req.nextUrl.searchParams);
  forwardSearchParams.delete('plant');
  const targetUrl = forwardSearchParams.toString()
    ? `${targetBaseUrl}?${forwardSearchParams.toString()}`
    : targetBaseUrl;

  let body: any = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-plant-code': plantCode,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    return NextResponse.json(payload, { status: response.status });
  } catch (_error) {
    return NextResponse.json(
      { reason: 'INTERNAL_ERROR_SERVER', message: 'Proxy request failed' },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: any,
) {
  const resolvedParams = await params;
  const plant = req.nextUrl.searchParams.get('plant') || undefined;
  return proxy(req, resolvedParams.path, plant);
}

export async function GET(
  req: NextRequest,
  { params }: any,
) {
  const resolvedParams = await params;
  const plant = req.nextUrl.searchParams.get('plant') || undefined;
  return proxy(req, resolvedParams.path, plant);
}
