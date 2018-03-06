import {Component, OnInit} from '@angular/core';
import {EventService} from './event.service';
import {ChangeDetectorRef} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public title = 'app';
  public eventList = new Array();

  constructor(private ref: ChangeDetectorRef, private eventService: EventService) {}

  ngOnInit() {
    this.eventService.getEvents('http://localhost/api').subscribe(event => {
      console.log(event);
      this.eventList.push(event);
      this.ref.detectChanges();
    });
  }
}
