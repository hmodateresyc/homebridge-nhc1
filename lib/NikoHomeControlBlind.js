'use strict';

class NikoHomeControlBlind {
    constructor(platform, action = null) {
        this.platform = platform;

        // Use Homebridge API for Service and Characteristic
        this.Service = this.platform.api.hap.Service;
        this.Characteristic = this.platform.api.hap.Characteristic;

        const uuid = this.platform.api.hap.uuid.generate(action.name + action.id);
        let foundAccessory = null;

        this.platform.accessories.forEach((access) => {
            if (access.UUID === uuid) {
                foundAccessory = access;
            }
        });

        if (foundAccessory == null) {
            this.accessory = this.createAccessory(action);
        } else {
            this.accessory = foundAccessory;
            this.updateAccessory(this.accessory, action);
        }

        this.accessory._id = action.id;
        this.accessory.position = action.value1;
        this.accessory.target = action.value1;
        this.accessory.state = 2;
        this.accessory.time = 30;

        // Set custom time if defined in config
        this.platform.config.time.forEach((ActionTime) => {
            if (ActionTime.id === action.id) {
                this.accessory.time = ActionTime.time;
            }
        });

        this.running = false;
        this.timeout = null;
    }

    createAccessory(action) {
        const uuid = this.platform.api.hap.uuid.generate(action.name + action.id);
        const PlatformAccessory = this.platform.api.platformAccessory;

        const accessory = new PlatformAccessory(action.name + action.id, uuid);

        this.updateAccessory(accessory, action);

        this.platform.accessories.push(accessory);
        this.platform.api.registerPlatformAccessories("homebridge-NikoHomeControl", "NikoHomeControl", [accessory]);

        return accessory;
    }

    updateAccessory(accessory, action) {
        accessory.on('identify', this.identify.bind(this));

        let service = accessory.getService(accessory.displayName);

        if (service === undefined) {
            accessory.addService(this.Service.WindowCovering, accessory.displayName);
        }

        accessory.getService(accessory.displayName)
            .getCharacteristic(this.Characteristic.PositionState)
            .on('get', this.getState.bind(this));

        accessory.getService(accessory.displayName)
            .getCharacteristic(this.Characteristic.CurrentPosition)
            .on('get', this.getPosition.bind(this));

        accessory.getService(accessory.displayName)
            .getCharacteristic(this.Characteristic.TargetPosition)
            .on('get', this.getTarget.bind(this))
            .on('set', this.setTarget.bind(this))
            .on('change', this.changeTarget.bind(this));
    }

    identify(callback) {
        this.platform.log(this.accessory.displayName, "Identify!!!");
        callback();
    }

    getState(callback) {
        this.platform.log("Get STATE " + this.accessory.displayName + " Blind -> " + this.accessory.state);
        callback(null, this.accessory.state);
    }

    getPosition(callback) {
        this.platform.log("Get Position " + this.accessory.displayName + " Blind -> " + this.accessory.position);
        callback(null, this.accessory.position);
    }

    getTarget(callback) {
        this.platform.log("Get Target " + this.accessory.displayName + " Blind -> " + this.accessory.target);
        callback(null, this.accessory.target);
    }

    setTarget(value, callback) {
        this.accessory.target = value;

        let actionValue;
        if (this.accessory.target < this.accessory.position) {
            actionValue = 254;
        } else {
            actionValue = 255;
        }

        this.running = true;
        this.platform.niko.executeActions(this.accessory._id, actionValue);
        this.platform.log("Set Target " + this.accessory.displayName + " Blind -> " + this.accessory.target);

        callback();
    }

    move() {
        this.platform.log('move position => ', this.accessory.position, this.accessory.target);
        let direction;

        if (this.accessory.target > this.accessory.position) {
            direction = 1;
        } else {
            direction = -1;
        }
        if (Math.abs(this.accessory.target - this.accessory.position) > 0) {
            this.accessory.position += direction;
            this.timeout = setTimeout(() => {
                this.move();
            }, this.accessory.time * 10);
        } else {
            this.platform.log('DONE');
            this.running = false;
            this.platform.niko.executeActions(this.accessory._id, 253);
            this.accessory
                .getService(this.accessory.displayName)
                .getCharacteristic(this.Characteristic.CurrentPosition)
                .updateValue(this.accessory.position);
            this.accessory
                .getService(this.accessory.displayName)
                .getCharacteristic(this.Characteristic.PositionState)
                .updateValue(2);
        }
    }

    changeTarget(oldValue, newValue) {
        this.platform.log('CHANGE Target');
        if (newValue === undefined) {
            return;
        }

        // If initial value and not running, just update state
        if (oldValue === null && this.running === false) {
            this.accessory.position = newValue;
            this.accessory.target = newValue;
            this.accessory.state = 2;
            this.accessory.getService(this.accessory.displayName).getCharacteristic(this.Characteristic.CurrentPosition).updateValue(this.accessory.position);
            this.accessory.getService(this.accessory.displayName).getCharacteristic(this.Characteristic.TargetPosition).updateValue(this.accessory.target);
            this.accessory.getService(this.accessory.displayName).getCharacteristic(this.Characteristic.PositionState).updateValue(this.accessory.state);

            this.platform.log('EVENT');
            return;
        }

        clearTimeout(this.timeout);
        this.timeout = null;
        this.move();

        return;
    }

    changeValue(oldValue, newValue) {
        this.platform.log('CHANGE VALUE', oldValue, newValue);

        this.changeTarget(oldValue, newValue);
    }
}

module.exports = NikoHomeControlBlind;
