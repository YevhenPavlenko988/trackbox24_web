import { Gift } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api/client";
import { isApiError, unwrap } from "@/lib/api/problem";
import type { PublicPointsResponse } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

/**
 * «Мої бали» on the tracking page: the parcel's client types their phone and sees only their
 * balance. The number on the label is not enough — a few wrong phones and the backend asks to wait.
 */
export function PointsCheck({ code }: { code: string }) {
  const { t } = useTranslation("tracking");
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<PublicPointsResponse>();

  const check = async () => {
    setBusy(true);
    setError(undefined);
    try {
      setResult(
        await unwrap<PublicPointsResponse>(
          api.POST("/api/public/tracking/{code}/points", {
            params: { path: { code } },
            body: { phone },
          }),
        ),
      );
    } catch (e) {
      setError(isApiError(e) ? (e.detail ?? e.title) : t("points.error"));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div
        className="mt-5 flex items-center gap-3 rounded-xl bg-brand/10 p-4"
        role="status"
      >
        <Gift className="size-6 shrink-0 text-brand" />
        <p>
          {t('points.yours')}:{" "}
          <span className="text-xl font-bold tabular-nums">
            {result.points}
          </span>{" "}
          {t("points.unit")}
          {result.value != null && result.currency && (
            <span className="text-navy/60">
              {" "}
              ≈ {formatMoney(result.value, result.currency)}
            </span>
          )}
        </p>
      </div>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex items-center gap-2 font-semibold text-brand hover:underline"
      >
        <Gift className="size-5" />
        {t("points.open")}
      </button>
    );
  }
  return (
    <form
      className="mt-5 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void check();
      }}
    >
      <label htmlFor="points-phone" className="text-sm font-medium">
        {t("points.phoneLabel")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="points-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+380 50 123 45 67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-11 flex-1 rounded-xl border border-navy/15 bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        <button
          type="submit"
          disabled={busy || phone.trim().length < 9}
          className="h-11 rounded-xl bg-navy px-5 font-semibold text-white disabled:opacity-50"
        >
          {t("points.show")}
        </button>
      </div>
      <p className="text-sm text-navy/55">{t("points.hint")}</p>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
    </form>
  );
}
