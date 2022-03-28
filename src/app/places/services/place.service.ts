import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Place } from '../models/place';
import { UtilService } from '../../core/services/util.service';
import { StorageService } from '../../core/services/storage.service';
import { ApiService } from '../../core/services/api.service';
import { AuthUser } from '../../auth/models/auth-user';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { Info } from '../../shared/models/info';
import { InfoType } from '../../core/enums/info-type.enum';



@Injectable({
  providedIn: 'root',
})
export class PlaceService {
  static readonly collection = 'places';
  static placeTypes = {
    city: 'Stadt',
    island: 'Insel',
    landmass: 'Landmasse',
    ocean: 'Gewässer',
    place: 'Ort',
    ship: 'Schiff',
    state: 'Staat'
  };
  private places$: BehaviorSubject<Place[]>;
  private user: AuthUser;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private data: DataService,
    private storage: StorageService,
  ) {
    this.user = this.auth.user;
  }


  getPlaceById(placeId: string): Observable<Place> {
    return this.getPlaces().pipe(
      map((places) => places.find(person => person.id === placeId)),
    );
  }


  getPlaceInfos(placeId: string): Observable<Map<InfoType, Info[]>> {
    return this.data.getInfos(placeId, PlaceService.collection);
  }


  getPlaces(): Observable<Place[]> {
    if (!this.places$) {
      this.places$ = new BehaviorSubject<Place[]>([]);
      this.api.getDataFromCollection(
        PlaceService.collection,
        (ref) => ref
          .where('access', 'array-contains', this.user.id)
      ).pipe(
        map(this.transformPlaces.bind(this)),
        map(this.resolveParents),
        map((places: Place[]) => places.sort(UtilService.orderByName)),
        map(this.createPlaceTree)
      ).subscribe(places => {
        this.places$.next(places);
      });
    }
    return this.places$.asObservable();
  }


  store(place: Partial<Place>, placeId?: string) {
    const cleanedPlace: Partial<Place> & { parentId?: string } = { ...place };
    if (place.parent) {
      cleanedPlace.parentId = place.parent.id;
      delete cleanedPlace.parent;
    }
    return this.data.store(cleanedPlace, PlaceService.collection, placeId);
  }



  private transformPlaces(places: any): Place[] {
    return places.reduce((all, entry) => {
      const placeData = entry.payload.doc.data();
      const place: Place = {
        id: entry.payload.doc.id,
        image: null,
        isPrivate: placeData.isPrivate,
        name: placeData.name,
        owner: placeData.owner,
        type: placeData.type,
      };
      if (placeData.parentId) {
        place.parent = { id: placeData.parentId };
      }
      if (placeData.image && placeData.image !== '') {
        this.storage.getDownloadURL(placeData.image).subscribe((url) => {
          place.image = url;
        });
      }
      all.push(place);
      return all;
    }, []);
  }


  private createPlaceTree(places: Place[]): Place[] {
    const placeMap: Record<string, Place> = {};
    const placeGroupMap: Record<string, Place[]> = {
      none: []
    };

    places.forEach((place) => {
      placeMap[place.id] = place;
      if (place.parent) {
        if (!placeGroupMap[place.parent.id]) {
          placeGroupMap[place.parent.id] = [];
        }
        placeGroupMap[place.parent.id].push(place);
      } else {
        placeGroupMap.none.push(place);
      }
    });

    Object.entries(placeGroupMap).forEach(([placeId, placeList]) => {
      if (placeId !== 'none' && placeMap[placeId]) {
        placeMap[placeId].parts = placeList;
      }
    });

    return places;
  }


  private resolveParents(places: Place[]): Place[] {
    return places.map(place => {
      if (place.parent) {
        const parent = places.find(parentCandidate => place.parent.id === parentCandidate.id);
        if (parent) {
          place.parent.name = parent.name;
        }
      }
      return place;
    });
  }
}
