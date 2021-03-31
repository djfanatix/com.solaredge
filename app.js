"use strict";

const Homey = require('homey');

class SolaredgeModbusApp extends Homey.App {

  onInit() {
    this.log('Initializing Solaredge Modbus app ...');
    this.log('Registering flows');
    new Homey.FlowCardTriggerDevice('changedConsumption').register();
      }
}

module.exports = SolaredgeModbusApp;


//    this.ownconsumption.register();
/*
    this.Homey.Flow.getcard('isOperationalStatus')
          .register()
          .registerRunListener((args, state) => {
            if (args.device.getCapabilityValue('status') == Homey.__('Off') && args.status == '1') {
              return Promise.resolve(true);
            } else if (args.device.getCapabilityValue('status') == Homey.__('Sleeping (auto-shutdown) – Night mode') && args.status == '2') {
              return Promise.resolve(true);
            } else if (args.device.getCapabilityValue('status') == Homey.__('Grid Monitoring/wake-up') && args.status == '3') {
              return Promise.resolve(true);
            } else if (args.device.getCapabilityValue('status') == Homey.__('Inverter is ON and producing power') && args.status == '4') {
              return Promise.resolve(true);
            } else if (args.device.getCapabilityValue('status') == Homey.__('Production (curtailed)') && args.status == '5') {
              return Promise.resolve(true);
            } else if (args.device.getCapabilityValue('status') == Homey.__('Shutting down') && args.status == '6') {
              return Promise.resolve(true);
            } else if (args.device.getCapabilityValue('status') == Homey.__('Fault') && args.status == '7') {
              return Promise.resolve(true);
            } else if (args.device.getCapabilityValue('status') == Homey.__('Maintenance/setup') && args.status == '8') {
              return Promise.resolve(true);
            } else {
              return Promise.resolve(false);
            }
          })
          */

          //   changedConsumptiontrigger.register().registerRunListener(async (args,state) => {return true});
