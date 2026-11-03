import { Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientResponse } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClientPoints } from "./queries";

/** A client's points («Реферальна програма»): the balance and every change, newest first. */
export function ClientPointsCard({ client }: { client: ClientResponse }) {
  const { t } = useTranslation("clients");
  const history = useClientPoints(client.id!);
  const entries = history.data?.content ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="size-5 text-rose-600" />
          {t("points.title")}
        </CardTitle>
        <CardDescription>
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {client.points ?? 0}
          </span>{" "}
          {t("points.balance")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("points.empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0">
                  <span className="font-medium">{e.kindLabel}</span>
                  {e.parcelBarcode && e.parcelId != null && (
                    <>
                      {" · "}
                      <Link
                        to={`/parcels/${e.parcelId}`}
                        className="font-mono underline underline-offset-4"
                      >
                        {e.parcelBarcode}
                      </Link>
                    </>
                  )}
                  {e.note && (
                    <span className="text-muted-foreground"> · {e.note}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {formatDateTime(e.createdAt)}
                    {e.by && ` · ${e.by}`}
                    {e.expiresAt &&
                      ` · ${t("points.expires", { date: formatDate(e.expiresAt) })}`}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    (e.points ?? 0) > 0
                      ? "text-emerald-700"
                      : "text-muted-foreground",
                  )}
                >
                  {(e.points ?? 0) > 0 ? "+" : ""}
                  {e.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
