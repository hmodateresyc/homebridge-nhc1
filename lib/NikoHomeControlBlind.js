'use strict';

class NikoHomeControlBlind {
    static Service;
    static Characteristic;
    static uuidGenerator;

    constructor(platform, action = null) {
        this.platform = platform;

        // Initialize static Service and Characteristic if not already set
        if (!NikoHomeControlBlind.Service) {
            NikoHomeControlBlind.Service = platform.api.hap.Service;
            NikoHomeControlBlind.Characteristic = platform.api.hap.Characteristic;
            NikoHomeControlBlind.uuidGenerator = platform.api.hap.uuid;
        }

        const uuid = NikoHomeControlBlind.generateUUID(action.name, action.id);
        let foundAccessory = null;

        this.platform.accessories?.forEach((access) => {
            if (access?.UUID === uuid) {
                foundAccessory = access;
            }
        });

        if (foundAccessory == null) {
            this.accessory = this.createAccessory(action);
        } else {
            this.accessory = foundAccessory;
            this.updateAccessory(this.accessory, action);
        }

        // Internal state
        this._id = action.id;
        this._position = action.value1;
        this._target = action.value1;
        this._state = 2;
        this._time = 30;

        // Set custom time if defined in config
        this.platform.config?.time?.forEach((ActionTime) => {
            if (ActionTime?.id === action.id) {
                this._time = ActionTime.time;
            }
        });

        this.running = false;
        this.timeout = null;
    }

    static generateUUID(name, id) {
        return NikoHomeControlBlind.uuidGenerator.generate(name + id);
    }

    createAccessory(action) {
        const uuid = NikoHomeControlBlind.generateUUID(action.name, action.id);
        const PlatformAccessory = this.platform.api?.platformAccessory;

        const accessory = new PlatformAccessory(action.name + action.id, uuid);

        this.updateAccessory(accessory, action);

        this.platform.accessories?.push(accessory);
        this.platform.api?.registerPlatformAccessories("homebridge-NikoHomeControl", "NikoHomeControl", [accessory]);

        return accessory;
    }

    updateAccessory(accessory, action) {
        accessory.on('identify', this.identify.bind(this));

        let service = accessory.getService?.(accessory.displayName);

        if (service === undefined) {
            accessory.addService?.(NikoHomeControlBlind.Service.WindowCovering, accessory.displayName);
        }

        accessory.getService?.(accessory.displayName)
            ?.getCharacteristic(NikoHomeControlBlind.Characteristic.PositionState)
            .on('get', this.getState.bind(this));

        accessory.getService?.(accessory.displayName)
            ?.getCharacteristic(NikoHomeControlBlind.Characteristic.CurrentPosition)
            .on('get', this.getPosition.bind(this));

        accessory.getService?.(accessory.displayName)
            ?.getCharacteristic(NikoHomeControlBlind.Characteristic.TargetPosition)
            .on('get', this.getTarget.bind(this))
            .on('set', this.setTarget.bind(this))
            .on('change', this.changeTarget.bind(this));
    }

    // --- Internal state accessors ---
    get id() {
        return this._id;
    }
    get position() {
        return this._position;
    }
    set position(val) {
        this._position = val;
    }
    get target() {
        return this._target;
    }
    set target(val) {
        this._target = val;
    }
    get state() {
        return this._state;
    }
    set state(val) {
        this._state = val;
    }
    get time() {
        return this._time;
    }
    set time(val) {
        this._time = val;
    }

    // --- Methods ---
    identify(callback) {
        this.platform.log(this.accessory.displayName, "Identify!!!");
        callback();
    }

    getState(callback) {
        this.platform.log("Get STATE " + this.accessory.displayName + " Blind -> " + this.state);
        callback(null, this.state);
    }

    getPosition(callback) {
        this.platform.log("Get Position " + this.accessory.displayName + " Blind -> " + this.position);
        callback(null, this.position);
    }

    getTarget(callback) {
        this.platform.log("Get Target " + this.accessory.displayName + " Blind -> " + this.target);
        callback(null, this.target);
    }

    setTarget(value, callback) {
        this.target = value;

        const actionValue = (this.target < this.position) ? 254 : 255;

        this.running = true;
        this.platform.niko.executeActions(this.id, actionValue);
        this.platform.log("Set Target " + this.accessory.displayName + " Blind -> " + this.target);

        callback();
    }

    move() {
        this.platform.log('move position => ', this.position, this.target);
        const direction = (this.target > this.position) ? 1 : -1;
        if (Math.abs(this.target - this.position) > 0) {
            this.position += direction;
            this.timeout = setTimeout(() => {
                this.move();
            }, this.time * 10);
        } else {
            this.platform.log('DONE');
            this.running = false;
            this.platform.niko.executeActions(this.id, 253);
            this.accessory
                .getService?.(this.accessory.displayName)
                ?.getCharacteristic(NikoHomeControlBlind.Characteristic.CurrentPosition)
                ?.updateValue(this.position);
            this.accessory
                .getService?.(this.accessory.displayName)
                ?.getCharacteristic(NikoHomeControlBlind.Characteristic.PositionState)
                ?.updateValue(2);
        }
    }

    changeTarget(oldValue, newValue) {
        this.platform.log('CHANGE Target');
        if (newValue === undefined) {
            return;
        }

        // If initial value and not running, just update state
        if (oldValue === null && this.running === false) {
            this.position = newValue;
            this.target = newValue;
            this.state = 2;
            this.accessory.getService?.(this.accessory.displayName)?.getCharacteristic(NikoHomeControlBlind.Characteristic.CurrentPosition)?.updateValue(this.position);
            this.accessory.getService?.(this.accessory.displayName)?.getCharacteristic(NikoHomeControlBlind.Characteristic.TargetPosition)?.updateValue(this.target);
            this.accessory.getService?.(this.accessory.displayName)?.getCharacteristic(NikoHomeControlBlind.Characteristic.PositionState)?.updateValue(this.state);

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
