import createClient from 'openapi-fetch'
import type { paths } from './schema'
import { clearToken, getToken } from '@/features/auth/token'

const LOGIN_PATH = '/api/auth/login'

export const api = createClient<paths>({ baseUrl: '' })

api.use({
  onRequest({ request }) {
    const token = getToken()
    if (token && !request.url.endsWith(LOGIN_PATH)) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
  },
  onResponse({ request, response }) {
    if (response.status === 401 && !request.url.endsWith(LOGIN_PATH) && getToken()) {
      clearToken()
      window.location.assign('/login?reason=expired')
    }
  },
})
