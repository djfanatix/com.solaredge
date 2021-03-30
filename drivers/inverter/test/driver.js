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

    		//Register
    		triggers = [
          'isInverterDailyYield',
          'isInverterStatus'
    		];

module.exports = InverterDriver;
