import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, withLatestFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { UtilService } from '../../core/services/util.service';
import { PlaceService } from '../../places/services/place.service';
import type { AuthUser } from '../../auth/models/auth-user';
import type { Info } from '../../shared/models/info';
import type { Scene } from '../models/scene';
import type { Place } from '../../places/models/place';
import { InfoType } from '../../core/enums/info-type.enum';
import { SceneDB } from '../models/scene.db';

@Injectable({
  providedIn: 'root'
})
export class SceneService {
  static readonly collection = 'scenes';
  private scenes$: BehaviorSubject<Scene[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
    private place: PlaceService,
  ) {
    this.user = this.auth.user;
  }


  getSceneById(sceneId: string): Observable<Scene> {
    return this.getScenes().pipe(
      map((scenes) => scenes.find(scene => scene.id === sceneId)),
    );
  }


  getSceneInfos(sceneId: string): Observable<Map<InfoType, Info[]>> {
    return this.data.getInfos(sceneId, SceneService.collection);
  }


  getScenes(): Observable<Scene[]> {
    if (!this.scenes$) {
      this.scenes$ = new BehaviorSubject<Scene[]>([]);
      this.api.getDataFromCollection(
        SceneService.collection,
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
      ).pipe(
        withLatestFrom(this.place.getPlaces().pipe(
          map((places) => places.reduce((all, p) => {
            all[p.id] = p;
            return all;
          }, {}) as Record<string, Place>),
        )),
        map(this.transformScenes.bind(this)),
        map((scenes: Scene[]) => scenes.sort(UtilService.orderByName)),
      ).subscribe(places => {
        this.scenes$.next(places);
      });
    }
    return this.scenes$.asObservable();
  }


  store(scene: Partial<SceneDB>, sceneId?: string) {
    return this.data.store(scene, SceneService.collection, sceneId);
  }


  private transformScenes([scenes, placeMap]): Scene[] {
    return scenes.reduce((all: Scene[], entry) => {
      const sceneData = entry.payload.doc.data();
      const scene: Scene = {
        id: entry.payload.doc.id,
        ...sceneData,
      };
      if (sceneData.place) {
        if (placeMap[sceneData.place]) {
          scene.place = placeMap[sceneData.place];
        } else {
          scene.place = sceneData.place;
        }
      }
      all.push(scene);
      return all;
    }, []);
  }
}
