import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';



@Injectable({
  providedIn: 'root'
})
export class RulesService {
  private rules: any;

  constructor(
    private http: HttpClient,
  ) {}


  getRules(): Promise<any> {
    const jsonFile = `assets/rules.json`;
    return new Promise<void>((resolve, reject) => {
      if (this.rules) {
        resolve(this.rules);
      } else {
        this.http.get(jsonFile).toPromise().then((response) => {
          this.rules = response;
          resolve(this.rules);
        }).catch((response: any) => {
          reject(`Could not load file '${jsonFile}': ${JSON.stringify(response)}`);
        });
      }
    });
  }
}
