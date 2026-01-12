import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { faBolt, faHandSparkles, faHandsPraying, faPersonSwimming, faThumbsDown, faThumbsUp, faWandSparkles } from '@fortawesome/free-solid-svg-icons';

import type { AddableRule, Rules } from '../models';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/services/api.service';
import { DataService } from '../../core/services/data.service';
import { UtilService } from '../../core/services/util.service';



@Injectable({
  providedIn: 'root'
})
export class RulesService {
  static readonly collection = 'rules';
  static ruleTypes = {
    'advantage': {
      label: 'Vorteile',
      icon: faThumbsUp
    },
    'cantrip': {
      label: 'Zaubertricks',
      icon: faHandSparkles
    },
    'disadvantage': {
      label: 'Nachteile',
      icon: faThumbsDown
    },
    'feat': {
      label: 'Sonderfertigkeiten',
      icon: faBolt
    },
    'liturgy': {
      label: 'Liturgien',
      icon: faHandsPraying
    },
    'skill': {
      label: 'Talente',
      icon: faPersonSwimming
    },
    'spell': {
      label: 'Zauber',
      icon: faWandSparkles
    },
  };
  static featUsageTypes = {
    'passive': 'Passiv',
    'basic': 'Basismanöver',
    'special': 'Spezialmanöver',
  };
  private rulesConfig: Rules;
  private dynamicRules$: BehaviorSubject<AddableRule[]>;

  constructor(
    private api: ApiService,
    private data: DataService,
    private http: HttpClient,
  ) {}


  getRulesConfig(): Promise<Rules> {
    const jsonFile = `assets/${environment.tenant}/rules.json`;
    return new Promise<Rules>((resolve, reject) => {
      if (this.rulesConfig) {
        resolve(this.rulesConfig);
      } else {
        this.http.get(jsonFile).toPromise().then((response) => {
          this.rulesConfig = response as Rules;
          resolve(this.rulesConfig);
        }).catch((response: any) => {
          reject(`Could not load file '${jsonFile}': ${JSON.stringify(response)}`);
        });
      }
    });
  }


  getDynamicRules(): Observable<AddableRule[]> {
    if (!this.dynamicRules$) {
      this.dynamicRules$ = new BehaviorSubject<AddableRule[]>([]);
      this.api.getDataFromCollection(RulesService.collection).pipe(
        map((rules) => RulesService.transformRules(rules))
      ).subscribe((addableRules) => {
        this.dynamicRules$.next(addableRules);
      });
    }

    return this.dynamicRules$.asObservable();
  }


  store(rule: AddableRule, id?: string): Promise<{ success: boolean; id?: string }> {
    return this.data.store(rule, RulesService.collection, id);
  }


  private static transformRules(rules: any[]): AddableRule[] {
    return rules.reduce((all, entry) => {
      all.push({
        id: entry.payload.doc.id,
        ...entry.payload.doc.data(),
      });
      return all;
    }, []).sort(UtilService.orderByName);
  }
}
