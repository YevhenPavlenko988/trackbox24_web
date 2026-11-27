import { Download, FileSignature, FileText, Landmark, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { showApiError } from '@/lib/api/problem'
import type { BillingRequisitesDto, CompanyContractDto, ContractFileResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { CompanyPricesCard } from '../CompanyPricesCard'
import { useAddContractFile, useCompanyBilling, useContract, useContractFiles, useDeleteContractFile, useRequisites, useSaveContract } from '../queries'
import { RequisitesDialog } from '../RequisitesDialog'

type Text = Exclude<keyof CompanyContractDto, 'trialDays' | 'paymentDays' | 'suspendAfterDays' | 'terminationDays' | 'priceNoticeDays' | 'validUntilYear' | 'updatedAt'>
type Days = 'trialDays' | 'paymentDays' | 'suspendAfterDays' | 'terminationDays' | 'priceNoticeDays'

const DAYS: Days[] = ['trialDays', 'paymentDays', 'suspendAfterDays', 'terminationDays', 'priceNoticeDays']
const CLIENT: Text[] = ['clientName', 'clientTaxId', 'clientAddress', 'clientIban', 'clientBank', 'clientTaxStatus', 'clientEmail', 'clientPhone']
const SIGNER: Text[] = ['signerPosition', 'signerName', 'signerInPerson', 'signerBasis']
/** What the Word cannot do without: left blank, it comes out as a yellow gap. */
const OUR_NEEDED: (keyof BillingRequisitesDto)[] = ['name', 'taxId', 'iban', 'bank', 'signer']

/**
 * The contract with the carrier: its terms and the carrier's details (filled from the card, corrected here), our
 * details from «Реквізити», the company's prices (the very ones its invoices use), and the files — every Word made
 * and the signed copy.
 */
export function ContractSection({ companyId }: { companyId: number }) {
  const contract = useContract(companyId)
  const billing = useCompanyBilling(companyId)
  if (contract.isPending || billing.isPending) return <Skeleton className="h-60 w-full" />
  if (!contract.data) return null
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ContractForm companyId={companyId} initial={contract.data} />
      <CompanyPricesCard companyId={companyId} prices={billing.data?.prices ?? []} />
      <FilesCard companyId={companyId} />
    </div>
  )
}

function ContractForm({ companyId, initial }: { companyId: number; initial: CompanyContractDto }) {
  const { t } = useTranslation(['billing', 'common'])
  const [form, setForm] = useState<CompanyContractDto>(initial)
  const [savedAt, setSavedAt] = useState(initial.updatedAt)
  const [requisites, setRequisites] = useState(false)
  const [making, setMaking] = useState(false)
  const us = useRequisites().data
  const billing = useCompanyBilling(companyId).data
  const save = useSaveContract(companyId)
  const addFile = useAddContractFile(companyId)
  const missing = OUR_NEEDED.filter((k) => !us?.[k])
  const set = (key: keyof CompanyContractDto, value: string | number | undefined) => setForm((f) => ({ ...f, [key]: value }))

  const clean = (): CompanyContractDto =>
    Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? (k === 'clientIban' ? v.replace(/\s/g, '').toUpperCase() : v.trim()) || undefined : v]),
    ) as CompanyContractDto

  const persist = async () => {
    const saved = await save.mutateAsync(clean())
    setForm(saved)
    setSavedAt(saved.updatedAt)
    toast.success(t('billing:contract.saved'))
    return saved
  }

  // saves the form, makes the Word, hands it over and keeps a copy in the company's files
  const makeWord = async () => {
    setMaking(true)
    try {
      const saved = await persist()
      const { contractDocx } = await import('./contractDocx')
      const blob = await contractDocx({ contract: saved, us: us ?? {}, prices: billing?.prices ?? [] })
      const name = `Договір ${saved.number ?? ''} ${saved.clientName ?? ''}`.replace(/\s+/g, ' ').replace(/[\\/:*?"<>|]/g, '').trim() + '.docx'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
      await addFile.mutateAsync({ kind: 'GENERATED', file: blob, name })
    } catch (e) {
      showApiError(e)
    } finally {
      setMaking(false)
    }
  }

  const textField = (key: Text, type = 'text') => (
    <Field key={key}>
      <FieldLabel htmlFor={`contract-${key}`}>{t(`billing:contract.fields.${key}`)}</FieldLabel>
      <Input
        id={`contract-${key}`}
        type={type}
        placeholder={t(`billing:contract.placeholders.${key}`, { defaultValue: '' })}
        value={(form[key] as string | undefined) ?? ''}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  )
  const numberField = (key: Days | 'validUntilYear') => (
    <Field key={key}>
      <FieldLabel htmlFor={`contract-${key}`}>{t(`billing:contract.fields.${key}`)}</FieldLabel>
      <Input
        id={`contract-${key}`}
        type="number"
        min={0}
        value={form[key] ?? ''}
        onChange={(e) => set(key, e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </Field>
  )

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t('billing:contract.title')}</CardTitle>
            <CardDescription>
              {savedAt ? t('billing:contract.savedAt', { date: formatDateTime(savedAt) }) : t('billing:contract.notSaved')}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={save.isPending || making} onClick={() => persist().catch(showApiError)}>
              {t('common:actions.save')}
            </Button>
            <Button disabled={save.isPending || making} onClick={makeWord} data-testid="contract-word">
              <Download />
              {t('billing:contract.word')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {missing.length > 0 && (
            <Alert>
              <AlertDescription className="flex flex-wrap items-center gap-2">
                {t('billing:contract.ourMissing', { fields: missing.map((k) => t(`billing:requisites.${k}`)).join(', ') })}
                <Button size="sm" variant="outline" onClick={() => setRequisites(true)}>
                  <Landmark />
                  {t('billing:requisites.title')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t('billing:contract.terms')}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {textField('number')}
              {textField('signedOn', 'date')}
              {textField('city')}
              {numberField('validUntilYear')}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{DAYS.map(numberField)}</div>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t('billing:contract.client')}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{CLIENT.map((k) => textField(k, k === 'clientEmail' ? 'email' : 'text'))}</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{SIGNER.map((k) => textField(k))}</div>
          </section>
          <section className="flex flex-col gap-1 text-sm">
            <h3 className="font-semibold">{t('billing:contract.us')}</h3>
            <p className="text-muted-foreground">
              {[us?.name, us?.taxId && `РНОКПП ${us.taxId}`, us?.iban, us?.signer && t('billing:contract.signs', { name: us.signer })].filter(Boolean).join(' · ') ||
                t('billing:contract.usEmpty')}
              <Button variant="link" size="sm" className="h-auto px-1" onClick={() => setRequisites(true)}>
                {t('billing:contract.editUs')}
              </Button>
            </p>
          </section>
        </CardContent>
      </Card>
      <RequisitesDialog open={requisites} onOpenChange={setRequisites} />
    </>
  )
}

function FilesCard({ companyId }: { companyId: number }) {
  const { t } = useTranslation(['billing', 'common'])
  const files = useContractFiles(companyId)
  const add = useAddContractFile(companyId)
  const remove = useDeleteContractFile(companyId)
  const input = useRef<HTMLInputElement>(null)
  const [deleting, setDeleting] = useState<ContractFileResponse | null>(null)

  const upload = async (file?: File) => {
    if (!file) return
    try {
      await add.mutateAsync({ kind: 'SIGNED', file, name: file.name })
      toast.success(t('billing:contract.uploaded'))
    } catch (e) {
      showApiError(e)
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{t('billing:contract.files')}</CardTitle>
          <CardDescription>{t('billing:contract.filesHint')}</CardDescription>
        </div>
        <input ref={input} type="file" className="hidden" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.heic" onChange={(e) => upload(e.target.files?.[0])} data-testid="contract-upload" />
        <Button variant="outline" disabled={add.isPending} onClick={() => input.current?.click()}>
          <Upload />
          {t('billing:contract.uploadSigned')}
        </Button>
      </CardHeader>
      <CardContent>
        {files.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : !files.data?.length ? (
          <p className="text-sm text-muted-foreground">{t('billing:contract.noFiles')}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {files.data.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                {f.kind === 'SIGNED' ? <FileSignature className="size-4 text-emerald-700 dark:text-emerald-400" /> : <FileText className="size-4 text-muted-foreground" />}
                <a href={f.url ?? undefined} className="font-medium hover:underline" download={f.fileName}>
                  {f.fileName}
                </a>
                <Badge
                  variant="secondary"
                  className={f.kind === 'SIGNED' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : undefined}
                >
                  {t(`billing:contract.kind.${f.kind}`)}
                </Badge>
                <span className="text-muted-foreground">
                  {formatDateTime(f.createdAt)}
                  {f.createdBy ? ` · ${f.createdBy}` : ''}
                </span>
                <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label={t('common:actions.delete')} onClick={() => setDeleting(f)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('billing:contract.deleteFile')}
        description={deleting?.fileName}
        confirmLabel={t('common:actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(deleting!.id!)
            setDeleting(null)
          } catch (e) {
            showApiError(e)
          }
        }}
      />
    </Card>
  )
}
