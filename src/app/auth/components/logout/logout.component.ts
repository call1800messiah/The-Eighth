import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';



@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class LogoutComponent implements OnInit {
  private auth = inject(AuthService);


  ngOnInit(): void {
  }

  logout() {
    this.auth.logout();
  }
}
