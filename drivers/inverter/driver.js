"use strict";

const Homey = require('homey');

class InverterDriver extends Homey.Driver {

  onInit() {
    this.log('Solaredge Inverter driver has been initialized');
    
}
}

module.exports = InverterDriver;
