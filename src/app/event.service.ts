import { Injectable } from '@angular/core';
import {Observable} from 'rxjs/Observable';
import EventSourcePolyfill from './event-source-polyfill';

@Injectable()
export class EventService {

  constructor() {}

  getEvents(sseUrl: string) {
    return new Observable<any>(obs => {
      const es = new EventSourcePolyfill(sseUrl);
      es.addEventListener('message', evt => {
        obs.next(evt);
      });
      es.addEventListener('error', err => {
        es.close();
      });
      return () => es.close();
    });
  }
}
