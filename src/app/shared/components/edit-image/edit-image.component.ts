import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CropperSettings, ImageCropperComponent } from 'ngx-img-cropper';

import { PopoverChild } from '../../models/popover-child';
import { UtilService } from '../../../core/services/util.service';
import { StorageService } from '../../../core/services/storage.service';
import { EditImageProps } from '../../models/edit-image-props';



@Component({
  selector: 'app-edit-image',
  templateUrl: './edit-image.component.html',
  styleUrls: ['./edit-image.component.scss']
})
export class EditImageComponent implements OnInit, PopoverChild {
  @Input() props: EditImageProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
  @ViewChild('cropper') cropper: ImageCropperComponent;
  croppedImageData: any = {};
  cropperSettings: CropperSettings;
  imageName: string;

  constructor(
    private storage: StorageService,
    private util: UtilService,
  ) {
    this.cropperSettings = new CropperSettings();
    this.cropperSettings.dynamicSizing = true;
    this.cropperSettings.fileType = 'image/jpeg';
    this.cropperSettings.noFileInput = true;
    this.cropperSettings.compressRatio = 0.9;
  }

  ngOnInit(): void {
    if (this.props.cropperSettings) {
      Object.entries(this.props.cropperSettings).forEach(([key, value]) => {
        this.cropperSettings[key] = value;
      });
    }
  }


  saveImage() {
    let imageName = new Date().toString();
    if (this.props.imageName) {
      imageName = this.props.imageName;
    } else if (this.imageName) {
      imageName = this.util.slugify(this.imageName);
    } else if (this.props.updateRef) {
      imageName = this.props.updateRef.id;
    }

    this.storage.uploadFile(
      `${imageName}.jpg`,
      this.util.dataURLtoBlob(this.croppedImageData.image),
      this.props.bucket,
      this.props.updateRef
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
