'use strict';

const Homey = require('homey');
const { ManagerDrivers } = require('homey');

class StorEdgeDevice extends Homey.Device {

  onInit() {
    this.log('StorEdge device has been initialized');

        this.pollIntervals = [];
        this.summary = {
            name: this.getName(),
            polling: this.getSettings().polling
        };
        this._initilializeTimers();
        //Onitit
        this.setStoreValue('remotecontrolset', 10);
        this.setStoreValue('controlmodeset', 10);
        this.setStoreValue('chargepower', 6600);
        this.setStoreValue('dischargepower', 6600);
        this.addCapability('storagemode')
        this.addCapability('remotecontrol')
        this.addCapability('measure_power.chargesetting')
        this.addCapability('measure_power.dischargesetting')


        //FlowCardAction for Control Mode
      let controlAction = new Homey.FlowCardAction('setcontrolmode');
      controlAction
      .register()
      .registerRunListener(( args, state ) => {
            this.log('Change Storage Control Mode')
            var setcontrolmode = args['controlmode'];
          //  this.log('argsparsed', setcontrolmode);
           let controlmodeSet = this.getcontrolmode(setcontrolmode);
           return Promise.resolve(controlmodeSet);
      })
      //FlowCardAction for Remote control
    let controlAction1 = new Homey.FlowCardAction('setremotecontrol');
    controlAction1
    .register()
    .registerRunListener(( args, state ) => {
          this.log('Change Storage Remote Control')
          var setremotecontrol = args['remotecontrol'];
          //this.log('argsparsed', setcontrolmode);
          let remotecontrolset = this.getremotecontrol(setremotecontrol);
          return Promise.resolve(remotecontrolset);
    })
    //FlowCardAction for Charging
  let controlAction2 = new Homey.FlowCardAction('setcharging');
  controlAction2
  .register()
  .registerRunListener(( args, state ) => {
        this.log('Change Charge Limit')
        var setcharging = args['chargepower'];
        this.log('argsparsed- chargepower', setcharging);
       let setchargingpower = this.getcharging(setcharging);
        return Promise.resolve(setchargingpower);
  })
  //FlowCardAction for DisCharging
let controlAction3 = new Homey.FlowCardAction('setdischarging');
controlAction3
.register()
.registerRunListener(( args, state ) => {
      this.log('Change Discharge Limit')
      var setdischarging = args['dischargepower'];

    //  this.log('argsparsed- chargepower', setcharging);
     let setdischargingpower = this.getdischarging(setdischarging);
     return Promise.resolve(setdischargingpower);
})
    // checken of die functie verwijzing nodig is???
    }
/////// Change Control Mode///////////
        getremotecontrol(setremotecontrol) {
        this.setStoreValue('remotecontrolset', setremotecontrol);
        //  this.log('Start Set Control Mode');
        }

        getcontrolmode(setcontrolmode) {
          this.setStoreValue('controlmodeset', setcontrolmode);
          //  this.log('Start Set Control Mode');
          }

  /////////
// Charging Script
// STATUS
        getcharging(setcharging) {
      //this.log('Start Charge power setting');
          this.setStoreValue('chargepower', setcharging);
      }
///
/////////
// Disharging Script
// STATUS
      getdischarging(setdischarging) {
  //this.log('Start Discharge power setting');
      this.setStoreValue('dischargepower', setdischarging);
      }
///

    updateValues() {
      // power
       let power = 0;
       ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
         power = inverter.getStoreValue('battpower');
       });
       //Charge
       if (power > 0) {
      var charge = power;
      this._updateProperty('measure_power.discharge', 0);
      this._updateProperty('measure_power.charge', power);
       }
       else {
         var discharge = (0 - power);
         this._updateProperty('measure_power.discharge', discharge);
         this._updateProperty('measure_power.charge', 0);
       }
          //triggers
          if (this.getCapabilityValue('measure_power.charge') != charge) {
            Homey.ManagerFlow.getCard('trigger', 'changedBatteryCharging').trigger(this, { charging: charge }, {});
          }
          if (this.getCapabilityValue('measure_power.discharge') != discharge) {
            Homey.ManagerFlow.getCard('trigger', 'changedBatteryCharging').trigger(this, { discharging: discharge }, {});
          }

      //SOC
      let soc = 0;
      ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
        soc = inverter.getStoreValue('soc');
      });
       this._updateProperty('battery', soc);
       this._updateProperty('measure_battery', soc);
          //triggers
         if (this.getCapabilityValue('battery') != soc) {
           Homey.ManagerFlow.getCard('trigger', 'changedBattery').trigger(this, { charge: soc }, {});
         }

      //SOH
      let soh = 0;
      ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
        soh = inverter.getStoreValue('soh');
      });
       this._updateProperty('batterysoh', soh);

       //energy
       let energy = 0;
       ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
         energy = inverter.getStoreValue('currentenergy');
       });
        this._updateProperty('battery_capacity', energy);

        //temp
        let temp = 0;
        ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
          temp = inverter.getStoreValue('avgtemp');
        });
         this._updateProperty('measure_temperature', temp);


      // STATUS
      var battstatus = 0;
      ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
        battstatus = inverter.getStoreValue('battstatus');
        });
      if (this.getCapabilityValue('batterystatus') != Homey.__('Off') &&battstatus == 1) {
        this.setCapabilityValue('batterystatus', Homey.__('Off'));
        Homey.ManagerFlow.getCard('trigger', 'changedbatStatus').trigger(this, { status: Homey.__('Off') }, {});
      } else if (this.getCapabilityValue('batterystatus') != Homey.__('Empty') && battstatus == 2) {
        this.setCapabilityValue('batterystatus', Homey.__('Empty'));
        Homey.ManagerFlow.getCard('trigger', 'changedbatStatus').trigger(this, { status: Homey.__('Empty') }, {});
      } else if (this.getCapabilityValue('batterystatus') != Homey.__('Charging') && battstatus == 3) {
        this.setCapabilityValue('batterystatus', Homey.__('Charging'));
        Homey.ManagerFlow.getCard('trigger', 'changedbatStatus').trigger(this, { status: Homey.__('Charging') }, {});
      } else if (this.getCapabilityValue('batterystatus') != Homey.__('Discharging') && battstatus == 4) {
        this.setCapabilityValue('batterystatus', Homey.__('Discharging'));
        Homey.ManagerFlow.getCard('trigger', 'changedbatStatus').trigger(this, { status: Homey.__('Discharging') }, {});
      } else if (this.getCapabilityValue('batterystatus') != Homey.__('Full') && battstatus == 5) {
        this.setCapabilityValue('batterystatus', Homey.__('Full'));
        Homey.ManagerFlow.getCard('trigger', 'changedbatStatus').trigger(this, { status: Homey.__('Full') }, {});
      } else if (this.getCapabilityValue('batterystatus') != Homey.__('Holding') && battstatus == 6) {
        this.setCapabilityValue('batterystatus', Homey.__('Holding'));
        Homey.ManagerFlow.getCard('trigger', 'changedbatStatus').trigger(this, { status: Homey.__('Holding') }, {});
      } else if (this.getCapabilityValue('batterystatus') != Homey.__('Testing') && battstatus == 7) {
        this.setCapabilityValue('batterystatus', Homey.__('Testing'));
        Homey.ManagerFlow.getCard('trigger', 'changedbatStatus').trigger(this, { status: Homey.__('Testing') }, {});
      }

      //
      // STORAGEMODE
      var storagemode = 0;
      ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
        storagemode = inverter.getStoreValue('storagecontrol');
        });
      if (this.getCapabilityValue('storagemode') != Homey.__('Off') &&storagemode == 0) {
        this.setCapabilityValue('storagemode', Homey.__('Off'));
      } else if (this.getCapabilityValue('storagemode') != Homey.__('Self Consumption') && storagemode == 1) {
        this.setCapabilityValue('storagemode', Homey.__('Self Consumption'));
      } else if (this.getCapabilityValue('storagemode') != Homey.__('Time of Use') && storagemode == 2) {
        this.setCapabilityValue('storagemode', Homey.__('Time of Use'));
      } else if (this.getCapabilityValue('storagemode') != Homey.__('Backup') && storagemode == 3) {
        this.setCapabilityValue('storagemode', Homey.__('Backup'));
      } else if (this.getCapabilityValue('storagemode') != Homey.__('Remote Control') && storagemode == 4) {
        this.setCapabilityValue('storagemode', Homey.__('Remote Control'));
      }
      /*
      0 – Disabled
      1 – Maximize Self Consumption
      2 – Time of Use (Profile programming)
      3 – Backup Only
      4 – Remote Control – the battery charge/discharge state is controlled by an external controller
      */
      // einde

      // REMOTE CONTROL
      var remotecontrol = 0;
      ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
        remotecontrol = inverter.getStoreValue('storagecommand');
        });
      if (this.getCapabilityValue('remotecontrol') != Homey.__('Off') &&remotecontrol == 0) {
        this.setCapabilityValue('remotecontrol', Homey.__('Off'));
      } else if (this.getCapabilityValue('remotecontrol') != Homey.__('Charge excess PV') && remotecontrol == 1) {
        this.setCapabilityValue('remotecontrol', Homey.__('Charge excess PV'));
      } else if (this.getCapabilityValue('remotecontrol') != Homey.__('Max charge from PV') && remotecontrol == 2) {
        this.setCapabilityValue('remotecontrol', Homey.__('Max charge from PV'));
      } else if (this.getCapabilityValue('remotecontrol') != Homey.__('Charge from PV+AC') && remotecontrol == 3) {
        this.setCapabilityValue('remotecontrol', Homey.__('Charge from PV+AC'));
      } else if (this.getCapabilityValue('remotecontrol') != Homey.__('Max Discharge') && remotecontrol == 4) {
        this.setCapabilityValue('remotecontrol', Homey.__('Max Discharge'));
      } else if (this.getCapabilityValue('remotecontrol') != Homey.__('Discharge for consumption') && remotecontrol == 5) {
        this.setCapabilityValue('remotecontrol', Homey.__('Discharge for consumption'));
      } else if (this.getCapabilityValue('remotecontrol') != Homey.__('Not in Use') && remotecontrol == 6) {
        this.setCapabilityValue('remotecontrol', Homey.__('Not in Use'));
      } else if (this.getCapabilityValue('remotecontrol') != Homey.__('Max Self Consumption') && remotecontrol == 7) {
        this.setCapabilityValue('remotecontrol', Homey.__('Max Self Consumption'));
      }
      /*
      Storage Charge/Discharge default Mode sets the default mode of operation when Remote Control Command Timeout has expired. The supported Charge/Discharge Modes are as follows:
  0 – Off
  1 – Charge excess PV power only.
  Only PV excess power not going to AC is used for charging the battery. Inverter NominalActivePowerLimit (or the inverter rated power whichever is lower) sets how much power the inverter is producing to the AC. In this mode, the battery cannot be discharged. If the PV power is lower than NominalActivePowerLimit the AC production will be equal to the PV power.
  2 – Charge from PV first, before producing power to the AC.
  The Battery charge has higher priority than AC production. First charge the battery then produce AC.
  If StorageRemoteCtrl_ChargeLimit is lower than PV excess power goes to AC according to NominalActivePowerLimit. If NominalActivePowerLimit is reached and battery StorageRemoteCtrl_ChargeLimit is reached, PV power is curtailed.
  3 – Charge from PV+AC according to the max battery power.
  Charge from both PV and AC with priority on PV power.
  If PV production is lower than StorageRemoteCtrl_ChargeLimit, the battery will be charged from AC up to NominalActivePow-erLimit. In this case AC power = StorageRemoteCtrl_ChargeLimit- PVpower.
  If PV power is larger than StorageRemoteCtrl_ChargeLimit the excess PV power will be directed to the AC up to the Nominal-ActivePowerLimit beyond which the PV is curtailed.
  4 – Maximize export – discharge battery to meet max inverter AC limit.
  AC power is maintained to NominalActivePowerLimit, using PV power and/or battery power. If the PV power is not sufficient, battery power is used to complement AC power up to StorageRemoteCtrl_DishargeLimit. In this mode, charging excess power will occur if there is more PV than the AC limit.
  5 – Discharge to meet loads consumption. Discharging to the grid is not allowed.
  7 – Maximize self-consumption
      */
      // einde

      // DisCharge Power setting

      let dischargesetting = 0;
      ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
        dischargesetting = inverter.getStoreValue('storagedischargelimit');
      });
       this._updateProperty('measure_power.dischargesetting', dischargesetting);
      // Charge Power setting

      let chargesetting = 0;
      ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
        chargesetting = inverter.getStoreValue('storagechargelimit');
      });
       this._updateProperty('measure_power.chargesetting', chargesetting);


    }

    _initilializeTimers() {
        this.log('Adding timers');
        this.pollIntervals.push(setInterval(() => {
            this.updateValues();
        }, 1000 * this.summary.polling));
    }

    _deleteTimers() {
        //Kill interval object(s)
        this.log('Removing timers');
        this.pollIntervals.forEach(timer => {
            clearInterval(timer);
        });
    }

    _reinitializeTimers() {
        this._deleteTimers();
        this._initilializeTimers();
    }

    _updateProperty(key, value) {
        if (this.hasCapability(key)) {
            let oldValue = this.getCapabilityValue(key);
            if (oldValue !== null && oldValue != value) {
                this.setCapabilityValue(key, value);
                //Placeholder for trigger logic

            } else {
                this.setCapabilityValue(key, value);
            }
        }
    }

    onDeleted() {
        this.log(`Deleting StorEdge '${this.getName()}' from Homey.`);
        this._deleteTimers();
    }

    async onSettings(oldSettings, newSettings, changedKeysArr) {

        if (changedKeysArr.indexOf("polling") > -1) {
            this.log('Polling value was change to:', newSettings.polling);
            this.summary.polling = newSettings.polling;
            this._reinitializeTimers();
        }
    }
    }
module.exports = StorEdgeDevice;
'batterystatus'
