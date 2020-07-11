import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CropperSettings, ImageCropperComponent } from 'ngx-img-cropper';
import slugify from 'slugify';

import { PopoverChild } from '../../../popover/interfaces/popover-child.model';
import { DataService } from '../../../core/services/data.service';
import { UtilService } from '../../../core/services/util.service';



@Component({
  selector: 'app-edit-image',
  templateUrl: './edit-image.component.html',
  styleUrls: ['./edit-image.component.scss']
})
export class EditImageComponent implements OnInit, PopoverChild {
  @Input() data: {
    bucket?: string,
    imageName?: string,
    imageUrl?: string,
    updateRef?: { id: string, image: string },
  };
  @Output() dismissPopover = new EventEmitter<boolean>();
  @ViewChild('cropper') cropper: ImageCropperComponent;
  croppedImageData: any = {};
  cropperSettings: CropperSettings;
  imageName: string;

  constructor(
    private dataService: DataService,
    private util: UtilService,
  ) {
    this.cropperSettings = new CropperSettings();
    this.cropperSettings.height = 100;
    this.cropperSettings.width = 100;
    this.cropperSettings.croppedHeight = 250;
    this.cropperSettings.croppedWidth = 250;
    this.cropperSettings.dynamicSizing = true;
    this.cropperSettings.fileType = 'image/jpeg';
    this.cropperSettings.noFileInput = true;
    this.cropperSettings.compressRatio = 0.9;
  }

  ngOnInit(): void {
  }


  saveImage() {
    let imageName = new Date().toString();
    if (this.data.imageName) {
      imageName = this.data.imageName;
    } else if (this.imageName) {
      imageName = this.util.slugify(this.imageName);
    } else if (this.data.updateRef) {
      imageName = this.data.updateRef.id;
    }

    this.dataService.uploadFile(
      `${imageName}.jpg`,
      this.util.dataURLtoBlob(this.croppedImageData.image),
      this.data.bucket,
      this.data.updateRef
    ).then(() => {
      this.dismissPopover.emit(true);
    }, () => {
      console.error('Image upload failed');
      this.dismissPopover.emit(false);
    });
  }


  selectedImageChanged(event) {
    const image: any = new Image();
    const file: File = event.target.files[0];
    this.imageName = file.name;
    const myReader: FileReader = new FileReader();
    const that = this;
    myReader.onloadend = (loadEvent: any) => {
      image.src = loadEvent.target.result;
      that.cropper.setImage(image);
    };

    myReader.readAsDataURL(file);
  }
}
