/**
 * Runtime configuration, all from the environment (see docker-compose.portainer.yml).
 */
export interface Config {
  /** Public origin of the app, e.g. https://campaign.example.com. The MCP endpoint is <origin>/mcp. */
  publicUrl: URL;
  port: number;
  supabase: {
    /** Supabase gateway as seen from this container, e.g. http://envoy:8000. */
    url: string;
    anonKey: string;
    /** The dedicated user Claude acts as (role `assistant`). */
    email: string;
    password: string;
  };
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

export function loadConfig(): Config {
  const publicUrl = new URL(required('MCP_PUBLIC_URL'));
  if (publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) {
    throw new Error('MCP_PUBLIC_URL must be an origin without a path, e.g. https://campaign.example.com');
  }
  return {
    publicUrl,
    port: Number(process.env['PORT'] ?? 3000),
    // Missing credentials are reported per request (503), not at startup,
    // so a stack deployed before the Claude user exists does not crash-loop.
    supabase: {
      url: required('SUPABASE_URL'),
      anonKey: process.env['SUPABASE_ANON_KEY']?.trim() ?? '',
      email: process.env['MCP_SUPABASE_EMAIL']?.trim() ?? '',
      password: process.env['MCP_SUPABASE_PASSWORD'] ?? '',
    },
  };
}
