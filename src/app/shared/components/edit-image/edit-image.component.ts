import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-edit-image',
  templateUrl: './edit-image.component.html',
  styleUrls: ['./edit-image.component.scss']
})
export class EditImageComponent implements OnInit, PopoverChild {
  @Input() data: {
    bucket?: string,
    imageUrl?: string,
    updateRef: { id: string, image: string },
  };
  @Output() dismissPopover = new EventEmitter<boolean>();

  constructor(
    private dataService: DataService,
  ) { }

  ngOnInit(): void {
  }


  uploadImage(event) {
    this.dataService.uploadFile(
      event.target.files[0],
      this.data.bucket,
      this.data.updateRef
    ).then(() => {
      this.dismissPopover.emit(true);
    }, () => {
      console.error('Image upload failed');
      this.dismissPopover.emit(false);
    });
  }
}
