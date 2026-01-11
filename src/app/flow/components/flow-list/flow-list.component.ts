import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faPlus, faCalendar } from '@fortawesome/free-solid-svg-icons';

import type { Flow } from '../../models';
import { FlowService } from '../../services/flow.service';
import { PopoverService } from '../../../core/services/popover.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { EditFlowComponent } from '../edit-flow/edit-flow.component';
import { AuthUser } from '../../../auth/models/auth-user';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-flow-list',
  templateUrl: './flow-list.component.html',
  styleUrl: './flow-list.component.scss'
})
export class FlowListComponent implements OnInit {
  faPlus = faPlus;
  faCalendar = faCalendar;

  flows$: Observable<Flow[]>;
  filteredFlows$: Observable<Flow[]>;
  filterText: BehaviorSubject<string>;
  initialFilterText: string;
  user: AuthUser;

  constructor(
    private auth: AuthService,
    private flowService: FlowService,
    private popover: PopoverService,
    private navigation: NavigationService,
    private router: Router,
  ) {
    // Load filter from localStorage
    this.initialFilterText = localStorage.getItem('flows-filter') || '';
    this.filterText = new BehaviorSubject<string>(this.initialFilterText);
    this.user = this.auth.user;

    // Setup filtered observable
    this.flows$ = this.flowService.getFlows();
    this.filteredFlows$ = combineLatest([
      this.flows$,
      this.filterText
    ]).pipe(
      map(this.filterFlowsByText)
    );
  }

  ngOnInit(): void {
    this.navigation.setPageLabel('Sessions');
  }

  onFilterChanged(text: string): void {
    localStorage.setItem('flows-filter', text);
    this.filterText.next(text);
  }

  showCreateFlowDialog(): void {
    this.popover.showPopover('Neue Session erstellen', EditFlowComponent, {
      onSave: (flow: { id: string; date: Date; title?: string }) => {
        this.router.navigate(['/flow', flow.id]);
      }
    });
  }

  getFormattedDate(date: Date): string {
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private filterFlowsByText(data: [Flow[], string]): Flow[] {
    const [flows, text] = data;
    const lowText = text.trim().toLowerCase();
    return flows.filter(flow => {
      return text === ''
        || flow.title?.toLowerCase().includes(lowText)
        || flow.date.toLocaleDateString('de-DE').includes(lowText);
    });
  }
}
