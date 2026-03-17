import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Cat20TokenComponent } from './cat20-token.component';

const routes: Routes = [
  {
    path: ':tokenId',
    component: Cat20TokenComponent,
    data: { ogImage: true }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Cat20TokenRoutingModule { }
