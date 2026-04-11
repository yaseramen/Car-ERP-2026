import { createClient, type Client } from "@libsql/client";

function getTursoConfig(): { url: string; authToken: string } {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env");
  }
  return { url, authToken };
}

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    const { url, authToken } = getTursoConfig();
    _client = createClient({ url, authToken });
  }
  return _client;
}

/** Lazy client so importing this module during `next build` does not require Turso env until a query runs. */
export const db: Client = new Proxy({} as Client, {
  get(_target, prop, receiver) {
    const real = getClient();
    const value = Reflect.get(real, prop, receiver) as unknown;
    if (typeof value === "function") {
      return value.bind(real);
    }
    return value;
  },
});
