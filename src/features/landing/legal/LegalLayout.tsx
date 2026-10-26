import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { LEGAL } from '../contacts'
import { LEGAL_DOCS } from './docs'

/** Shared frame of the legal pages: plain reading layout, the company name, the revision date, links to the rest. */
export function LegalLayout({ title, revision, children }: { title: string; revision: string; children: ReactNode }) {
  // The tab should say which document this is; the landing title comes back when the page is left.
  useEffect(() => {
    const previous = document.title
    document.title = `${title} — TrackBox24`
    return () => {
      document.title = previous
    }
  }, [title])
  return (
    <div className="legal min-h-screen bg-white text-navy">
      <header className="border-b border-navy/10">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-bold">
            <img src="/logo.png" alt="" className="size-8" />
            <span>
              Trackbox<span className="text-brand">24</span>
            </span>
          </Link>
          <Link to="/login" className="text-sm font-semibold hover:text-brand">
            Увійти
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-navy/60">Редакція від {revision}</p>
        <article className="mt-8">{children}</article>
      </main>
      <footer className="border-t border-navy/10 py-8 text-sm text-navy/70">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_DOCS.map((d) => (
              <Link key={d.path} to={d.path} className="hover:text-brand">
                {d.title}
              </Link>
            ))}
          </nav>
          <span>{LEGAL.name}</span>
        </div>
      </footer>
    </div>
  )
}

/** The service operator as the documents name it. */
export function Operator() {
  return <>{LEGAL.name}</>
}

/** Contact line for the documents: the e-mail when set, otherwise the demo form on the front page. */
export function ContactLine() {
  return LEGAL.email ? (
    <a href={`mailto:${LEGAL.email}`} className="text-brand hover:underline">
      {LEGAL.email}
    </a>
  ) : (
    <Link to="/#demo" className="text-brand hover:underline">
      через форму на trackbox24.com
    </Link>
  )
}
