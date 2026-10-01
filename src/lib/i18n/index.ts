import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import auth from './uk/auth.json'
import clients from './uk/clients.json'
import common from './uk/common.json'
import parcels from './uk/parcels.json'

i18n.use(initReactI18next).init({
  lng: 'uk',
  fallbackLng: 'uk',
  defaultNS: 'common',
  resources: { uk: { common, auth, parcels, clients } },
  interpolation: { escapeValue: false },
})

export default i18n
