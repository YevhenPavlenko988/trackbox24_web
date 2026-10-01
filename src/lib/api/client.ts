import createClient from 'openapi-fetch'
import type { paths } from './schema'
import { getViewCompanyId } from '@/features/auth/companyView'
import { clearToken, getToken } from '@/features/auth/token'

const LOGIN_PATH = '/api/auth/login'

export const api = createClient<paths>({ baseUrl: '' })

api.use({
  onRequest({ request }) {
    const token = getToken()
    if (token && !request.url.endsWith(LOGIN_PATH)) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    const companyId = getViewCompanyId()
    if (companyId != null) request.headers.set('X-Company-Id', String(companyId))
  },
  onResponse({ request, response }) {
    if (response.status === 401 && !request.url.endsWith(LOGIN_PATH) && getToken()) {
      clearToken()
      window.location.assign('/login?reason=expired')
    }
  },
})
