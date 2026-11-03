import { Undo2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { showApiError } from "@/lib/api/problem";
import { useSetDiscountOff } from "./queries";

/** A manager takes the referral discount off a parcel (or puts it back) before it is paid. */
export function DiscountOffButton({
  parcelId,
  off,
}: {
  parcelId: number;
  off: boolean;
}) {
  const { t } = useTranslation(["parcels", "common"]);
  const set = useSetDiscountOff(parcelId);
  return (
    <Button
      size="xs"
      variant="ghost"
      disabled={set.isPending}
      onClick={() =>
        set
          .mutateAsync(off)
          .then(() => toast.success(t("common:common.saved")))
          .catch(showApiError)
      }
    >
      {off ? <X /> : <Undo2 />}
      {t(off ? "parcels:payment.discountOff" : "parcels:payment.discountBack")}
    </Button>
  );
}
