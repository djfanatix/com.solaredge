"use strict";

const Homey = require('homey');

class InverterDriver extends Homey.Driver {

  onInit() {
    this.log('Solaredge Inverter driver has been initialized');

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
    triggers = [
      'isInverterDailyYield',
      'isInverterStatus'
    ];
    this._registerFlow('condition', triggers, Homey.FlowCardCondition);

    this.flowCards['condition.isInverterDailyYield']
      .registerRunListener((args, state, callback) => {
        this.log('Flow condition.isInverterDailyYield');
        this.log(`- inverter.dailyYield: ${args.device.getCapabilityValue('meter_power')}`);
        this.log(`- parameter yield: '${args.daily_yield}'`);

        if (args.device.getCapabilityValue('meter_power') > args.daily_yield) {
          return true;
        } else {
          return false;
        }
      });

    this.flowCards['condition.isInverterStatus']
      .registerRunListener((args, state, callback) => {
        this.log('Flow condition.isInverterStatus');
        this.log(`- inverter.status: ${args.device.getCapabilityValue('operational_status')}`);
        this.log(`- parameter status: '${args.inverter_status}'`);

        if (args.device.getCapabilityValue('operational_status').indexOf(args.inverter_status) > -1) {
          return true;
        } else {
          return false;
        }
      });

  }

  _registerFlow(type, keys, cls) {
    keys.forEach(key => {
      this.log(`- flow '${type}.${key}'`);
      this.flowCards[`${type}.${key}`] = new cls(key).register();
    });
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
