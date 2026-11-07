export interface AuthApiUser { id: string; fullName: string; email: string; role: 'STUDENT' | 'ADMIN'; specialization: string; }
interface AuthApiResponse { ok: boolean; message?: string; user?: AuthApiUser; }
async function request(endpoint: string, options: RequestInit = {}): Promise<AuthApiResponse> {
  try {
    const response = await fetch(`/api/auth/${endpoint}`, {
      ...options, credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    const data = (await response.json()) as AuthApiResponse;
    return { ...data, ok: response.ok && data.ok === true };
  } catch { return { ok: false, message: 'Authentication server unavailable.' }; }
}
export const authApi = {
  register: (payload: { fullName: string; email: string; password: string; specialization?: string }) => request('register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email: string, password: string) => request('login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('me'),
  logout: () => request('logout', { method: 'POST' }),
};
