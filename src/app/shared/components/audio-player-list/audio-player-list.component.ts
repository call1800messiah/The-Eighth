import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { take } from 'rxjs/operators';
import { faGuitar } from '@fortawesome/free-solid-svg-icons';

import { StorageService } from '../../../core/services/storage.service';



@Component({
  selector: 'app-audio-player-list',
  templateUrl: './audio-player-list.component.html',
  styleUrls: ['./audio-player-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AudioPlayerListComponent implements OnInit {
  private storage = inject(StorageService);

  faGuitar = faGuitar;
  audioFiles: string[] = [];

  async ngOnInit(): Promise<void> {
    const files = await this.storage.listFiles('audio');
    files.forEach(file => {
      this.storage.getDownloadURL(file).pipe(
        take(1),
      ).subscribe(url => {
        this.audioFiles.push(url);
      });
    });
  }
}
