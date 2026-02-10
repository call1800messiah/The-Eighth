import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Place } from '../models/place';
import type { Info } from '../../shared/models/info';
import { UtilService } from '../../core/services/util.service';
import { StorageService } from '../../core/services/storage.service';
import { DataService } from '../../core/services/data.service';
import { InfoType } from '../../core/enums/info-type.enum';
import { RealtimeService } from '../../core/services/supabase-realtime.service';



@Injectable({
  providedIn: 'root',
})
export class PlaceService {
  static readonly collection = 'places';
  static placeTypes = {
    barony: 'Baronie',
    castle: 'Burg',
    city: 'Stadt',
    forest: 'Wald',
    fortifiedYard: 'Wehrhof',
    hamlet: 'Weiler',
    island: 'Insel',
    landmass: 'Landmasse',
    ocean: 'Gewässer',
    place: 'Ort',
    principality: 'Fürstentum',
    ship: 'Schiff',
    shire: 'Grafschaft',
    state: 'Staat',
    town: 'Dorf',
  };
  private places$: BehaviorSubject<Place[]>;

  constructor(
    private data: DataService,
    private realtime: RealtimeService,
    private storage: StorageService,
  ) {}


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
      this.realtime.watch<any>(
        'places',
        undefined,
        'places',
      ).pipe(
        map(rows => this.transformPlaces(rows)),
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
    const cleanedPlace: any = { ...place };
    if (place.parent) {
      cleanedPlace.parent_id = place.parent.id;
      delete cleanedPlace.parent;
    }
    delete cleanedPlace.parts;
    delete cleanedPlace.image;
    return this.data.store(cleanedPlace, PlaceService.collection, placeId);
  }



  private transformPlaces(rows: any[]): Place[] {
    return rows.map(row => {
      const place: Place = {
        access: [],
        collection: PlaceService.collection,
        id: row.id,
        image: null,
        inhabitants: row.inhabitants,
        name: row.name,
        owner: row.owner_id,
        type: row.type,
      };
      if (row.parent_id) {
        place.parent = { id: row.parent_id };
      }
      if (row.image && row.image !== '') {
        this.storage.getDownloadURL(row.image).subscribe((url) => {
          place.image = url;
        });
      }
      return place;
    });
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
      if (placeMap[placeId]) {
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
