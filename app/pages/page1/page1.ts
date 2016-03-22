import {Page} from 'ionic-angular';
import { Inject } from 'angular2/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgClass, NgIf } from 'angular2/core';
import { Http } from 'angular2/http';
import 'rxjs/add/operator/map';

const minUpdateMS = 0.5 * 1000;
const maxUpdateMS = 15 * 1000;

@Page({
    templateUrl: 'build/pages/page1/page1.html',
})
// @Component({selector: 'Page1', changeDetection: ChangeDetectionStrategy.OnPush})
export class Page1 {
    http; lampOn; speakersOn; ledsOn;
    private checkStateLoopMS; changed; prevState;

    constructor( @Inject(Http) http: Http, private ref: ChangeDetectorRef) {
        this.http = http;
        this.lampOn = false;
        this.speakersOn = false;
        this.ledsOn = false;
        this.checkStateLoopMS = minUpdateMS;
        this.changed = false;
        this.prevState = {
            lamp: 0,
            led: 0,
            speakers: 0
        }

        this.checkStateLoop();
        this.http.post('http://10.0.0.42:5000/api/environment')
            .map(res => res.json())
            .subscribe(
            err => console.log(err)
            );
    }

    checkStateLoop() {
        this.checkSwitchStates();
        if (this.changed) {
            this.checkStateLoopMS = minUpdateMS;
            this.changed = false;
        } else {
            let scaleRatio = 0.3;
            let scaleAmount = this.checkStateLoopMS * scaleRatio;
            this.checkStateLoopMS += scaleAmount;
            const ms = this.checkStateLoopMS, min = minUpdateMS, max = maxUpdateMS; // Conciseness, yo
            this.checkStateLoopMS = ms < min ? min : ms > max ? max : ms; // JS has no clamp function, and I like one-liners.
        }
        setTimeout(() => {
            this.checkStateLoop();
        }, this.checkStateLoopMS);
    }

    checkSwitchStates() {
        this.http.get('http://10.0.0.42:5000/api/device/' + 'lamp')
            .map(res => res.json())
            .subscribe( // Like I said, I like one-liners :P (no I don't usually write code like this, but this one was fun)
            data => { this.changed = (this.lampOn != (this.lampOn = (data.state == 1)) ? !this.ref.markForCheck() : false) || this.changed },
            err => console.log(err)
            );
        this.http.get('http://10.0.0.42:5000/api/device/' + 'LEDLights')
            .map(res => res.json())
            .subscribe(
            data => { this.changed = (this.ledsOn != (this.ledsOn = (data.state == 1)) ? !this.ref.markForCheck() : false) || this.changed },
            err => console.log(err)
            );
        this.http.get('http://10.0.0.42:5000/api/device/' + 'speakers')
            .map(res => res.json())
            .subscribe(
            data => { this.changed = (this.speakersOn != (this.speakersOn = (data.state == 1)) ? !this.ref.markForCheck() : false) || this.changed },
            err => console.log(err)
            );
    }

    toggleWemoSwitch(name) {
        this.http.post('http://10.0.0.42:5000/api/device/' + name, { 'state': 'toggle' })
            .map(res => res.json())
            .subscribe(
            data => { console.log(data); this.checkSwitchStates() },
            err => console.log(err),
            () => console.log('Toggling ' + name)
            );
    }


}


