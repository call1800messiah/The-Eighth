import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { take } from 'rxjs/operators';
import { faGuitar } from '@fortawesome/free-solid-svg-icons';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { StorageService } from '../../../core/services/storage.service';



@Component({
  selector: 'app-audio-player-list',
  templateUrl: './audio-player-list.component.html',
  styleUrls: ['./audio-player-list.component.scss']
})
export class AudioPlayerListComponent implements OnInit, PopoverChild {
  @Input() data: any;
  @Output() dismissPopover = new EventEmitter<boolean>();
  faGuitar = faGuitar;
  santanaUrl: string;

  constructor(
    private storage: StorageService,
  ) {
    this.storage.getDownloadURL('audio/santana.mp3').pipe(
      take(1),
    ).subscribe((url) => {
      this.santanaUrl = url;
    });
  }

  ngOnInit(): void {
  }
}
