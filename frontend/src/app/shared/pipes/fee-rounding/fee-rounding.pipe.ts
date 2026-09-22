import { formatNumber } from "@angular/common";
import { Inject, LOCALE_ID, Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "feeRounding",
})
export class FeeRoundingPipe implements PipeTransform {
  constructor(
    @Inject(LOCALE_ID) private locale: string,
  ) {}

  transform(fee: number, rounding = null): string {
    // Very small fee rates (< 0.01 sat/vB) always need extra precision, even
    // when a caller passes a fixed-width `rounding` (e.g. "1.0-0", used by
    // several components) — otherwise they get rounded down to "0".
    if (fee > 0 && fee < 0.01) {
      return formatNumber(fee, this.locale, '1.1-5');
    }

    if (rounding) {
      return formatNumber(fee, this.locale, rounding);
    }

    if (fee >= 100) {
      return formatNumber(fee, this.locale, '1.0-0')
    } else if (fee < 10) {
      return formatNumber(fee, this.locale, '1.2-2')
    }
    return formatNumber(fee, this.locale, '1.1-1')
  }
}
