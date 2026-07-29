import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BLOCKED_COUNTRIES = 'SG';
const ALLOW_COOKIE = 'kp_allow_blocked_country';

function blockedCountries(): Set<string> {
  return new Set(
    (process.env.BLOCK_TRAFFIC_COUNTRIES ?? DEFAULT_BLOCKED_COUNTRIES)
      .split(',')
      .map((country) => country.trim().toUpperCase())
      .filter(Boolean),
  );
}

function requestCountry(request: NextRequest): string {
  const country =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    '';
  return country.toUpperCase();
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const cfRay = request.headers.get('cf-ray');

  if (host.includes('vercel.app') || !cfRay) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  const country = requestCountry(request);
  const blocked = blockedCountries();

  if (!country || !blocked.has(country)) {
    return NextResponse.next();
  }

  // Manual escape hatch for real users/support checks:
  // set cookie kp_allow_blocked_country=1 and reload.
  if (request.cookies.get(ALLOW_COOKIE)?.value === '1') {
    return NextResponse.next();
  }

  return new NextResponse('Access temporarily restricted.', {
    status: 403,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-kpop-country-block': country,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
