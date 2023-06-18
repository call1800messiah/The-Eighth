import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs/operators';
import { faGuitar } from '@fortawesome/free-solid-svg-icons';

import { StorageService } from '../../../core/services/storage.service';
import { environment } from '../../../../environments/environment';



@Component({
  selector: 'app-audio-player-list',
  templateUrl: './audio-player-list.component.html',
  styleUrls: ['./audio-player-list.component.scss']
})
export class AudioPlayerListComponent implements OnInit {
  faGuitar = faGuitar;
  audioFiles: string[] = [];

  constructor(
    private storage: StorageService,
  ) {
    const files = environment.tenantData[environment.tenant].audioFiles;
    if (files) {
      files.forEach((file) => {
        this.storage.getDownloadURL(file).pipe(
          take(1),
        ).subscribe((url) => {
          this.audioFiles.push(url);
        });
      });
    }
  }

  ngOnInit(): void {
  }
}
