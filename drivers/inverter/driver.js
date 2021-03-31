"use strict";

const Homey = require('homey');

class InverterDriver extends Homey.Driver {

  onInit() {
    this.log('Solaredge Inverter driver has been initialized');
    this.log('Registering flows');
    let changedConsumptiontrigger = this.homey.flow.getTriggerCard('changedConsumption').register()
}
}

module.exports = InverterDriver;
