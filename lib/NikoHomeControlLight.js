'use strict';

class NikoHomeControlLight {
    static Service;
    static Characteristic;
    static uuidGenerator;

    constructor(platform, action = null) {
        this.platform = platform;

        // Initialize static Service and Characteristic if not already set
        if (!NikoHomeControlLight.Service) {
            NikoHomeControlLight.Service = platform.api.hap.Service;
            NikoHomeControlLight.Characteristic = platform.api.hap.Characteristic;
            NikoHomeControlLight.uuidGenerator = platform.api.hap.uuid;
        }

        const uuid = NikoHomeControlLight.generateUUID(action.name, action.id);
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
        this._value = this.convertValue(action.value1);
    }

    static generateUUID(name, id) {
        return NikoHomeControlLight.uuidGenerator.generate(name + id);
    }

    createAccessory(action) {
        const uuid = NikoHomeControlLight.generateUUID(action.name, action.id);
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
            accessory.addService?.(NikoHomeControlLight.Service.Lightbulb, accessory.displayName);
        }

        accessory.getService?.(accessory.displayName)
            ?.getCharacteristic(NikoHomeControlLight.Characteristic.On)
            .on('get', this.getValue.bind(this))
            .on('set', this.setValue.bind(this))
            .on('change', this.changeValue.bind(this));
    }

    convertValue(value1) {
        return value1 === 100;
    }

    // --- Internal state accessors ---
    get id() {
        return this._id;
    }
    get value() {
        return this._value;
    }
    set value(val) {
        this._value = val;
    }

    identify(callback) {
        this.platform.log(this.accessory.displayName, "Identify!!!");

        const initialValue = this.value;

        if (initialValue === true) {
            this.platform.niko.executeActions(this.id, 0);
        } else {
            this.platform.niko.executeActions(this.id, 100);
        }

        setTimeout(() => {
            this.platform.niko.executeActions(this.id, initialValue);
        }, 2000);

        callback();
    }

    getValue(callback) {
        this.platform.log("Get " + this.accessory.displayName + " Light -> " + this.value);
        callback(null, this.value);
    }

    setValue(value, callback) {
        this.value = value;
        const actionValue = value ? 100 : 0;
        this.platform.niko.executeActions(this.id, actionValue);
        this.platform.log("Set " + this.accessory.displayName + " Light -> " + this.value);
        callback();
    }

    changeValue(oldValue, newValue) {
        if (newValue === undefined) {
            return;
        }

        const value = this.convertValue(newValue);

        if (this.value !== value) {
            this.value = value;
            this.platform.log("Change " + this.accessory.displayName + " Light -> " + this.value);
            this.accessory.getService?.(this.accessory.displayName)?.getCharacteristic(NikoHomeControlLight.Characteristic.On)?.updateValue(this.value);
        }
    }
}

module.exports = NikoHomeControlLight;
