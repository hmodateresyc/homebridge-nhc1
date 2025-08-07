'use strict';

const niko = require('niko-home-control');
const NikoHomeControlLight = require('./NikoHomeControlLight');
const NikoHomeControlDimmer = require('./NikoHomeControlDimmer');
const NikoHomeControlBlind = require('./NikoHomeControlBlind');

class NikoHomeControlPlatform {
    constructor(log, config, api) {
        log("NikoHomeControl Init");

        this.accessories = [];
        this.controllers = [];
        this.niko = niko;

        this.log = log;
        this.config = config;

        if (api) {
            this.api = api;
            this.api.on('didFinishLaunching', () => {
                this.log("DidFinishLaunching");
                this.run();
            });
        }
    }

    configureAccessory(accessory) {
        this.log(accessory.displayName, "Configure Accessory");
        accessory.reachable = true;
        this.accessories.push(accessory);
    }

    run() {
        this.log("Run");

        this.niko.init({
            ip: this.config.ip,
            port: 8000,
            timeout: 2000,
            events: true
        });

        this.niko.events.on('listactions', this.onEventAction.bind(this));

        this.niko
            .listActions()
            .then(this.listActions.bind(this));
    }

    listActions(response) {
        const actions = response.data;

        actions.forEach((action) => {
            if (this.config.exclude.indexOf(action.id) !== -1) {
                return;
            }

            switch (action.type) {
                case 1:
                    this.addAccessory(NikoHomeControlLight, null, action);
                    break;
                case 2:
                    this.addAccessory(NikoHomeControlDimmer, null, action);
                    break;
                case 4:
                    this.addAccessory(NikoHomeControlBlind, null, action);
                    break;
                default:
                    this.log('UNKNOW ' + action.name + ' type ' + action.type);
            }
        });
    }

    addAccessory(ClassRef, accessory = null, action = null) {
        this.log("Add " + action.name);
        const controller = new ClassRef(this, action);
        this.controllers[action.id] = controller;
    }

    onEventAction(event) {
        event.data.forEach((action) => {
            if (Object.prototype.hasOwnProperty.call(this.controllers, action.id)) {
                this.controllers[action.id].changeValue(null, action.value1);
            }
        });
    }
}

module.exports = NikoHomeControlPlatform;
