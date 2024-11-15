import { Component, Input, OnInit } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { map, tap } from 'rxjs/operators';

import type { Attribute, EditAttributeProps } from '../../../shared';
import type { AllowedAttribute } from '../../../rules';
import { RulesService } from '../../../rules/services/rules.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditAttributeComponent } from '../../../shared/components/edit-attribute/edit-attribute.component';
import { DiceRollerService } from '../../../dice/services/dice-roller.service';
import { UtilService } from '../../../core/services/util.service';



@Component({
  selector: 'app-attributes',
  templateUrl: './attributes.component.html',
  styleUrl: './attributes.component.scss'
})
export class AttributesComponent implements OnInit {
  @Input() attributeValues$: Observable<Attribute[]>;
  @Input() canEdit: boolean;
  @Input() personId: string;
  allowedAttributes: Record<string, AllowedAttribute>;
  allowedAttributes$: Observable<AllowedAttribute[]>;
  attributes$: Observable<Attribute[]>;

  constructor(
    private dice: DiceRollerService,
    private popover: PopoverService,
    private rulesService: RulesService,
  ) {
    this.allowedAttributes$ = fromPromise(this.rulesService.getRulesConfig()).pipe(
      map((rules) => rules.allowedAttributes),
      tap((allowedAttributes) => {
        this.allowedAttributes = allowedAttributes.reduce((acc, attribute) => {
          acc[attribute.shortCode] = attribute;
          return acc;
        }, {});
      }),
    );
  }

  ngOnInit(): void {
    this.attributes$ = combineLatest([
      this.attributeValues$,
      this.allowedAttributes$,
    ]).pipe(
      map(([attributes, allowed]) => {
        return allowed.sort(UtilService.orderByOrder).reduce((acc,attribute) => {
          const attValues = attributes.find((att) => att.type === attribute.shortCode);
          if (attribute.displayStyle === 'number' && attValues) {
            acc.push(attValues);
          }
          return acc;
        }, []);
      })
    );
  }


  editAttribute(attribute: Attribute) {
    if (this.canEdit) {
      this.popover.showPopover<EditAttributeProps>('Wert editieren', EditAttributeComponent, {
        personId: this.personId,
        attribute,
      });
    }
  }


  rollAttribute(attribute: Attribute, name: string) {
    const modifier = parseInt(window.prompt('Mofikator eingeben', '0'), 10);
    this.dice.rollAttributeCheck(attribute.current, !Number.isNaN(modifier) ? modifier : 0, name);
  }
}
