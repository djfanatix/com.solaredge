"use strict";

const Homey = require('homey');

class InverterDriver extends Homey.Driver {

  onInit() {
    new Homey.FlowCardTriggerDevice('changedStatus').register();
  }

}

module.exports = InverterDriver;
