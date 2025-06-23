import { Component, Input } from '@angular/core';
import { AddressMatch, AddressTypeInfo } from '@app/shared/address-utils';

@Component({
  selector: 'app-address-text',
  templateUrl: './address-text.component.html',
  styleUrls: ['./address-text.component.scss'],
})
export class AddressTextComponent {
  @Input() address: string;
  @Input() info: AddressTypeInfo | null;
  @Input() similarity: {
    score: number;
    match: AddressMatch;
    group: number;
  } | null;

  isContract(): boolean {
    if (!this.address) {
      return false;
    }

    if (this.address.length !== 64) {
      return false;
    }

    const hexRegex = /^[0-9a-fA-F]{64}$/;
    return hexRegex.test(this.address);
  }

  groupColors: string[] = [
    'var(--primary)',
    'var(--success)',
    'var(--info)',
    'white',
  ];
}
