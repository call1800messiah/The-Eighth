import { Component, Input } from '@angular/core';
import { Menu } from '../../models/menu';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent {
  @Input() personId: string;
  @Input() menu: Menu;

  constructor() {}
}
