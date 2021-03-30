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

    // Register device triggers
    let triggers = [
      'changedStatus',
      'changedExportPower',
      'changedImportPower',
      'changedConsumption'
    ];
    this._registerFlow('trigger', triggers, Homey.FlowCardTriggerDevice);

    //Register conditions
  }

  triggerFlow(flow, tokens, device) {
    this.log(`Triggering flow '${flow}' with tokens`, tokens);

    if (this.flowCards[flow] instanceof Homey.FlowCardTriggerDevice) {
      this.log('- device trigger for ', device.getName());
      this.flowCards[flow].trigger(device, tokens);

    } else if (this.flowCards[flow] instanceof Homey.FlowCardTrigger) {
      this.log('- regular trigger');
      this.flowCards[flow].trigger(tokens);
    }
  }
}

module.exports = InverterDriver;
