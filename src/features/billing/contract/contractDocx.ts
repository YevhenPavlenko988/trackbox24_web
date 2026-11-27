import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  type ITableCellBorders,
  TextRun,
  WidthType,
} from 'docx'
import type { BillingRequisitesDto, CompanyContractDto, CompanyPriceResponse } from '@/lib/api/types'

/**
 * The service contract with a carrier as a Word file. The text is the lawyer-reviewable template; the parties, terms and
 * prices come from the contract form, our «Реквізити» and the company's prices. Anything not filled in stays a yellow
 * blank to complete by hand.
 */

const FONT = 'Times New Roman'
const SIZE = 23 // 11.5 pt

/** «[[…]]» marks a field to fill in: highlighted yellow; «**…**» is bold. */
function runs(text: string, opts: { bold?: boolean; size?: number } = {}): TextRun[] {
  const out: TextRun[] = []
  for (const p of text.split(/(\[\[.*?\]\])/)) {
    if (!p) continue
    if (p.startsWith('[[')) {
      out.push(new TextRun({ text: p.slice(2, -2), highlight: 'yellow', font: FONT, size: SIZE, ...opts }))
      continue
    }
    for (const q of p.split(/(\*\*.*?\*\*)/)) {
      if (!q) continue
      if (q.startsWith('**')) out.push(new TextRun({ text: q.slice(2, -2), bold: true, font: FONT, size: SIZE, ...opts }))
      else out.push(new TextRun({ text: q, font: FONT, size: SIZE, ...opts }))
    }
  }
  return out
}

/** The value, or a yellow blank with a hint when it is missing. */
const v = (value: string | number | undefined | null, blank: string) => (value == null || value === '' ? `[[${blank}]]` : String(value))

type Align = (typeof AlignmentType)[keyof typeof AlignmentType]

const P = (text: string, o: { align?: Align; after?: number; size?: number } = {}) =>
  new Paragraph({ children: runs(text, { size: o.size }), alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { after: o.after ?? 80, line: 264 } })
const H = (text: string) =>
  new Paragraph({ children: runs(text, { bold: true }), alignment: AlignmentType.CENTER, spacing: { before: 220, after: 100 }, keepNext: true })
const C = (num: string, text: string) =>
  new Paragraph({ children: [...runs(num + ' '), ...runs(text)], alignment: AlignmentType.JUSTIFIED, spacing: { after: 70, line: 264 } })
const Sub = (text: string) => new Paragraph({ children: runs(text), alignment: AlignmentType.JUSTIFIED, spacing: { after: 50, line: 264 }, indent: { left: 360 } })

const thin = { style: BorderStyle.SINGLE, size: 4, color: '808080' }
const borders: ITableCellBorders = { top: thin, bottom: thin, left: thin, right: thin }
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const noBorders: ITableCellBorders = { top: none, bottom: none, left: none, right: none }

function cell(text: string | string[], width: number, o: { borders?: ITableCellBorders; shade?: string; align?: Align; keep?: boolean } = {}) {
  const lines = Array.isArray(text) ? text : [text]
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: o.borders ?? borders,
    shading: o.shade ? { type: ShadingType.CLEAR, fill: o.shade, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: lines.map((l) => new Paragraph({ children: runs(l), alignment: o.align ?? AlignmentType.LEFT, spacing: { after: 30 }, keepNext: o.keep })),
  })
}

const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']

/** «« 1 » грудня 2026 р.», or blanks when there is no date. */
function longDate(iso?: string) {
  if (!iso) return '«[[__]]» [[__________]] 20[[__]] р.'
  const [y, m, d] = iso.split('-').map(Number)
  return `«${d}» ${MONTHS[m - 1]} ${y} р.`
}

/** «Петренко Олег Іванович» → «Петренко О. І.». */
export function shortName(full?: string) {
  if (!full) return undefined
  const [last, ...rest] = full.trim().split(/\s+/)
  return [last, ...rest.map((p) => `${p[0]}.`)].join(' ')
}

const money = (n?: number) => (n == null ? '' : n.toLocaleString('uk-UA', { maximumFractionDigits: 2 }))

export type ContractInput = {
  contract: CompanyContractDto
  us: BillingRequisitesDto
  prices: CompanyPriceResponse[]
}

export async function contractDocx({ contract: c, us, prices }: ContractInput): Promise<Blob> {
  const no = v(c.number, '____')
  const date = longDate(c.signedOn)
  const ourName = v(us.name, 'ФОП Прізвище Ім’я По батькові')
  const ourSigner = v(us.signer, 'Прізвище І. П.')
  const clientSigner = v(shortName(c.signerName), 'Прізвище І. П.')
  const days = (n: number) => `${n}`

  const body: (Paragraph | Table)[] = []
  body.push(new Paragraph({ children: runs(`ДОГОВІР № ${no}`, { bold: true, size: 28 }), alignment: AlignmentType.CENTER, spacing: { after: 40 } }))
  body.push(
    new Paragraph({
      children: runs('про надання послуг доступу до програмного забезпечення TrackBox24', { bold: true, size: 25 }),
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  )
  body.push(
    new Paragraph({
      children: [...runs(`м. ${v(c.city ?? us.city, '__________')}`), new TextRun({ text: '\t', font: FONT, size: SIZE }), ...runs(date)],
      tabStops: [{ type: TabStopType.RIGHT, position: 9638 }],
      spacing: { after: 200 },
    }),
  )

  body.push(
    P(
      `**${ourName}**, РНОКПП ${v(us.taxId, '__________')}, запис в ЄДР ${v(us.edrRecord, 'від __.__.____ № __________')}, ${v(us.taxGroup, 'платник єдиного податку _ групи, не платник ПДВ')} (далі — **Виконавець**), з однієї сторони, та`,
    ),
  )
  body.push(
    P(
      `**${v(c.clientName, 'Найменування / ПІБ ФОП Замовника')}**, код ЄДРПОУ / РНОКПП ${v(c.clientTaxId, '__________')}, в особі ${v(c.signerInPerson, 'посада, ПІБ у родовому відмінку')}, що діє на підставі ${v(c.signerBasis, 'Статуту / виписки з ЄДР')} (далі — **Замовник**), з другої сторони,`,
    ),
  )
  body.push(P('разом — Сторони, уклали цей Договір про таке:'))

  body.push(H('1. ТЕРМІНИ'))
  body.push(C('1.1.', '**Сервіс** — програмне забезпечення TrackBox24 для обліку посилок, переїздів і рейсів перевізника: веб-кабінет на trackbox24.com, мобільний застосунок TrackBox24 та програмний інтерфейс.'))
  body.push(C('1.2.', '**Обліковий запис компанії** — запис Замовника в Сервісі, через який його Користувачі отримують доступ.'))
  body.push(C('1.3.', '**Користувач** — особа, якій Замовник надав доступ до Сервісу: менеджер, представник, водій, переглядач.'))
  body.push(C('1.4.', '**Модулі** — додаткові функції Сервісу, які вмикаються для Замовника за окрему плату згідно з Тарифом (Додаток № 1).'))
  body.push(C('1.5.', '**Дані Замовника** — усе, що Замовник і його Користувачі вносять у Сервіс або що Сервіс отримує для них: посилки, клієнти, відправники, рейси, оплати, фото, дані від Нової Пошти.'))
  body.push(C('1.6.', '**Розрахунковий період** — календарний місяць.'))

  body.push(H('2. ПРЕДМЕТ ДОГОВОРУ'))
  body.push(C('2.1.', 'Виконавець надає Замовнику послуги доступу до Сервісу через мережу Інтернет (далі — Послуги), а Замовник приймає та оплачує їх на умовах цього Договору.'))
  body.push(C('2.2.', 'Послуги полягають у наданні Користувачам Замовника можливості працювати з Сервісом у межах обраного тарифу та Модулів. Програмне забезпечення, його примірники чи вихідний код Замовнику не передаються.'))
  body.push(C('2.3.', 'Склад тарифу, Модулі та їх вартість визначено в Додатку № 1. Порядок користування Сервісом, не врегульований цим Договором, визначають Умови використання, опубліковані на trackbox24.com/terms, у редакції на дату надання Послуг. У разі розбіжностей діє цей Договір.'))

  body.push(H('3. ТЕСТОВИЙ ПЕРІОД І ПОЧАТОК НАДАННЯ ПОСЛУГ'))
  body.push(C('3.1.', 'Виконавець створює Обліковий запис компанії та перший обліковий запис менеджера Замовника протягом 1 робочого дня після підписання Договору.'))
  if (c.trialDays > 0) {
    body.push(C('3.2.', `Перші ${days(c.trialDays)} календарних днів від створення Облікового запису компанії Послуги надаються безоплатно (тестовий період). Сторони можуть погодити інший строк тестового періоду в листуванні.`))
    body.push(C('3.3.', 'Платне надання Послуг починається з дня, наступного за останнім днем тестового періоду.'))
  } else {
    body.push(C('3.2.', 'Платне надання Послуг починається з дня створення Облікового запису компанії.'))
  }

  body.push(H('4. ВАРТІСТЬ ПОСЛУГ І ПОРЯДОК РОЗРАХУНКІВ'))
  body.push(C('4.1.', 'Вартість Послуг за Розрахунковий період складається з вартості базового тарифу та ввімкнених Модулів згідно з Додатком № 1 і визначається в еквіваленті євро (EUR).'))
  body.push(C('4.2.', 'Оплата здійснюється в гривнях. Сума до сплати визначається як гривневий еквівалент вартості в євро за курсом продажу євро АТ «Універсал Банк» (monobank), що діє на момент виставлення рахунку. Курс і суму в гривнях Виконавець зазначає в рахунку. Сплачена сума в гривнях подальшому перерахунку не підлягає.'))
  body.push(C('4.3.', c.trialDays > 0
    ? 'Послуги оплачуються наперед. Рахунок за поточний Розрахунковий період Виконавець виставляє на початку місяця, а за перший платний місяць — після закінчення тестового періоду, за дні, що лишились до кінця місяця.'
    : 'Послуги оплачуються наперед. Рахунок за поточний Розрахунковий період Виконавець виставляє на початку місяця, а за перший місяць — за дні, що лишились до його кінця.'))
  body.push(C('4.4.', `Замовник оплачує рахунок протягом ${days(c.paymentDays)} календарних днів від дня його надіслання на електронну пошту Замовника, зазначену в розділі 14.`))
  body.push(C('4.5.', 'Вартість за неповний місяць, а також Модулі, увімкнені чи вимкнені протягом місяця, розраховуються пропорційно календарним дням користування. Різниця за попередній місяць (доплата або зменшення) включається в наступний рахунок.'))
  body.push(C('4.6.', 'Датою оплати є дата зарахування коштів на поточний рахунок Виконавця. Банківські комісії за переказ сплачує Замовник.'))
  body.push(C('4.7.', `Виконавець може змінити ціни Додатка № 1, повідомивши Замовника не пізніше ніж за ${days(c.priceNoticeDays)} календарних днів. Нові ціни застосовуються до рахунків, виставлених після цього строку. Якщо Замовник не згоден, він може розірвати Договір згідно з п. 11.2.`))
  body.push(C('4.8.', 'Виконавець не є платником ПДВ.'))

  body.push(H('5. ПРИЙМАННЯ ПОСЛУГ'))
  body.push(C('5.1.', 'Послуги вважаються наданими належним чином в останній день Розрахункового періоду, якщо протягом 5 робочих днів після його закінчення Замовник не надіслав Виконавцю письмових вмотивованих зауважень.'))
  body.push(C('5.2.', 'На вимогу будь-якої Сторони складається акт приймання-передачі наданих послуг за один або кілька Розрахункових періодів, у тому числі в електронній формі з накладенням кваліфікованих електронних підписів (КЕП).'))

  body.push(H('6. ПРАВА ТА ОБОВ’ЯЗКИ СТОРІН'))
  body.push(C('6.1.', '**Виконавець зобов’язується:**'))
  body.push(Sub('а) забезпечити доступ до Сервісу в межах тарифу та Модулів, обраних Замовником;'))
  body.push(Sub('б) створювати резервні копії бази даних щодня;'))
  body.push(Sub('в) надавати підтримку в робочі дні за контактами, зазначеними в розділі 14;'))
  body.push(Sub('г) повідомляти Замовника заздалегідь про планові роботи та суттєві зміни Сервісу, що впливають на його роботу;'))
  body.push(Sub('ґ) обробляти Дані Замовника лише для надання Послуг відповідно до розділу 8.'))
  body.push(C('6.2.', '**Виконавець має право:** вдосконалювати та змінювати Сервіс, не погіршуючи суттєво функції, за які сплачено; проводити планові роботи переважно в нічний час; призупинити доступ у випадках, передбачених розділом 7.'))
  body.push(C('6.3.', '**Замовник зобов’язується:**'))
  body.push(Sub('а) своєчасно оплачувати Послуги;'))
  body.push(Sub('б) використовувати Сервіс лише для власної логістичної діяльності, не передавати доступ третім особам і не надавати з його допомогою послуги іншим компаніям без згоди Виконавця;'))
  body.push(Sub('в) забезпечити, щоб Користувачі зберігали паролі в таємниці, та негайно повідомляти Виконавця про втрату чи компрометацію доступу;'))
  body.push(Sub('г) не втручатися в роботу Сервісу, не обходити обмеження, не копіювати, не декомпілювати й не відтворювати Сервіс;'))
  body.push(Sub('ґ) вносити в Сервіс лише дані, на обробку яких Замовник має законну підставу;'))
  body.push(Sub('д) самостійно отримати ключ API Нової Пошти та дотримуватися умов Нової Пошти щодо нього.'))
  body.push(C('6.4.', '**Замовник має право:** створювати Користувачів і призначати їм ролі; вмикати й вимикати Модулі, повідомивши Виконавця; вивантажувати Дані Замовника з Сервісу в будь-який момент; отримувати підтримку.'))

  body.push(H('7. ПРИЗУПИНЕННЯ ДОСТУПУ'))
  body.push(C('7.1.', `Якщо оплату прострочено більш як на ${days(c.suspendAfterDays)} календарних днів після строку з п. 4.4, Виконавець може призупинити доступ Користувачів Замовника до Сервісу. Дані Замовника при цьому зберігаються.`))
  body.push(C('7.2.', 'Доступ відновлюється протягом одного робочого дня після зарахування оплати заборгованості.'))
  body.push(C('7.3.', 'Виконавець може негайно призупинити доступ у разі суттєвого порушення Замовником п. 6.3 або загрози безпеці Сервісу, повідомивши Замовника про причину.'))

  body.push(H('8. ДАНІ ЗАМОВНИКА І ПЕРСОНАЛЬНІ ДАНІ'))
  body.push(C('8.1.', 'Дані Замовника належать Замовнику. Щодо персональних даних у Даних Замовника Замовник є володільцем, а Виконавець — розпорядником, який обробляє їх лише за дорученням Замовника для надання Послуг.'))
  body.push(C('8.2.', 'Умови обробки персональних даних визначає Угода про обробку даних, опублікована на trackbox24.com/dpa, яка є невід’ємною частиною цього Договору (Додаток № 2).'))
  body.push(C('8.3.', 'Фото посилок зі статусом «видано клієнту» видаляються автоматично через 14 днів після видачі.'))
  body.push(C('8.4.', 'Після припинення Договору Дані Замовника зберігаються 90 календарних днів на випадок відновлення доступу, після чого видаляються. На письмовий запит Замовника Виконавець видаляє їх раніше. Протягом цього строку Замовник може отримати вивантаження своїх даних.'))

  body.push(H('9. ВІДПОВІДАЛЬНІСТЬ СТОРІН'))
  body.push(C('9.1.', 'За порушення Договору Сторони відповідають згідно із законодавством України та цим Договором.'))
  body.push(C('9.2.', 'Сервіс надається «як є». Виконавець прагне цілодобової доступності Сервісу, але не гарантує безперервної роботи: можливі планові роботи та збої.'))
  body.push(C('9.3.', 'Виконавець не відповідає за втрату чи пошкодження посилок, дії Нової Пошти та інших третіх осіб, рішення Замовника, ухвалені на підставі даних Сервісу, а також за збитки через недоступність інтернету чи обладнання Замовника.'))
  body.push(C('9.4.', 'Сукупна відповідальність Виконавця за цим Договором обмежується сумою, сплаченою Замовником за останні три Розрахункові періоди, що передували події, яка стала підставою для вимоги.'))
  body.push(C('9.5.', 'Сторона, що не може виконати зобов’язання через обставини непереборної сили (форс-мажор), у тому числі воєнний стан, бойові дії, тривалі відключення електроенергії чи зв’язку, звільняється від відповідальності на час їх дії. Вона повідомляє іншу Сторону протягом 5 робочих днів від їх настання. Підтвердженням є сертифікат Торгово-промислової палати України або інший документ, передбачений законодавством.'))

  body.push(H('10. ІНТЕЛЕКТУАЛЬНА ВЛАСНІСТЬ І КОНФІДЕНЦІЙНІСТЬ'))
  body.push(C('10.1.', 'Сервіс, його програмний код, дизайн і назва TrackBox24 належать Виконавцю. За цим Договором права інтелектуальної власності на Сервіс Замовнику не передаються.'))
  body.push(C('10.2.', 'Найменування, логотипи та Дані Замовника залишаються власністю Замовника. Виконавець може згадувати Замовника як клієнта лише з його письмової згоди.'))
  body.push(C('10.3.', 'Сторони зберігають конфіденційність умов цього Договору та інформації, отриманої одна від одної під час його виконання, крім випадків, коли розкриття вимагає закон.'))

  body.push(H('11. СТРОК ДІЇ ТА ПРИПИНЕННЯ ДОГОВОРУ'))
  body.push(C('11.1.', `Договір набирає чинності з дня підписання і діє до 31 грудня ${v(c.validUntilYear, '20__')} року. Якщо жодна Сторона за 30 календарних днів до закінчення строку не повідомила про припинення, Договір продовжується на кожен наступний календарний рік на тих самих умовах.`))
  body.push(C('11.2.', `Кожна Сторона може розірвати Договір, письмово повідомивши іншу не пізніше ніж за ${days(c.terminationDays)} календарних днів.`))
  body.push(C('11.3.', 'Виконавець може розірвати Договір негайно в разі суттєвого порушення Замовником п. 6.3 або прострочення оплати понад 60 календарних днів.'))
  body.push(C('11.4.', 'Кошти за оплачений Розрахунковий період у разі розірвання Договору з ініціативи Замовника не повертаються. У разі розірвання з ініціативи Виконавця (крім п. 11.3) Виконавець повертає оплату за невикористані дні.'))
  body.push(C('11.5.', 'Припинення Договору не звільняє Замовника від оплати Послуг, наданих до дня припинення.'))

  body.push(H('12. ПОВІДОМЛЕННЯ ТА ЕЛЕКТРОННИЙ ДОКУМЕНТООБІГ'))
  body.push(C('12.1.', 'Рахунки, повідомлення та листування Сторони надсилають на електронні адреси, зазначені в розділі 14. Повідомлення вважається отриманим наступного робочого дня після надсилання.'))
  body.push(C('12.2.', 'Договір, додатки, додаткові угоди та акти можуть бути підписані КЕП. Документи, підписані КЕП, мають таку саму юридичну силу, як підписані власноручно. Скановані копії підписаних документів мають силу до обміну оригіналами.'))
  body.push(C('12.3.', 'Про зміну реквізитів чи контактів Сторона повідомляє іншу протягом 5 робочих днів.'))

  body.push(H('13. ПРИКІНЦЕВІ ПОЛОЖЕННЯ'))
  body.push(C('13.1.', 'До Договору застосовується законодавство України. Спори Сторони вирішують переговорами, а в разі недосягнення згоди — у суді згідно із законодавством України.'))
  body.push(C('13.2.', 'Зміни до Договору оформлюються додатковими угодами, крім змін цін згідно з п. 4.7 та вмикання чи вимикання Модулів згідно з п. 6.4.'))
  body.push(C('13.3.', 'Договір складено українською мовою у двох примірниках однакової юридичної сили, по одному для кожної Сторони, або в електронній формі.'))
  body.push(C('13.4.', 'Невід’ємні частини Договору: Додаток № 1 «Тариф і Модулі», Додаток № 2 «Угода про обробку даних» (trackbox24.com/dpa).'))

  body.push(H('14. РЕКВІЗИТИ ТА ПІДПИСИ СТОРІН'))
  const W = 4819
  body.push(
    new Table({
      width: { size: W * 2, type: WidthType.DXA },
      columnWidths: [W, W],
      rows: [
        new TableRow({ cantSplit: true, children: [cell('**ВИКОНАВЕЦЬ**', W, { borders: noBorders, keep: true }), cell('**ЗАМОВНИК**', W, { borders: noBorders, keep: true })] }),
        new TableRow({
          children: [
            cell(
              [
                ourName,
                `РНОКПП ${v(us.taxId, '__________')}`,
                `Адреса: ${v(us.address, '__________________')}`,
                `IBAN ${v(us.iban, 'UA__________________________')}`,
                `Банк: ${v(us.bank, '__________________')}`,
                v(us.taxGroup, 'Платник єдиного податку _ групи, не платник ПДВ'),
                `Email: ${v(us.email, '__________')}`,
                `Тел.: ${v(us.phone, '__________')}`,
              ],
              W,
              { borders: noBorders, keep: true },
            ),
            cell(
              [
                v(c.clientName, 'Найменування'),
                `Код ЄДРПОУ / РНОКПП ${v(c.clientTaxId, '__________')}`,
                `Адреса: ${v(c.clientAddress, '__________________')}`,
                `IBAN ${v(c.clientIban, 'UA__________________________')}`,
                `Банк: ${v(c.clientBank, '__________________')}`,
                v(c.clientTaxStatus, 'Платник ПДВ / не платник ПДВ'),
                `Email для рахунків: ${v(c.clientEmail, '__________')}`,
                `Тел.: ${v(c.clientPhone, '__________')}`,
              ],
              W,
              { borders: noBorders, keep: true },
            ),
          ],
        }),
        new TableRow({
          children: [
            cell(['', `_______________ / ${ourSigner}`], W, { borders: noBorders, keep: true }),
            cell(['', `_______________ / ${clientSigner}`, `${v(c.signerPosition, 'посада')}           М. П. (за наявності)`], W, { borders: noBorders, keep: true }),
          ],
        }),
      ],
    }),
  )

  // ----- Annex 1: the company's prices and what it has on
  const annex: (Paragraph | Table)[] = []
  annex.push(new Paragraph({ children: [new PageBreak()] }))
  annex.push(P('Додаток № 1', { align: AlignmentType.RIGHT, after: 0 }))
  annex.push(P(`до Договору № ${no} від ${date}`, { align: AlignmentType.RIGHT, after: 200 }))
  annex.push(H('ТАРИФ І МОДУЛІ'))
  annex.push(P('1. Вартість Послуг за повний календарний місяць, в еквіваленті євро. Оплата — у гривнях згідно з п. 4.2 Договору. У графі «Ціна для Замовника» — ціна, погоджена Сторонами; позначено модулі, обрані Замовником.'))
  const cols = [600, 4638, 1700, 1700, 1000]
  const header = ['№', 'Позиція', 'Ціна, EUR / міс.', 'Ціна для Замовника, EUR / міс.', 'Обрано']
  const label = (p: CompanyPriceResponse) =>
    p.code === 'BASE' ? 'Базовий тариф: веб-кабінет, мобільний застосунок, користувачі, склади, рейси, історія дій' : `Модуль «${p.label}»`
  annex.push(
    new Table({
      width: { size: cols.reduce((a, b) => a + b, 0), type: WidthType.DXA },
      columnWidths: cols,
      rows: [
        new TableRow({
          tableHeader: true,
          children: header.map((h, i) => cell(`**${h}**`, cols[i], { shade: 'EDEDED', align: i >= 2 ? AlignmentType.CENTER : AlignmentType.LEFT })),
        }),
        ...prices.map(
          (p, n) =>
            new TableRow({
              children: [
                cell(String(n + 1), cols[0], { align: AlignmentType.CENTER }),
                cell(label(p), cols[1]),
                cell(money(p.generalEur), cols[2], { align: AlignmentType.CENTER }),
                cell(p.enabled ? `**${money(p.amountEur)}**` : '', cols[3], { align: AlignmentType.CENTER }),
                cell(p.enabled ? 'так' : '—', cols[4], { align: AlignmentType.CENTER }),
              ],
            }),
        ),
      ],
    }),
  )
  const total = prices.filter((p) => p.enabled).reduce((s, p) => s + (p.amountEur ?? 0), 0)
  annex.push(P('', { after: 60 }))
  annex.push(P(`2. Разом за повний місяць для Замовника: **${money(total)} EUR** (в еквіваленті).`))
  annex.push(P('3. Базовий тариф діє завжди. Потрібно ввімкнути щонайменше один із модулів «Посилки» або «Переїзди».'))
  annex.push(P('4. Модулі вмикаються й вимикаються на запит Замовника електронною поштою або через менеджера Виконавця. Вартість за місяць, у якому модуль було ввімкнено чи вимкнено, розраховується пропорційно дням (п. 4.5 Договору).'))
  annex.push(P(c.trialDays > 0 ? `5. Тестовий період: ${days(c.trialDays)} календарних днів безоплатно (п. 3.2 Договору).` : '5. Без тестового періоду.'))
  annex.push(P('', { after: 200 }))
  annex.push(
    new Table({
      width: { size: W * 2, type: WidthType.DXA },
      columnWidths: [W, W],
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            cell(['**ВИКОНАВЕЦЬ**', '', `_______________ / ${ourSigner}`], W, { borders: noBorders }),
            cell(['**ЗАМОВНИК**', '', `_______________ / ${clientSigner}`], W, { borders: noBorders }),
          ],
        }),
      ],
    }),
  )

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1418, right: 850 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Виконавець ________     Замовник ________          стор. ', font: FONT, size: 18, color: '666666' }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: '666666' }),
                ],
              }),
            ],
          }),
        },
        children: [...body, ...annex],
      },
    ],
  })
  return Packer.toBlob(doc)
}
