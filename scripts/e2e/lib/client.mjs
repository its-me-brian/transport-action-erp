// ============================================================================
// CLIENT — cliente HTTP del Web App de Apps Script
// ============================================================================
// Contrato del backend (api.gs):
//   éxito  → { success: true, data: <resultado> }
//   error  → { success: false, statusCode, error: { type, code, message } }
//
// TRAMPA CONOCIDA: varias acciones devuelven HTTP 200 con
//   { success: true, data: { success: false, error: "..." } }
// `success` solo dice que la acción existe. Por eso este cliente trata
// `data.success === false` como fallo. Cualquier test que mire solo
// `success` miente (ver docs/18-LOCAL-TESTING.md §10.6).
// ============================================================================

import { config } from './env.mjs';

export class ApiError extends Error {
  constructor(message, { code = 'API_ERROR', statusCode = 500, action, type } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.action = action;
    this.type = type;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeErrorBody(body, action) {
  const err = body?.error;
  if (typeof err === 'string') {
    return new ApiError(err, { action, code: body.code || 'API_ERROR', statusCode: body.statusCode || 400 });
  }
  if (err && typeof err === 'object') {
    return new ApiError(err.message || 'Error sin mensaje', {
      action,
      code: err.code || 'API_ERROR',
      statusCode: body.statusCode || 400,
      type: err.type,
    });
  }
  return new ApiError('Respuesta de error sin detalle', { action, statusCode: body?.statusCode || 500 });
}

// Registro global: la suite 01 crea clientes secundarios (coord, coord2) para
// probar permisos y sesiones. La cobertura tiene que verlos también.
const globalCalls = [];

/** Acciones invocadas por CUALQUIER cliente de la corrida. */
export function allCalls() {
  return globalCalls.slice();
}

export function resetCalls() {
  globalCalls.length = 0;
}

export function createClient({ gasUrl = config.gasUrl, timeoutMs = config.timeoutMs } = {}) {
  let token = null;

  const calls = [];

  function record(action) {
    calls.push(action);
    globalCalls.push(action);
  }

  async function request(action, data = {}, { method = 'POST', retries = 2 } = {}) {
    record(action);
    const url = new URL(gasUrl);
    url.searchParams.set('action', action);

    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(600 * attempt * attempt);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url.toString(), {
          method,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: method === 'POST' ? JSON.stringify(data) : undefined,
          signal: controller.signal,
          redirect: 'follow',
        });

        const text = await res.text();

        if (res.status >= 500 || res.status === 429) {
          lastError = new ApiError(`HTTP ${res.status} en ${action}`, {
            action,
            code: 'HTTP_' + res.status,
            statusCode: res.status,
          });
          continue;
        }

        let json;
        try {
          json = JSON.parse(text);
        } catch {
          const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
          throw new ApiError(`Respuesta no-JSON de ${action}: ${snippet}`, {
            action,
            code: 'NON_JSON',
            statusCode: res.status,
          });
        }

        if (!json.success) throw normalizeErrorBody(json, action);

        const payload = json.data;

        // Sobre tramposo: la acción existe pero el comando falló.
        // Muchos comandos devuelven { error: "..." } sin success:false.
        if (payload && typeof payload === 'object') {
          if (payload.success === false) throw normalizeErrorBody(payload, action);
          if (typeof payload.error === 'string' && payload.error && payload.success !== true) {
            throw normalizeErrorBody(payload, action);
          }
        }

        return payload;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'NON_JSON') throw e;
        if (e.name === 'AbortError') {
          lastError = new ApiError(`Timeout (${timeoutMs}ms) en ${action}`, {
            action,
            code: 'TIMEOUT',
            statusCode: 504,
          });
          continue;
        }
        if (e instanceof ApiError) throw e;
        lastError = new ApiError(`Fallo de red en ${action}: ${e.message}`, {
          action,
          code: 'NETWORK',
          statusCode: 0,
        });
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  }

  return {
    get token() {
      return token;
    },
    setToken(value) {
      token = value;
    },
    /** Acciones invocadas por este cliente, en orden (con repeticiones). */
    get calls() {
      return calls.slice();
    },
    post(action, data = {}) {
      return request(action, token ? { ...data, token } : data, { method: 'POST' });
    },
    get(action, params = {}) {
      const merged = token ? { ...params, token } : params;
      const url = new URL(gasUrl);
      url.searchParams.set('action', action);
      for (const [k, v] of Object.entries(merged)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
      return requestUrl(url, action);
    },
    raw: request,
  };

  async function requestUrl(url, action = url.searchParams.get('action')) {
    record(action);
    let lastError = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0) await sleep(600 * attempt * attempt);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url.toString(), { signal: controller.signal, redirect: 'follow' });
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          throw new ApiError(`Respuesta no-JSON: ${text.slice(0, 160)}`, { code: 'NON_JSON' });
        }
        if (!json.success) throw normalizeErrorBody(json, action);
        if (json.data && typeof json.data === 'object') {
          if (json.data.success === false) throw normalizeErrorBody(json.data, action);
          if (typeof json.data.error === 'string' && json.data.error && json.data.success !== true) {
            throw normalizeErrorBody(json.data, action);
          }
        }
        return json.data;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'NON_JSON') throw e;
        if (e.name === 'AbortError') {
          lastError = new ApiError('Timeout', { code: 'TIMEOUT', statusCode: 504 });
          continue;
        }
        if (e instanceof ApiError) throw e;
        lastError = new ApiError(`Fallo de red: ${e.message}`, { code: 'NETWORK', statusCode: 0 });
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  }
}

export async function login(client, username, password) {
  const data = await client.post('loginUser', { username, password });
  if (!data?.token) throw new ApiError('Login sin token en la respuesta', { code: 'NO_TOKEN' });
  client.setToken(data.token);
  return data;
}
