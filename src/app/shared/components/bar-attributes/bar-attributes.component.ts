import { Component, Input, OnInit } from '@angular/core';
import { combineLatest, Observable  } from 'rxjs';
import { map } from 'rxjs/operators';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';

import type { AllowedAttribute, Attribute, EditAttributeProps } from '../../models';
import { EditAttributeComponent } from '../edit-attribute/edit-attribute.component';
import { PopoverService } from '../../../core/services/popover.service';
import { RulesService } from '../../services/rules.service';



@Component({
  selector: 'app-bar-attributes',
  templateUrl: './bar-attributes.component.html',
  styleUrl: './bar-attributes.component.scss'
})
export class BarAttributesComponent implements OnInit {
  @Input() attributeValues$: Observable<Attribute[]>;
  @Input() canEdit: boolean;
  @Input() altCollection: null | string;
  @Input() personId: string;
  allowedAttributes$: Observable<AllowedAttribute[]>;
  attributes$: Observable<Attribute[]>;

  constructor(
    private popover: PopoverService,
    private rulesService: RulesService,
  ) {
    this.allowedAttributes$ = fromPromise(this.rulesService.getRules()).pipe(
      map((rules) => rules.allowedAttributes)
    );
  }

  ngOnInit() {
    this.attributes$ = combineLatest([
      this.attributeValues$,
      this.allowedAttributes$,
    ]).pipe(
      map(([attributes, allowed]) => {
        const barAttributes = allowed.reduce((acc,attribute) => {
          if (attribute.displayStyle === 'bar') {
            acc.push(attribute.shortCode);
          }
          return acc;
        }, []);
        return attributes.filter((attribute) => barAttributes.includes(attribute.type))
      })
    );
  }



  editAttribute(attribute: Attribute) {
    if (this.canEdit) {
      this.popover.showPopover<EditAttributeProps>('Wert editieren', EditAttributeComponent, {
        personId: this.personId,
        attribute,
        altCollection: this.altCollection,
      });
    }
  }
}
