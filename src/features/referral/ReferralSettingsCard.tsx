import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { showApiError } from "@/lib/api/problem";
import type { Currency, ReferralSettings } from "@/lib/api/types";
import { CURRENCY_SYMBOL, formatMoney, MONEY_ORDER } from "@/lib/format";
import { useReferralSettings, useSaveReferralSettings } from "./queries";

type Form = Record<keyof ReferralSettings, string>;

const FIELDS: (keyof ReferralSettings)[] = [
  "currency",
  "pointValue",
  "discountType",
  "discountValue",
  "discountParcels",
  "discountMinPrice",
  "referrerPoints",
  "referrerParcels",
  "ownPointsType",
  "ownPointsValue",
  "maxRedeemPercent",
  "minRedeemPoints",
  "expiryMonths",
  "clientTypes",
];

// the backend leaves empty rules out of its answer: every field still gets a value in the form
const toForm = (s: ReferralSettings): Form =>
  Object.fromEntries(
    FIELDS.map((k) => [k, s[k] == null ? "" : String(s[k])]),
  ) as Form;

const num = (s?: string) =>
  s == null || s.trim() === "" ? undefined : Number(s.replace(",", "."));

/**
 * The company's own referral program rules, on its page under the modules: what a point is worth, the discount for a
 * client someone recommended, the points to whoever recommended them and for one's own parcels, how they are spent.
 */
export function ReferralSettingsCard({ onSaved }: { onSaved?: () => void }) {
  const { t } = useTranslation(["companies", "common"]);
  const query = useReferralSettings();
  const save = useSaveReferralSettings();
  const [f, setF] = useState<Form>();
  useEffect(() => {
    if (query.data) setF(toForm(query.data));
  }, [query.data]);

  if (!f) return <Skeleton className="h-64 w-full" />;
  const set = (k: keyof Form) => (v: string) => setF({ ...f, [k]: v });
  const on = (k: "discountType" | "ownPointsType" | "referrerPoints") =>
    f[k] !== "";
  const sym = CURRENCY_SYMBOL[f.currency as Currency];

  const submit = async () => {
    try {
      await save.mutateAsync({
        currency: f.currency as Currency,
        pointValue: num(f.pointValue)!,
        discountType: (f.discountType ||
          undefined) as ReferralSettings["discountType"],
        discountValue: num(f.discountValue),
        discountParcels: num(f.discountParcels),
        discountMinPrice: num(f.discountMinPrice),
        referrerPoints: num(f.referrerPoints),
        referrerParcels: num(f.referrerParcels),
        ownPointsType: (f.ownPointsType ||
          undefined) as ReferralSettings["ownPointsType"],
        ownPointsValue: num(f.ownPointsValue),
        maxRedeemPercent: num(f.maxRedeemPercent) ?? 50,
        minRedeemPoints: num(f.minRedeemPoints) ?? 0,
        expiryMonths: num(f.expiryMonths),
        clientTypes: f.clientTypes as ReferralSettings["clientTypes"],
      });
      toast.success(t("common:common.saved"));
      onSaved?.();
    } catch (e) {
      showApiError(e);
    }
  };

  // what a 30-unit parcel of a referred client would come to, as the rules say now
  const price = 30;
  const point = num(f.pointValue) ?? 0;
  const discount = !on("discountType")
    ? 0
    : f.discountType === "PERCENT"
      ? (price * (num(f.discountValue) ?? 0)) / 100
      : (num(f.discountValue) ?? 0);
  const due = Math.max(0, price - discount);
  const own =
    !on("ownPointsType") || point <= 0
      ? 0
      : f.ownPointsType === "FIXED"
        ? (num(f.ownPointsValue) ?? 0)
        : Math.floor((due * (num(f.ownPointsValue) ?? 0)) / 100 / point);

  const switchRow = (
    label: string,
    hint: string,
    checked: boolean,
    onChange: (c: boolean) => void,
    children: React.ReactNode,
  ) => (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          aria-label={label}
        />
      </div>
      {checked && (
        <div className="flex flex-wrap items-end gap-3">{children}</div>
      )}
    </div>
  );
  const small = "w-28";

  return (
    <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-auto">
            <FieldLabel htmlFor="rf-point">
              {t("companies:referral.pointValue")}
            </FieldLabel>
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">
                1 {t("companies:referral.point")} =
              </span>
              <Input
                id="rf-point"
                inputMode="decimal"
                className="w-24"
                value={f.pointValue}
                onChange={(e) => set("pointValue")(e.target.value)}
              />
              <Select
                value={f.currency}
                onValueChange={(v) => v && set("currency")(String(v))}
              >
                <SelectTrigger
                  className="w-20"
                  aria-label={t("companies:referral.currency")}
                >
                  <SelectValue>{sym}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MONEY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CURRENCY_SYMBOL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Field>
          <Field className="w-auto">
            <FieldLabel>{t("companies:referral.clientTypes")}</FieldLabel>
            <Select
              value={f.clientTypes}
              onValueChange={(v) => v && set("clientTypes")(String(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue>
                  {t(`companies:referral.types.${f.clientTypes}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {["ALL", "PRIVATE_PERSON", "ORGANIZATION"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`companies:referral.types.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {switchRow(
            t("companies:referral.discount"),
            t("companies:referral.discountHint"),
            on("discountType"),
            (c) =>
              setF({
                ...f,
                discountType: c ? "PERCENT" : "",
                discountValue: c ? f.discountValue || "10" : "",
              }),
            <>
              <Input
                inputMode="decimal"
                className={small}
                aria-label={t("companies:referral.discount")}
                value={f.discountValue}
                onChange={(e) => set("discountValue")(e.target.value)}
              />
              <Select
                value={f.discountType}
                onValueChange={(v) => v && set("discountType")(String(v))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue>
                    {f.discountType === "FIXED" ? sym : "%"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">%</SelectItem>
                  <SelectItem value="FIXED">{sym}</SelectItem>
                </SelectContent>
              </Select>
              <Field className="w-auto">
                <FieldLabel className="text-xs">
                  {t("companies:referral.firstParcels")}
                </FieldLabel>
                <Input
                  inputMode="numeric"
                  className={small}
                  placeholder={t("companies:referral.every")}
                  value={f.discountParcels}
                  onChange={(e) => set("discountParcels")(e.target.value)}
                />
              </Field>
              <Field className="w-auto">
                <FieldLabel className="text-xs">
                  {t("companies:referral.minPrice", { sym })}
                </FieldLabel>
                <Input
                  inputMode="decimal"
                  className={small}
                  value={f.discountMinPrice}
                  onChange={(e) => set("discountMinPrice")(e.target.value)}
                />
              </Field>
            </>,
          )}
          {switchRow(
            t("companies:referral.referrer"),
            t("companies:referral.referrerHint"),
            on("referrerPoints"),
            (c) =>
              setF({ ...f, referrerPoints: c ? f.referrerPoints || "50" : "" }),
            <>
              <Field className="w-auto">
                <FieldLabel className="text-xs">
                  {t("companies:referral.pointsPerParcel")}
                </FieldLabel>
                <Input
                  inputMode="numeric"
                  className={small}
                  value={f.referrerPoints}
                  onChange={(e) => set("referrerPoints")(e.target.value)}
                />
              </Field>
              <Field className="w-auto">
                <FieldLabel className="text-xs">
                  {t("companies:referral.firstParcels")}
                </FieldLabel>
                <Input
                  inputMode="numeric"
                  className={small}
                  placeholder={t("companies:referral.every")}
                  value={f.referrerParcels}
                  onChange={(e) => set("referrerParcels")(e.target.value)}
                />
              </Field>
            </>,
          )}
          {switchRow(
            t("companies:referral.own"),
            t("companies:referral.ownHint"),
            on("ownPointsType"),
            (c) =>
              setF({
                ...f,
                ownPointsType: c ? "PERCENT" : "",
                ownPointsValue: c ? f.ownPointsValue || "5" : "",
              }),
            <>
              <Input
                inputMode="decimal"
                className={small}
                aria-label={t("companies:referral.own")}
                value={f.ownPointsValue}
                onChange={(e) => set("ownPointsValue")(e.target.value)}
              />
              <Select
                value={f.ownPointsType}
                onValueChange={(v) => v && set("ownPointsType")(String(v))}
              >
                <SelectTrigger className="w-44">
                  <SelectValue>
                    {t(
                      `companies:referral.ownType.${f.ownPointsType || "PERCENT"}`,
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">
                    {t("companies:referral.ownType.PERCENT")}
                  </SelectItem>
                  <SelectItem value="FIXED">
                    {t("companies:referral.ownType.FIXED")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </>,
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-auto">
            <FieldLabel htmlFor="rf-max">
              {t("companies:referral.maxRedeem")}
            </FieldLabel>
            <Input
              id="rf-max"
              inputMode="numeric"
              className={small}
              value={f.maxRedeemPercent}
              onChange={(e) => set("maxRedeemPercent")(e.target.value)}
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel htmlFor="rf-min">
              {t("companies:referral.minRedeem")}
            </FieldLabel>
            <Input
              id="rf-min"
              inputMode="numeric"
              className={small}
              value={f.minRedeemPoints}
              onChange={(e) => set("minRedeemPoints")(e.target.value)}
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel htmlFor="rf-exp">
              {t("companies:referral.expiry")}
            </FieldLabel>
            <Input
              id="rf-exp"
              inputMode="numeric"
              className={small}
              placeholder={t("companies:referral.never")}
              value={f.expiryMonths}
              onChange={(e) => set("expiryMonths")(e.target.value)}
            />
          </Field>
        </div>

        <FieldDescription>
          {t("companies:referral.example", {
            price: formatMoney(price, f.currency as Currency),
            discount: formatMoney(
              Math.round(discount * 100) / 100,
              f.currency as Currency,
            ),
            due: formatMoney(
              Math.round(due * 100) / 100,
              f.currency as Currency,
            ),
            own,
            referrer: num(f.referrerPoints) ?? 0,
          })}
        </FieldDescription>
        <div>
          <Button onClick={submit} disabled={save.isPending}>
            {t("common:actions.save")}
          </Button>
        </div>
    </div>
  );
}
