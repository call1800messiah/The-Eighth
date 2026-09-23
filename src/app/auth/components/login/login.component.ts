import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { NavigationService } from '../../../core/services/navigation.service';



@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private nav = inject(NavigationService);

  loginForm = new UntypedFormGroup({
    email: new UntypedFormControl(''),
    password: new UntypedFormControl(''),
  });

  ngOnInit(): void {
    this.nav.setPageLabel('Login');
  }

  login() {
    this.auth.login(
      this.loginForm.value.email,
      this.loginForm.value.password,
    );
  }
}
