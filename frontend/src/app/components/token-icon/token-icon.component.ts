import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-token-icon',
  templateUrl: './token-icon.component.html',
  styleUrls: ['./token-icon.component.scss']
})
export class TokenIconComponent implements OnInit {
  @Input() tokenId: string;
  @Input() symbol: string;
  @Input() name: string;
  @Input() size: number = 32; // Default size in pixels
  @Input() className: string = '';

  imageUrl: string;
  showFallback: boolean = false;
  firstLetter: string;

  ngOnInit() {
    // Use the API endpoint for token icons
    if (this.tokenId) {
      this.imageUrl = `/api/tracker/api/tokens/${this.tokenId}/icon`;
    }

    // Get the first letter for fallback
    if (this.symbol) {
      this.firstLetter = this.symbol.charAt(0).toUpperCase();
    } else if (this.name) {
      this.firstLetter = this.name.charAt(0).toUpperCase();
    } else {
      this.firstLetter = '?';
    }
  }

  onImageError() {
    this.showFallback = true;
  }

  getFallbackStyles() {
    return {
      'width.px': this.size,
      'height.px': this.size,
      'line-height.px': this.size,
      'font-size.px': this.size * 0.4
    };
  }
}