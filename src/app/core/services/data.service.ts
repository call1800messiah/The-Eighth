import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';
import { Info } from '../../shared';
import { InfoType } from '../enums/info-type.enum';
import { AuthService } from './auth.service';
import { AuthUser } from '../../auth/models/auth-user';
import { UserService } from './user.service';
import { User } from '../models/user';



@Injectable({
  providedIn: 'root'
})
export class DataService {
  private user: AuthUser;
  private users: User[];

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private userService: UserService,
  ) {
    this.user = this.auth.user;
    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });
  }



  private static transformSnapshotChanges(changeList: any[]) {
    return changeList.reduce((all, entry) => {
      all.push(entry.payload.doc.data());
      return all;
    }, []);
  }


  delete(itemId: string, collection: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.api.deleteDocumentFromCollection(itemId, collection).then(() => {
        resolve(true);
      }).catch((error) => {
        console.error(error);
        resolve(false);
      });
    });
  }


  getInfos(id: string, collection: string): Observable<Map<InfoType, Info[]>> {
    return this.api.getDataFromCollection(
      `${collection}/${id}/info`,
      (ref) => ref
        .where('access', 'array-contains', this.user.id)
    ).pipe(
      map((infos) => this.transformInfos(infos, `${collection}/${id}/info`)),
    );
  }


  store(item: any, collection: string, id?: string): Promise<boolean> {
    const storeItem = { ...item };
    if (!id) {
      // Set access for new items
      storeItem.access = this.getInitialDocumentPermissions(item.owner);
    } else if (storeItem.access) {
      // Never overwrite access for existing items, this only done through access management
      delete storeItem.access;
    }
    if (storeItem.id) {
      delete storeItem.id;
    }
    if (storeItem.collection) {
      delete storeItem.collection;
    }

    return new Promise((resolve) => {
      if (id) {
        this.api.updateDocumentInCollection(id, collection, storeItem).then(() => {
          resolve(true);
        }).catch((error) => {
          console.error(error);
          resolve(false);
        });
      } else {
        this.api.addDocumentToCollection(storeItem, collection).then((reference) => {
          if (reference) {
            resolve(true);
          } else {
            resolve(false);
          }
        }).catch((error) => {
          console.error(error);
          resolve(false);
        });
      }
    });
  }


  private getInitialDocumentPermissions(creatorID: string): string[] {
    return this.users.reduce((all, user) => {
      if (user.id === creatorID || user.isGM) {
        all.push(user.id);
      }
      return all;
    }, []);
  }


  private transformInfos(infos: any[], collection: string): Map<InfoType, Info[]> {
    return infos.reduce((all, entry) => {
      const infoData = entry.payload.doc.data();
      let typeArray = all.get(infoData.type);
      if (!typeArray) {
        typeArray = [];
        all.set(infoData.type, typeArray);
      }
      typeArray.push({
        access: infoData.access,
        collection,
        content: infoData.content,
        created: infoData.created ? new Date(infoData.created.seconds * 1000) : null,
        id: entry.payload.doc.id,
        modified: infoData.modified ? new Date(infoData.modified.seconds * 1000) : null,
        owner: infoData.owner,
        type: infoData.type,
      });
      return all;
    }, new Map<InfoType, Info[]>());
  }
}
