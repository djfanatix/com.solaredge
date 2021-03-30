"use strict";

const Homey = require('homey');

class SolaredgeModbusApp extends Homey.App {

  onInit() {
    this.log('Initializing Solaredge Modbus app ...');
}
}

module.exports = SolaredgeModbusApp;
