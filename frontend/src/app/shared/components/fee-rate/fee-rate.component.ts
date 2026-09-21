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
  // in bytes. Rates under 1 sat/b are re-scaled to sat/kb instead of relying
  // on ever-smaller decimals.
  get displayRate(): { value: number; unit: 'b' | 'kb' } {
    if (this.fee === undefined) {
      return null;
    }
    const perByte = this.fee / (this.weight / 4);
    if (perByte > 0 && perByte < 1) {
      return { value: perByte * 1000, unit: 'kb' };
    }
    return { value: perByte, unit: 'b' };
  }
}
