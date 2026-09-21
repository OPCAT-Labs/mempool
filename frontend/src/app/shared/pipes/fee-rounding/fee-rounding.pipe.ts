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
    // Fixed-width rounding (whether from a caller-supplied `rounding` or the
    // defaults below) would print "0" for tiny non-zero fee rates (e.g. this
    // chain's ~0.001 sat/vB fees). Scale up precision so those still show a
    // positive number instead of rounding down to zero.
    if (fee > 0 && fee < 1) {
      const decimals = Math.max(2, Math.ceil(-Math.log10(fee)) + 1);
      return formatNumber(fee, this.locale, `1.${decimals}-${decimals}`);
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
