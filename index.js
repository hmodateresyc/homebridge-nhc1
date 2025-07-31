'use strict'

const NikoHomeControlPlatform = require('./lib/NikoHomeControlPlatform')

module.exports = function (homebridge) {
  homebridge.registerPlatform('homebridge-nhc1', 'NikoHomeControleFix', NikoHomeControlPlatform, true)
}
