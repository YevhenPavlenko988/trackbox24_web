import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import auth from './uk/auth.json'
import cars from './uk/cars.json'
import clients from './uk/clients.json'
import common from './uk/common.json'
import companies from './uk/companies.json'
import parcels from './uk/parcels.json'
import shipments from './uk/shipments.json'
import users from './uk/users.json'

i18n.use(initReactI18next).init({
  lng: 'uk',
  fallbackLng: 'uk',
  defaultNS: 'common',
  resources: { uk: { common, auth, parcels, clients, companies, users, cars, shipments } },
  interpolation: { escapeValue: false },
})

export default i18n
