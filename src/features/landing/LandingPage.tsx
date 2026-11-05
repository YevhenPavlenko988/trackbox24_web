import {
  BadgeCheck,
  Banknote,
  BellRing,
  QrCode,
  Boxes,
  Camera,
  Clock,
  Coins,
  Gift,
  FileSpreadsheet,
  Lock,
  Cloud,
  CreditCard,
  Calculator,
  FileOutput,
  GitMerge,
  LayoutDashboard,
  ListChecks,
  ListX,
  Menu,
  PackagePlus,
  RotateCcw,
  Route,
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
import { QRCodeSVG } from 'qrcode.react'
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
        <Moves />
        <Driver />
        <Currency />
        <Money />
        <Control />
        <Referral />
        <Payments />
        <Start />
        <Faq />
        <Cta />
      </main>
      <footer className="bg-navy-deep py-10 text-white/70">
        <div className={`${wrap} flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="size-8 object-contain" />
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
    ['#moves', t('nav.moves')],
    ['#start', t('nav.start')],
  ] as const
  return (
    <header className="sticky top-0 z-20 border-b border-navy/10 bg-white/90 backdrop-blur">
      <div className={`${wrap} flex h-16 items-center justify-between gap-4`}>
        <a href="#top" className="flex items-center gap-2.5 text-lg font-bold">
          <img src="/logo.png" alt="" className="size-8 object-contain" />
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
          <BrowserFrame src="/landing/web-parcels.webp?v=2" alt={t('hero.webShot')} />
          <div className="absolute -right-2 -bottom-8 w-[34%] sm:-right-6 sm:-bottom-10">
            <PhoneFrame src="/landing/mob-scan.webp?v=2" alt={t('hero.mobShot')} />
          </div>
        </div>
      </div>
    </section>
  )
}

/** A soft light glow around the shots: the cabinet's navy menu must not melt into the navy sections. */
function BrowserFrame({ src, alt, lazy = false }: { src: string; alt: string; lazy?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgb(255_255_255/0.25),0_20px_60px_-10px_rgb(255_255_255/0.25),0_25px_50px_-12px_rgb(0_0_0/0.5)]">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2">
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="size-2.5 rounded-full bg-slate-300" />
      </div>
      <img src={src} alt={alt} className="block w-full" loading={lazy ? 'lazy' : 'eager'} />
    </div>
  )
}

function PhoneFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[12%/5.5%] bg-navy-deep p-[3%] shadow-[0_0_0_1px_rgb(255_255_255/0.25),0_20px_60px_-10px_rgb(255_255_255/0.22),0_25px_50px_-12px_rgb(0_0_0/0.5)] ${className}`}>
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
        <PhoneFrame src="/landing/mob-receive.webp?v=2" alt={t('np.shot')} className="mx-auto w-56 lg:w-64" />
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

/** The moves module: what it gives, the order's seven steps, the web and the phone side by side. */
function Moves() {
  const { t } = useTranslation('landing')
  const items = t('moves.items', { returnObjects: true }) as Item[]
  const steps = t('moves.steps', { returnObjects: true }) as Item[]
  const icons: LucideIcon[] = [Boxes, ListX, Route, Calculator]
  return (
    <section id="moves" className="scroll-mt-16 bg-sand py-16 sm:py-20">
      <div className={wrap}>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="mb-3 text-xs font-bold tracking-[0.2em] text-brand uppercase">{t('moves.kicker')}</p>
            <h2 className={`${h2} text-balance`}>{t('moves.title')}</h2>
            <p className="mt-4 text-lg text-navy/75">{t('moves.text')}</p>
          </div>
          <div className="relative mx-auto w-full max-w-xl pb-8 lg:max-w-none">
            <BrowserFrame src="/landing/web-move.webp?v=2" alt={t('moves.webShot')} lazy />
            <div className="absolute -right-2 -bottom-2 w-[30%] sm:-right-4">
              <PhoneFrame src="/landing/mob-move.webp?v=2" alt={t('moves.mobShot')} />
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => {
            const Icon = icons[i]
            return (
              <div key={it.name} className="rounded-2xl bg-white p-6 shadow-sm">
                <Icon className="size-7 text-brand" />
                <p className="mt-3 text-lg font-bold">{it.name}</p>
                <p className="mt-1 text-navy/75">{it.text}</p>
              </div>
            )
          })}
        </div>

        <h3 className="mt-14 text-2xl font-bold tracking-tight">{t('moves.stepsTitle')}</h3>
        <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {steps.map((s, i) => {
            const last = i === steps.length - 1
            return (
              <li key={s.name} className={`rounded-2xl p-4 ${last ? 'bg-navy text-white' : 'bg-white shadow-sm'}`}>
                <p className="text-xl font-bold text-brand">{i + 1}</p>
                <p className="mt-1 font-bold">{s.name}</p>
                <p className={`mt-1 text-sm ${last ? 'text-white/80' : 'text-navy/70'}`}>{s.text}</p>
              </li>
            )
          })}
        </ol>
        <p className="mt-6 max-w-3xl text-navy/70">{t('moves.note')}</p>
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
        <PhoneFrame src="/landing/mob-payments.webp?v=2" alt={t('driver.shot')} className="mx-auto w-60 lg:w-72" />
      </div>
    </section>
  )
}

/** «Курси валют»: a payment in whatever currency the client has, its rate kept, the bill in any currency. */
function Currency() {
  const { t } = useTranslation('landing')
  const items = t('currency.items', { returnObjects: true }) as Item[]
  const icons: LucideIcon[] = [Coins, Users, Lock, FileSpreadsheet]
  const shown = ['€', 'грн', '$', 'zł']
  return (
    <section id="currency" className="scroll-mt-16 py-16 sm:py-20">
      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]`}>
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-brand uppercase">{t('currency.kicker')}</p>
          <h2 className={`${h2} text-balance`}>{t('currency.title')}</h2>
          <p className="mt-4 text-lg text-navy/75">{t('currency.text')}</p>
          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {items.map((it, i) => {
              const Icon = icons[i]
              return (
                <div key={it.name} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-bold">{it.name}</p>
                    <p className="mt-1 text-navy/70">{it.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-8 text-navy/60">{t('currency.note')}</p>
        </div>

        {/* what the driver enters and what the move counts: the rate stays with the payment */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-4" aria-hidden>
          <div className="rounded-2xl bg-navy p-6 text-white shadow-lg">
            <p className="text-sm text-white/70">{t('currency.card.payment')}</p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 tabular-nums">
              <span className="text-3xl font-bold whitespace-nowrap sm:text-4xl">30 €</span>
              <span className="text-2xl text-brand">→</span>
              <span className="text-3xl font-bold whitespace-nowrap text-brand sm:text-4xl">1 552,79 грн</span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
              <Lock className="size-4 text-brand" />
              {t('currency.card.rate')}
            </p>
          </div>
          <div className="rounded-2xl bg-sand p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold">{t('currency.card.bill')}</p>
              <div className="flex rounded-lg bg-white p-0.5 text-sm">
                {shown.map((c) => (
                  <span key={c} className={`rounded-md px-2.5 py-1 font-semibold ${c === '$' ? 'bg-navy text-white' : 'text-navy/60'}`}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <dl className="mt-4 divide-y divide-navy/10 tabular-nums">
              <div className="flex justify-between py-2">
                <dt className="text-navy/70">{t('currency.card.total')}</dt>
                <dd className="font-semibold">1 645,18 $</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-navy/70">{t('currency.card.paid')}</dt>
                <dd className="font-semibold">549,50 $</dd>
              </div>
              <div className="flex justify-between py-2 text-lg">
                <dt className="font-bold">{t('currency.card.due')}</dt>
                <dd className="font-bold">1 095,68 $</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-navy/60">{t('currency.card.line')}</p>
          </div>
        </div>
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

/** «Реферальна програма»: how a client brings a client, in order, and what the client sees of their points. */
function Referral() {
  const { t } = useTranslation('landing')
  const steps = t('referral.steps', { returnObjects: true }) as Item[]
  return (
    <section id="referral" className="scroll-mt-16 bg-sand py-16 sm:py-20">
      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]`}>
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-brand uppercase">{t('referral.kicker')}</p>
          <h2 className={`${h2} text-balance`}>{t('referral.title')}</h2>
          <p className="mt-4 text-lg text-navy/75">{t('referral.text')}</p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.name} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xl font-bold text-brand">{i + 1}</p>
                <p className="mt-1 font-bold">{s.name}</p>
                <p className="mt-1 text-navy/70">{s.text}</p>
              </li>
            ))}
          </ol>
          <h3 className="mt-10 text-xl font-bold tracking-tight">{t('referral.settingsTitle')}</h3>
          <ul className="mt-4 flex flex-col gap-2.5 text-navy/80">
            {(t('referral.settings', { returnObjects: true }) as string[]).map((s) => (
              <li key={s} className="flex items-start gap-3">
                <ListChecks className="mt-0.5 size-5 shrink-0 text-brand" />
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-navy/60">{t('referral.note')}</p>
        </div>

        {/* what the client sees: the balance on the tracking page and the bot's message after a payment */}
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4" aria-hidden>
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-navy/60">{t('referral.card.tracking')}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-brand/15 text-brand">
                <Gift className="size-5" />
              </span>
              <p>
                <span className="block text-sm text-navy/60">{t('referral.card.yours')}</span>
                <span className="text-3xl font-bold tabular-nums">340</span> <span className="text-navy/60">{t('referral.card.unit')} ≈ 34 €</span>
              </p>
            </div>
          </div>
          <div className="self-end rounded-2xl rounded-br-sm bg-[#E3F2FD] p-4 text-navy shadow-sm sm:max-w-[85%]">
            <p className="text-xs font-semibold text-[#1F8BC2]">TrackBox24</p>
            <p className="mt-1">{t('referral.card.bot')}</p>
            <p className="mt-1 font-semibold">{t('referral.card.botTotal')}</p>
          </div>
          <div className="rounded-2xl bg-navy p-5 text-white">
            <p className="text-sm text-white/70">{t('referral.card.pay')}</p>
            <p className="mt-2 flex items-baseline justify-between tabular-nums">
              <span>{t('referral.card.price')}</span>
              <span className="font-semibold">30 €</span>
            </p>
            <p className="flex items-baseline justify-between tabular-nums text-brand">
              <span>{t('referral.card.points')}</span>
              <span className="font-semibold">−5 €</span>
            </p>
            <p className="mt-1 flex items-baseline justify-between border-t border-white/15 pt-2 text-lg font-bold tabular-nums">
              <span>{t('referral.card.due')}</span>
              <span>25 €</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Payments() {
  const { t } = useTranslation('landing')
  const items = t('payments.items', { returnObjects: true }) as Item[]
  const icons: LucideIcon[] = [CreditCard, BadgeCheck, QrCode, BellRing]
  return (
    <section id="payments" className="scroll-mt-16 py-16 sm:py-20">
      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]`}>
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-brand uppercase">{t('payments.kicker')}</p>
          <h2 className={`${h2} text-balance`}>{t('payments.title')}</h2>
          <p className="mt-4 text-lg text-navy/75">{t('payments.text')}</p>
          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {items.map((it, i) => {
              const Icon = icons[i]
              return (
                <div key={it.name} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-bold">{it.name}</p>
                    <p className="mt-1 text-navy/70">{it.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-8 text-navy/60">{t('payments.note')}</p>
        </div>

        {/* what the client sees on the tracking page: the due sum, the card button and the transfer by QR */}
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4" aria-hidden>
          <div className="rounded-3xl border border-navy/10 bg-white p-5 shadow-lg">
            <p className="text-sm text-navy/60">{t('payments.card.page')}</p>
            <p className="mt-2 text-lg">
              {t('payments.card.due')}: <span className="text-3xl font-bold tabular-nums">30 €</span>
            </p>
            <div className="mt-4 rounded-xl bg-brand py-3 text-center font-semibold text-white">{t('payments.card.byCard')}</div>
            <p className="mt-2 text-center text-sm text-navy/55">{t('payments.card.provider')}</p>
            <div className="mt-5 border-t border-navy/10 pt-4">
              <p className="font-semibold">{t('payments.card.transfer')}</p>
              <div className="mt-3 flex items-center gap-4">
                <QRCodeSVG value="https://trackbox24.com/track" size={96} marginSize={1} className="shrink-0 rounded-md bg-white" />
                <div className="flex flex-col gap-2 text-sm text-navy/70">
                  <span>{t('payments.card.scan')}</span>
                  <span className="w-fit rounded-lg bg-navy px-3 py-1.5 font-semibold text-white">{t('payments.card.claim')}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-900 shadow-sm">
            <BadgeCheck className="size-5" />
            {t('payments.card.done')}
          </div>
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
