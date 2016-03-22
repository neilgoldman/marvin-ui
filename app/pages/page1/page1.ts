import {Page} from 'ionic-angular';
import { Inject } from 'angular2/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from 'angular2/core';
import { Http } from 'angular2/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/timeout';
import 'rxjs/add/operator/retry';


const minUpdateMS = 0.5 * 1000;
const maxUpdateMS = 15 * 1000;
const environmentRefreshMS = 30 * 1000;

const httpTimeoutMS = 2 * 1000;
const maxHttpRetries = 5;
const waitBetweenRetriesMS = 250;

@Page({
    templateUrl: 'build/pages/page1/page1.html',
})
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
        setInterval(this.refreshEnvironment(), environmentRefreshMS);
    }

    checkStateLoop() {
        this.checkAllSwitchStates();
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

    refreshEnvironment() {
        this.http.post('http://10.0.0.42:5000/api/environment')
            .map(res => res.json())
            .subscribe(
            err => console.log(err)
            );
    }

    checkSwitchState(deviceStr: string) {
        this.http.get('http://10.0.0.42:5000/api/device/' + deviceStr)
            .retry(maxHttpRetries)
            .map(res => res.json())
            .timeout(httpTimeoutMS)
            .subscribe( // Like I said, I like one-liners :P (no I don't usually write code like this, but this one was fun)
            data => { this.changed = (this[deviceStr + 'On'] != (this[deviceStr + 'On'] = (data.state == 1)) ? !this.ref.markForCheck() : false) || this.changed },
            err => console.log(err)
            );
    }

    checkAllSwitchStates() {
        this.checkSwitchState('lamp');
        this.checkSwitchState('leds');
        this.checkSwitchState('speakers');
    }

    toggleWemoSwitch(name) {
        this.http.post('http://10.0.0.42:5000/api/device/' + name, { 'state': 'toggle' })
            .map(res => res.json())
            .subscribe(
            data => this.checkAllSwitchStates(),
            err => console.log(err)
            );
    }
}


