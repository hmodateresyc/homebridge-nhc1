'use strict';

function NikoHomeControlDimmer(platform, action = null) {
  this.platform = platform;

  // Use Homebridge API for Service and Characteristic
  this.Service = this.platform.api.hap.Service;
  this.Characteristic = this.platform.api.hap.Characteristic;

  var uuid = this.platform.api.hap.uuid.generate(action.name + action.id);
  var foundAccessory;

  this.platform.accessories.forEach((access) => {
    if (access.UUID == uuid) {
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
  this.accessory.value = this.convertValue(action.value1);
}

NikoHomeControlDimmer.prototype.createAccessory = function(action) {
  var uuid = this.platform.api.hap.uuid.generate(action.name + action.id);
  var PlateformAccessory = this.platform.api.platformAccessory;

  var accessory = new PlateformAccessory(action.name + action.id, uuid);

  this.updateAccessory(accessory, action);

  this.platform.accessories.push(accessory);
  this.platform.api.registerPlatformAccessories("homebridge-NikoHomeControl", "NikoHomeControl", [accessory]);

  return accessory;
}

NikoHomeControlDimmer.prototype.updateAccessory = function(accessory, action) {
  accessory.on('identify', this.identify.bind(this));

  var service = accessory.getService(accessory.displayName);

  if (service == undefined) {
    accessory.addService(this.Service.Lightbulb, accessory.displayName)
  }

  accessory.getService(accessory.displayName)
    .getCharacteristic(this.Characteristic.On)
    .on('get', this.getValue.bind(this))
    .on('set', this.setValue.bind(this))
    .on('change', this.changeValue.bind(this))
  ;

  accessory.getService(accessory.displayName)
    .getCharacteristic(this.Characteristic.Brightness)
    .on('get', this.getBrightness.bind(this))
    .on('set', this.setBrightness.bind(this))
    .on('change', this.changeValue.bind(this))
  ;
}

NikoHomeControlDimmer.prototype.convertValue = function(value1) {
  var value = value1

  if (value1 === true) {
    value = 100;
  } else if (value1 === false) {
    value = 0;
  }

  return value;
}

NikoHomeControlDimmer.prototype.identify = function(callback) {
  this.platform.log(this.accessory.displayName, "Identify!!!");

  var initialValue = this.accessory.value;
  var that = this;

  if (initialValue > 0) {
      this.platform.niko.executeActions(this.accessory._id, 0);
  } else {
      this.platform.niko.executeActions(this.accessory._id, 100);
  }

  setTimeout(function() {
      that.platform.niko.executeActions(that.accessory._id, initialValue);
    },
  2000);

  callback();
}

NikoHomeControlDimmer.prototype.getValue = function(callback) {
  this.platform.log("Get " + this.accessory.displayName + " Dimmer -> " + this.accessory.value);

  callback(null, this.accessory.value > 0);
}

NikoHomeControlDimmer.prototype.setValue = function(value, callback) {
  if (value === true && this.accessory.value === 0) {
    this.platform.niko.executeActions(this.accessory._id, 100);
  } else if (value === false && this.accessory.value > 0) {
    this.platform.niko.executeActions(this.accessory._id, 0);
  }

  callback();
}

NikoHomeControlDimmer.prototype.getBrightness = function(callback) {
  this.platform.log("Get Brightness " + this.accessory.displayName + " Dimmer -> " + this.accessory.value);

  callback(null, this.accessory.value);
}

NikoHomeControlDimmer.prototype.setBrightness = function(value, callback) {
  this.accessory.value = value;

  this.platform.niko.executeActions(this.accessory._id, value);
  this.platform.log("Set Brightness " + this.accessory.displayName + " Dimmer -> " + this.accessory.value);

  callback();
}

NikoHomeControlDimmer.prototype.changeValue = function(oldValue, newValue) {
  if (newValue === undefined) {
    return;
  }

  var value = this.convertValue(newValue);

  if (this.accessory.value !== value) {
    this.accessory.value = value;

    this.platform.log("Change " + this.accessory.displayName + " Dimmer -> " + this.accessory.value);
    this.accessory.getService(this.accessory.displayName).getCharacteristic(this.Characteristic.Brightness).updateValue(this.accessory.value);
    if (value == 0) {
      this.accessory.getService(this.accessory.displayName).getCharacteristic(this.Characteristic.On).updateValue(false);
    }
    if (value != 0) {
      this.accessory.getService(this.accessory.displayName).getCharacteristic(this.Characteristic.On).updateValue(true);
    }
  }
}

module.exports = NikoHomeControlDimmer
