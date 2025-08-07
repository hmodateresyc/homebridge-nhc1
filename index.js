'use strict'

const NikoHomeControlPlatform = require('./lib/NikoHomeControlPlatform')

module.exports = function (homebridge) {
  homebridge.registerPlatform('homebridge-NikoHomeControl', 'NikoHomeControl', NikoHomeControlPlatform, true)
}
