import { NextRequest, NextResponse } from 'next/server';

const UNIFIED_BACKEND_URL = process.env.UNIFIED_BACKEND_URL;

function pathRequiresPlant(path: string[]) {
  const [first, second] = path;
  if (first !== 'auth') return true;

  if (second === 'login') return false;
  if (second === 'onboarding') return false;
  if (second === 'super') return false;
  if (second === 'user') return false;

  return true;
}

function isValidPlantCode(value?: string) {
  if (!value) return false;
  return /^[a-z0-9-]{2,40}$/.test(value);
}

async function proxy(req: NextRequest, path: string[], plant?: string) {
  const requiresPlant = pathRequiresPlant(path);

  if (requiresPlant && !isValidPlantCode(plant)) {
    return NextResponse.json(
      { reason: 'BAD_REQUEST', message: 'Invalid or missing plant' },
      { status: 400 },
    );
  }

  const plantCode = plant;
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

  const authHeader = req.headers.get('authorization');

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(plantCode ? { 'x-plant-code': plantCode } : {}),
        ...(authHeader ? { authorization: authHeader } : {}),
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
