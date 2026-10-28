import {
  Banknote,
  Camera,
  Clock,
  Cloud,
  CreditCard,
  FileOutput,
  GitMerge,
  LayoutDashboard,
  ListChecks,
  Menu,
  PackagePlus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  Truck,
  Users,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ContactLinks } from './ContactLinks'
import { hasContacts } from './contacts'
import { LEGAL_DOCS } from './legal/docs'
import { DemoRequestForm } from './DemoRequestForm'

type Item = { name: string; text: string }
type Pain = { title: string; text: string }
type Faq = { q: string; a: string }

const YEAR = new Date().getFullYear()
const wrap = 'mx-auto w-full max-w-6xl px-4 sm:px-6'
const h2 = 'text-3xl font-bold tracking-tight sm:text-4xl'
const cta = 'inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand/90'
const ghost = 'inline-flex h-12 items-center justify-center rounded-xl border border-white/40 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10'

/** The public front page: the sales pitch for carriers, with the sign-in for existing customers kept one click away. */
export function LandingPage() {
  const { t } = useTranslation('landing')
  return (
    <div className="landing min-h-screen bg-white text-navy">
      <Header />
      <main>
        <Hero />
        <Pains />
        <Roles />
        <Journey />
        <NovaPoshta />
        <Driver />
        <Money />
        <Control />
        <Start />
        <Faq />
        <Cta />
      </main>
      <footer className="bg-navy-deep py-10 text-white/70">
        <div className={`${wrap} flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="size-8" />
            <div>
              <p className="font-semibold text-white">TrackBox24</p>
              <p>{t('footer.tagline')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <nav className="flex flex-wrap gap-x-4 gap-y-1">
              {LEGAL_DOCS.map((d) => (
                <Link key={d.path} to={d.path} className="hover:text-white">
                  {d.title}
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/login" className="text-white hover:underline">
                {t('footer.login')}
              </Link>
              <span>{t('footer.rights', { year: YEAR })}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Header() {
  const { t } = useTranslation('landing')
  const [open, setOpen] = useState(false)
  const links = [
    ['#features', t('nav.features')],
    ['#how', t('nav.how')],
    ['#np', t('nav.np')],
    ['#start', t('nav.start')],
  ] as const
  return (
    <header className="sticky top-0 z-20 border-b border-navy/10 bg-white/90 backdrop-blur">
      <div className={`${wrap} flex h-16 items-center justify-between gap-4`}>
        <a href="#top" className="flex items-center gap-2.5 text-lg font-bold">
          <img src="/logo.png" alt="" className="size-8" />
          <span>
            Trackbox<span className="text-brand">24</span>
          </span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-brand">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/track" className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold hover:text-brand">
            {t('nav.track')}
          </Link>
          <Link to="/login" className="inline-flex h-10 items-center rounded-lg border border-navy/20 px-4 text-sm font-semibold hover:bg-sand">
            {t('nav.login')}
          </Link>
          <a href="#demo" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90">
            {t('nav.demo')}
          </a>
        </div>
        <button type="button" className="rounded-lg p-2 md:hidden" aria-label={t('nav.menu')} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="border-t border-navy/10 bg-white md:hidden">
          <nav className={`${wrap} flex flex-col gap-1 py-3 text-base font-medium`}>
            {links.map(([href, label]) => (
              <a key={href} href={href} className="rounded-lg px-2 py-2 hover:bg-sand" onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
            <Link to="/track" className="rounded-lg px-2 py-2 hover:bg-sand">
              {t('nav.track')}
            </Link>
            <div className="mt-2 flex gap-2">
              <Link to="/login" className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-navy/20 font-semibold">
                {t('nav.login')}
              </Link>
              <a href="#demo" className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-brand font-semibold text-white" onClick={() => setOpen(false)}>
                {t('nav.demo')}
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

function Hero() {
  const { t } = useTranslation('landing')
  return (
    <section id="top" className="bg-navy text-white">
      <div className={`${wrap} grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24`}>
        <div>
          <p className="mb-4 text-xs font-bold tracking-[0.2em] text-brand uppercase">{t('hero.kicker')}</p>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">{t('hero.title')}</h1>
          <p className="mt-6 max-w-xl text-lg text-white/80 sm:text-xl">{t('hero.subtitle')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#demo" className={cta}>
              {t('hero.demo')}
            </a>
            <Link to="/login" className={ghost}>
              {t('hero.login')}
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <BrowserFrame src="/landing/web-parcels.webp" alt={t('hero.webShot')} />
          <div className="absolute -right-2 -bottom-8 w-[34%] sm:-right-6 sm:-bottom-10">
            <PhoneFrame src="/landing/mob-scan.webp" alt={t('hero.mobShot')} />
          </div>
        </div>
      </div>
    </section>
  )
}

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/20">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2">
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="size-2.5 rounded-full bg-slate-300" />
      </div>
      <img src={src} alt={alt} className="block w-full" loading="eager" />
    </div>
  )
}

function PhoneFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[12%/5.5%] bg-navy-deep p-[3%] shadow-2xl ring-1 ring-black/30 ${className}`}>
      <img src={src} alt={alt} className="block w-full rounded-[9%/4%]" loading="lazy" />
    </div>
  )
}

function Pains() {
  const { t } = useTranslation('landing')
  const items = t('pains.items', { returnObjects: true }) as Pain[]
  return (
    <section className="bg-sand py-16 sm:py-20">
      <div className={wrap}>
        <h2 className={h2}>{t('pains.title')}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-lg font-bold text-brand">{p.title}</p>
              <p className="mt-2 text-navy/80">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Roles() {
  const { t } = useTranslation('landing')
  const items = t('roles.items', { returnObjects: true }) as Item[]
  const icons = [LayoutDashboard, ScanLine, Truck]
  const kinds = [t('roles.web'), t('roles.app'), t('roles.app')]
  return (
    <section id="features" className="scroll-mt-16 py-16 sm:py-20">
      <div className={wrap}>
        <h2 className={h2}>{t('roles.title')}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.map((r, i) => {
            const Icon = icons[i]
            return (
              <div key={r.name} className="rounded-2xl bg-navy p-6 text-white">
                <Icon className="size-8 text-brand" />
                <p className="mt-4 text-xl font-bold">{r.name}</p>
                <p className="mt-1 text-xs font-bold tracking-[0.15em] text-brand uppercase">{kinds[i]}</p>
                <p className="mt-3 text-white/85">{r.text}</p>
              </div>
            )
          })}
        </div>
        <p className="mt-6 max-w-3xl text-navy/70">{t('roles.note')}</p>
      </div>
    </section>
  )
}

function Journey() {
  const { t } = useTranslation('landing')
  const steps = t('journey.steps', { returnObjects: true }) as Item[]
  return (
    <section id="how" className="scroll-mt-16 bg-sand py-16 sm:py-20">
      <div className={wrap}>
        <h2 className={h2}>{t('journey.title')}</h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => {
            const last = i === steps.length - 1
            return (
              <li key={s.name} className={`rounded-2xl p-5 ${last ? 'bg-navy text-white' : 'bg-white shadow-sm'}`}>
                <p className="text-2xl font-bold text-brand">{i + 1}</p>
                <p className="mt-2 text-lg font-bold">{s.name}</p>
                <p className={`mt-1 text-sm ${last ? 'text-white/80' : 'text-navy/70'}`}>{s.text}</p>
              </li>
            )
          })}
        </ol>
        <p className="mt-6 max-w-3xl text-navy/70">{t('journey.note')}</p>
      </div>
    </section>
  )
}

function NovaPoshta() {
  const { t } = useTranslation('landing')
  const items = t('np.items', { returnObjects: true }) as Item[]
  const icons: LucideIcon[] = [Clock, TriangleAlert, Banknote, GitMerge, FileOutput]
  return (
    <section id="np" className="scroll-mt-16 py-16 sm:py-20">
      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[1fr_auto_1fr]`}>
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-brand uppercase">{t('np.kicker')}</p>
          <h2 className={h2}>{t('np.title')}</h2>
          <p className="mt-4 text-lg text-navy/75">{t('np.text')}</p>
        </div>
        <PhoneFrame src="/landing/mob-receive.webp" alt={t('np.shot')} className="mx-auto w-56 lg:w-64" />
        <ul className="flex flex-col gap-3">
          {items.map((it, i) => {
            const Icon = icons[i]
            return (
              <li key={it.name} className="flex items-start gap-3 rounded-xl bg-sand p-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <Icon className="size-4" />
                </span>
                <p>
                  <span className="font-bold">{it.name}</span> — {it.text}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Driver() {
  const { t } = useTranslation('landing')
  const items = t('driver.items', { returnObjects: true }) as Item[]
  const icons: LucideIcon[] = [ScanLine, WifiOff, CreditCard, PackagePlus]
  return (
    <section className="bg-navy py-16 text-white sm:py-20">
      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[1.4fr_1fr]`}>
        <div>
          <h2 className={`${h2} text-balance`}>{t('driver.title')}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((it, i) => {
              const Icon = icons[i]
              return (
                <div key={it.name} className="rounded-2xl bg-white/8 p-5 ring-1 ring-white/10">
                  <Icon className="size-6 text-brand" />
                  <p className="mt-3 text-lg font-bold text-brand">{it.name}</p>
                  <p className="mt-1 text-white/85">{it.text}</p>
                </div>
              )
            })}
          </div>
        </div>
        <PhoneFrame src="/landing/mob-payments.webp" alt={t('driver.shot')} className="mx-auto w-60 lg:w-72" />
      </div>
    </section>
  )
}

function Money() {
  const { t } = useTranslation('landing')
  const items = t('money.items', { returnObjects: true }) as string[]
  const rows: [string, string, boolean?][] = [
    [t('money.card.cash'), '12 450 грн'],
    [t('money.card.uaCard'), '8 200 грн'],
    [t('money.card.euCard'), '640 €'],
    [t('money.card.unpaid'), t('money.card.unpaidValue'), true],
  ]
  return (
    <section className="bg-sand py-16 sm:py-20">
      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-2`}>
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-brand uppercase">{t('money.kicker')}</p>
          <h2 className={h2}>{t('money.title')}</h2>
          <ul className="mt-6 flex flex-col gap-3 text-lg text-navy/80">
            {items.map((s) => (
              <li key={s} className="flex items-start gap-3">
                <ListChecks className="mt-1 size-5 shrink-0 text-brand" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-lg" aria-hidden>
          <p className="font-bold">{t('money.card.title')}</p>
          <dl className="mt-4 divide-y divide-slate-100">
            {rows.map(([k, v, warn]) => (
              <div key={k} className={`flex items-center justify-between py-3 ${warn ? 'font-semibold text-brand' : ''}`}>
                <dt className={warn ? '' : 'text-navy/70'}>{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}

function Control() {
  const { t } = useTranslation('landing')
  const items = t('control.items', { returnObjects: true }) as Item[]
  const icons: LucideIcon[] = [Clock, ShieldCheck, Users, Camera, RotateCcw, Cloud]
  return (
    <section className="py-16 sm:py-20">
      <div className={wrap}>
        <h2 className={h2}>{t('control.title')}</h2>
        <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => {
            const Icon = icons[i]
            return (
              <div key={it.name} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-lg font-bold">{it.name}</p>
                  <p className="mt-1 text-navy/70">{it.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Start() {
  const { t } = useTranslation('landing')
  const steps = t('start.steps', { returnObjects: true }) as Item[]
  return (
    <section id="start" className="scroll-mt-16 bg-brand py-16 text-navy sm:py-20">
      <div className={wrap}>
        <h2 className={h2}>{t('start.title')}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.name} className="rounded-2xl bg-white/90 p-6">
              <p className="text-4xl font-bold">{i + 1}</p>
              <p className="mt-3 text-xl font-bold">{s.name}</p>
              <p className="mt-1 text-navy/70">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-lg font-semibold">{t('start.price')}</p>
      </div>
    </section>
  )
}

function Faq() {
  const { t } = useTranslation('landing')
  const items = t('faq.items', { returnObjects: true }) as Faq[]
  return (
    <section className="py-16 sm:py-20">
      <div className={`${wrap} max-w-3xl`}>
        <h2 className={h2}>{t('faq.title')}</h2>
        <div className="mt-8 divide-y divide-navy/10">
          {items.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {f.q}
                <span className="shrink-0 text-brand transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-navy/75">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function Cta() {
  const { t } = useTranslation('landing')
  return (
    <section id="demo" className="scroll-mt-16 bg-navy py-16 text-white sm:py-24">
      <div className={`${wrap} grid gap-10 lg:grid-cols-2 lg:gap-16`}>
        <div>
          <h2 className={`${h2} text-balance sm:text-5xl`}>{t('cta.title')}</h2>
          <p className="mt-4 text-lg text-white/80">{t('cta.text')}</p>
          <Contacts />
        </div>
        <DemoRequestForm />
      </div>
    </section>
  )
}

function Contacts() {
  const { t } = useTranslation('landing')
  if (!hasContacts()) return null
  return (
    <>
      <p className="mt-8 text-sm text-white/60">{t('cta.or')}</p>
      <ContactLinks className="mt-3" />
    </>
  )
}
