import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { StateService } from '@app/services/state.service';

@Component({
  selector: 'app-fee-rate',
  templateUrl: './fee-rate.component.html',
  styleUrls: ['./fee-rate.component.scss']
})
export class FeeRateComponent implements OnInit {
  @Input() fee: number | undefined;
  @Input() weight: number = 4;
  @Input() rounding: string = null;
  @Input() showUnit: boolean = true;
  @Input() unitClass: string = 'symbol';
  @Input() unitStyle: any;

  rateUnits$: Observable<string>;

  constructor(
    private stateService: StateService,
  ) { }

  ngOnInit() {
    this.rateUnits$ = this.stateService.rateUnits$;
  }

  // OPCAT has no virtual bytes, so `weight / 4` is just the transaction size
  // in bytes. Rates under 1 sat/b are re-scaled to sat/kB instead of relying
  // on ever-smaller decimals. "kB" (not "kb") matches the byte-size unit
  // used elsewhere (e.g. transaction/block Size rows). A literal 0 also
  // renders as sat/kB (not sat/b) so the page doesn't mix units between a
  // truly-zero rate and a tiny-but-nonzero one sitting right next to it.
  get displayRate(): { value: number; unit: 'b' | 'kB' } {
    if (this.fee === undefined) {
      return null;
    }
    const perByte = this.fee / (this.weight / 4);
    if (perByte < 1) {
      return { value: perByte * 1000, unit: 'kB' };
    }
    return { value: perByte, unit: 'b' };
  }
}
