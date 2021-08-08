import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { faLock, faUnlock } from '@fortawesome/free-solid-svg-icons';



@Component({
  selector: 'app-unlock-button',
  templateUrl: './unlock-button.component.html',
  styleUrls: ['./unlock-button.component.scss']
})
export class UnlockButtonComponent implements OnInit {
  @Output() toggle = new EventEmitter<boolean>();
  faLock = faLock;
  faUnlock = faUnlock;
  state = false;

  constructor() { }

  ngOnInit(): void {
  }

  toggleState() {
    this.state = !this.state;
    this.toggle.emit(this.state);
  }
}
