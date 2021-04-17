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
    this._registerFlow('trigger', triggers, Homey.FlowCardTrigger);

    //Register conditions
  }

  _registerFlow(type, keys, cls) {
    keys.forEach(key => {
      this.log(`- flow '${type}.${key}'`);
      this.flowCards[`${type}.${key}`] = new cls(key).register();
    });
  }

  triggerFlow(flow, tokens, device) {
    this.log(`Triggering flow '${flow}' with tokens`, tokens);

    if (this.flowCards[flow] instanceof Homey.FlowCardTriggerCard) {
      this.log('- device trigger for ', device.getName());
      this.flowCards[flow].trigger(device, tokens);

    } else if (this.flowCards[flow] instanceof Homey.FlowCardTrigger) {
      this.log('- regular trigger');
      this.flowCards[flow].trigger(tokens);
    }
  }
}

module.exports = InverterDriver;
