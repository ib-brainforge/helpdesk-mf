/**
 * BFF Proxy for Loki log push
 *
 * This endpoint proxies log requests from the browser to Loki,
 * bypassing CORS restrictions that prevent direct browser-to-Loki communication.
 *
 * The browser sends logs to: /edge/logs/loki/api/v1/push
 * This proxy forwards them to: LOKI_URL/loki/api/v1/push
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

  const lokiUrl = process.env.LOKI_URL;

  if (!lokiUrl) {
    return new Response(JSON.stringify({ error: 'Loki URL not configured' }), {
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
    const lokiUsername = process.env.LOKI_USERNAME;
    const lokiPassword = process.env.LOKI_PASSWORD;

    if (lokiUsername && lokiPassword) {
      const credentials = Buffer.from(`${lokiUsername}:${lokiPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(`${lokiUrl}/loki/api/v1/push`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BFF] Loki push failed:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Loki push failed', status: response.status }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[BFF] Loki proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
