import { apiGet, apiSend } from '../../../api/apiClient.js';
import type { LoginResult, User } from '../../../types/api.js';

export async function loginApi(email: string, password: string): Promise<LoginResult> {
  return apiSend<LoginResult>('POST', '/auth/login', {
    body: { email, password },
    token: null, // No enviar token en login
  });
}

export async function getMeApi(): Promise<User> {
  return apiGet<User>('/me');
}
