import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import auth from './uk/auth.json'
import billing from './uk/billing.json'
import cars from './uk/cars.json'
import clients from './uk/clients.json'
import common from './uk/common.json'
import companies from './uk/companies.json'
import crm from './uk/crm.json'
import landing from './uk/landing.json'
import novaPoshta from './uk/novaPoshta.json'
import parcels from './uk/parcels.json'
import trash from './uk/trash.json'
import tracking from './uk/tracking.json'
import trips from './uk/trips.json'
import users from './uk/users.json'
import warehouses from './uk/warehouses.json'

i18n.use(initReactI18next).init({
  lng: 'uk',
  fallbackLng: 'uk',
  defaultNS: 'common',
  resources: { uk: { common, auth, billing, parcels, clients, companies, crm, users, cars, trips, warehouses, trash, novaPoshta, landing, tracking } },
  interpolation: { escapeValue: false },
})

export default i18n
