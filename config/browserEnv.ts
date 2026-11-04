import { Buffer } from 'node:buffer';

/** Fail before Vite can serialize a privileged Supabase key into browser code. */
export function assertPublicFrontendEnv(env: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value) continue;
    const candidate = value.trim();
    let serverOnly = candidate.startsWith('sb_secret_');
    if (name.startsWith('VITE_SUPABASE') && candidate.split('.').length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(candidate.split('.')[1], 'base64url').toString());
        serverOnly ||= payload.role === 'service_role';
      } catch { /* Invalid keys are handled by Supabase; never include their values in errors. */ }
    }
    if (serverOnly) {
      throw new Error(`${name} contains a server-only Supabase key. Use a publishable key or legacy anon key for browser configuration.`);
    }
  }
}
