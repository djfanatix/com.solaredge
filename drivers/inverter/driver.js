"use strict";

const Homey = require('homey');

class InverterDriver extends Homey.Driver {

  onInit() {
    this.log('Solaredge Inverter driver has been initialized');
    this.flowCards = {};
        this._registerFlows();
      }
  _registerFlows() {
    this.log('Registering flows');

    let changedConsumptiontrigger = this.homey.flow.getTriggerCard('changedConsumption')
}
}

module.exports = InverterDriver;
