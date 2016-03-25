import {Page} from 'ionic-angular';
import { Inject } from 'angular2/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from 'angular2/core';
import { Http, Headers } from 'angular2/http';
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
    lampHttpTrying; speakersHttpTrying; ledsHttpTrying;
    private checkStateLoopMS; changed; prevState;

    constructor( @Inject(Http) http: Http, private ref: ChangeDetectorRef) {
        this.http = http;
        this.lampOn = false;
        this.speakersOn = false;
        this.ledsOn = false;
        this.lampHttpTrying = false;
        this.speakersHttpTrying = false;
        this.ledsHttpTrying = false;
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

    checkSwitchState(deviceStr: string, callback = (_) => { }) {
        this.http.get('http://10.0.0.42:5000/api/device/' + deviceStr)
            .retry(maxHttpRetries)
            .map(res => res.json())
            .timeout(httpTimeoutMS)
            .subscribe( // Like I said, I like one-liners :P (no I don't usually write code like this, but this one was fun)
            data => { this.changed = callback(data) || (this[deviceStr + 'On'] != (this[deviceStr + 'On'] = (data.state == 1)) ? !this.ref.markForCheck() : false) || this.changed },
            err => console.log(err)
            );
    }

    checkAllSwitchStates(callback = (_) => { }) {
        this.checkSwitchState('lamp', callback);
        this.checkSwitchState('leds', callback);
        this.checkSwitchState('speakers', callback);
    }

    toggleWemoSwitch(name: string) {
        this.setWemoSwitch(name, !this[name + 'On']);
    }

    setWemoSwitch(name: string, on: boolean, numTries = 10) {
        if (numTries === 0) {
            this[name + 'HttpTrying'] = false;
            return;
        }
        this[name + 'HttpTrying'] = true;
        var headers = new Headers();
        headers.append('Content-Type', 'application/json');

        this.http.post('http://10.0.0.42:5000/api/device/' + name,
            JSON.stringify({ state: on ? 'on' : 'off' }),
            { headers: headers }
        )
            .map(res => res.json())
            .subscribe(
            data => {
                this.checkSwitchState(name, data => {
                    if (data.state != on) {
                        setTimeout(this.setWemoSwitch(name, on, numTries - 1), 200);
                    } else {
                        this[name + 'HttpTrying'] = false;
                    }
                });
            },
            err => {console.log(err); setTimeout(this.setWemoSwitch(name, on, numTries - 1), 100);}
            );
    }
}


