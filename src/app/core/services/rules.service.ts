import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Rules } from '../../shared/models/rules';
import { environment } from '../../../environments/environment';



@Injectable({
  providedIn: 'root'
})
export class RulesService {
  private rules: Rules;

  constructor(
    private http: HttpClient,
  ) {}


  getRules(): Promise<Rules> {
    const jsonFile = `assets/${environment.tenant}/rules.json`;
    return new Promise<Rules>((resolve, reject) => {
      if (this.rules) {
        resolve(this.rules);
      } else {
        this.http.get(jsonFile).toPromise().then((response) => {
          this.rules = response as Rules;
          resolve(this.rules);
        }).catch((response: any) => {
          reject(`Could not load file '${jsonFile}': ${JSON.stringify(response)}`);
        });
      }
    });
  }
}
