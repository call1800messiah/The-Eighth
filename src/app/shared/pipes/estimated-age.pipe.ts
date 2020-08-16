import { OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'estimatedAge',
  pure: false,
})
export class EstimatedAgePipe implements PipeTransform, OnDestroy {
  private subscription = new Subscription();
  private date: number;

  constructor(
    private dataService: DataService
  ) {
    this.subscription.add(
      this.dataService.getCampaignInfo().subscribe((data) => {
        const dateSplit = data.date.split(' ');
        this.date = parseInt(dateSplit[dateSplit.length - 1], 10);
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  transform(value: number, ...args: unknown[]): string {
    if (!this.date) {
      return `${value} BF`;
    }
    const age = this.date - value;

    if (age > 2000) {
      return 'mehrere tausend Jahre';
    }
    if (age > 1000) {
      return 'über tausend Jahre';
    }
    if (age > 300) {
      return 'mehrere hundert Jahre';
    }
    if (age > 60) {
      return `ca. ${Math.round(age / 10) * 10} Jahre`;
    }
    if (age > 20) {
      return `ca. ${Math.round(age / 5) * 5} Jahre`;
    }

    return `ca. ${age} Jahre`;
  }

}
