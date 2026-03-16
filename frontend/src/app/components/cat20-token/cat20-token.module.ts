import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { Cat20TokenRoutingModule } from './cat20-token-routing.module';
import { Cat20TokenComponent } from './cat20-token.component';
import { SharedModule } from '@app/shared/shared.module';

@NgModule({
  declarations: [
    Cat20TokenComponent
  ],
  imports: [
    CommonModule,
    Cat20TokenRoutingModule,
    SharedModule,
    NgbPopoverModule
  ],
  exports: [
    Cat20TokenComponent
  ]
})
export class Cat20TokenModule { }
