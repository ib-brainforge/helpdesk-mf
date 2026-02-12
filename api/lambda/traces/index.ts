/**
 * BFF Proxy for Tempo (OpenTelemetry traces)
 *
 * This endpoint proxies trace data from the browser to Tempo,
 * keeping credentials server-side and avoiding CORS issues.
 *
 * The browser sends traces to: /edge/traces
 * This proxy forwards them to: TEMPO_ENDPOINT
 *
 * Security: Validates bf_session cookie set by nginx when serving the app.
 */

interface BffInput {
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  cookies?: string;
  data?: unknown;
  body?: unknown;
}

/**
 * Get allowed origins from environment variable (comma-separated)
 */
function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS;
  if (!origins) return [];
  return origins.split(',').map(o => o.trim()).filter(Boolean);
}

/**
 * Validate Origin/Referer header to ensure request comes from our domain
 */
function validateOrigin(input: BffInput): boolean {
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length === 0) return false;

  const origin = input.headers['origin'] || input.headers['Origin'];
  const referer = input.headers['referer'] || input.headers['Referer'];

  if (origin) {
    return allowedOrigins.some(allowed => origin.startsWith(allowed));
  }

  if (referer) {
    return allowedOrigins.some(allowed => referer.startsWith(allowed));
  }

  return false;
}

/**
 * Validate the session cookie against the expected value from nginx
 */
function validateSession(input: BffInput): boolean {
  const expectedToken = input.headers['x-expected-session'];
  if (!expectedToken) return false;

  const cookies = input.cookies?.split(';').map(c => c.trim()) ?? [];
  for (const cookie of cookies) {
    if (cookie.startsWith('bf_session=')) {
      const sessionValue = cookie.slice('bf_session='.length);
      return sessionValue === expectedToken;
    }
  }
  return false;
}

export const post = async (input: BffInput): Promise<Response> => {
  // Validate origin and session cookie
  if (!validateOrigin(input) || !validateSession(input)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tempoEndpoint = process.env.TEMPO_ENDPOINT;

  if (!tempoEndpoint) {
    return new Response(JSON.stringify({ error: 'Tempo endpoint not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Body is already parsed by Modern.js BFF - re-stringify it for forwarding
    const body = JSON.stringify(input.data ?? input.body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward auth if provided
    const username = process.env.TEMPO_USERNAME;
    const password = process.env.TEMPO_PASSWORD;

    if (username && password) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(tempoEndpoint, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BFF] Tempo push failed:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Tempo push failed', status: response.status }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the response from Tempo (it may contain partial success info)
    const responseBody = await response.text();
    return new Response(responseBody || null, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[BFF] Tempo proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
