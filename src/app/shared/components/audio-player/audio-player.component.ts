import { Component, Input, OnInit } from '@angular/core';
import { faStop } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-audio-player',
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.scss']
})
export class AudioPlayerComponent implements OnInit {
  @Input() fileUrl: string;
  @Input() name: string;
  @Input() private icon: any;
  showIcon: any;
  private audio;
  private isPlaying = false;

  constructor() { }

  ngOnInit(): void {
    this.showIcon = this.icon;
    this.audio = new Audio(this.fileUrl);
    this.audio.addEventListener('ended', () => {
      this.showIcon = this.icon;
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
    });
  }


  togglePlayback() {
    if (this.isPlaying) {
      this.showIcon = this.icon;
      this.audio.pause();
      this.audio.currentTime = 0;
    } else {
      this.showIcon = faStop;
      this.audio.play();
    }

    this.isPlaying = !this.isPlaying;
  }
}
