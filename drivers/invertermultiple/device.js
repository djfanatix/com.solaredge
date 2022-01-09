'use strict';

const Homey = require('homey');
const modbus = require('jsmodbus');
const net = require('net');
const decodeData = require('../../lib/decodeData.js');
const socket = new net.Socket();
const { ManagerDrivers } = require('homey');
var EventEmitter = require('events');

class SolaredgeModbusDevice extends Homey.Device {

  onInit() {

    if (this.getClass() !== 'solarpanel') {
      this.setClass('solarpanel');
    }
    // fix for settings
    var timeout = this.getSetting('reconnectTimeout');
    if (timeout > 4000) {
      var timeout = (timeout / 1000);
    }
    this.setSettings({

          reconnectTimeout: timeout,
        });

    let options = {
      'host': this.getSetting('address'),
      'port': this.getSetting('port'),
      'unitId': this.getSetting('id'),
      'timeout': this.getSetting('reconnectTimeout'),
      'autoReconnect': false,
      'reconnectTimeout': this.getSetting('polling'),
      'logLabel' : 'solaredge Inverter',
      'logLevel': 'error',
      'logEnabled': true
    }

    //'unitId': this.getSetting('id'),
    //set scale to zero at init
    this.setStoreValue('oldscale', 0);


    // Capabilities for meter NOT INSTALLED
      //var meterinstalled = this.getSetting('meter');
      //var storedgeinstalled = this.getSetting('storedge');

    var meterinstalled = false;
    var storedgeinstalled = false;
    if (meterinstalled != true && this.hasCapability('measure_power.ac')){
      this.removeCapability('measure_power.ac')};
    if (meterinstalled != true && this.hasCapability('ownconsumption')){
        this.removeCapability('ownconsumption')};
    if (meterinstalled != true && this.hasCapability('powergrid_import')){
        this.removeCapability('powergrid_import')};
    if (meterinstalled != true && this.hasCapability('powergrid_export')){
        this.removeCapability('powergrid_export')};
    if (meterinstalled != true && this.hasCapability('meter_power.export')){
        this.removeCapability('meter_power.export')};
    if (meterinstalled != true && this.hasCapability('meter_power.import')){
        this.removeCapability('meter_power.import')};
    if (meterinstalled != true && this.hasCapability('measure_voltage.meter')){
        this.removeCapability('measure_voltage.meter')};
    if (meterinstalled != true){this.addCapability('measure_voltage.dc')};
    if (meterinstalled != true){this.addCapability('measure_temperature')};

  // Capabilities for meter INSTALLED
    if (meterinstalled === true) {
      this.addCapability('ownconsumption'),
      this.addCapability('powergrid_import'),
      this.addCapability('powergrid_export'),
      this.addCapability('status'),
      this.addCapability('meter_power'),
      this.addCapability('meter_power.import'),
      this.addCapability('meter_power.export'),
      this.addCapability('measure_voltage.meter'),
      this.addCapability('measure_voltage.dc'),
      this.addCapability('measure_temperature')
    };
    //Measure power AC
    if (storedgeinstalled === true && meterinstalled === true) {
      this.addCapability('measure_power.ac')
    }
    else {this.removeCapability('measure_power.ac')
  };

    // Changing of Capabilities --> Temp fix
    if (this.hasCapability('total_import')){
        this.removeCapability('total_import')};
    if (this.hasCapability('total_export')){
        this.removeCapability('total_export')};
    if (this.hasCapability('measure_voltage')){
        this.removeCapability('measure_voltage')};

// Start app and IF
    var unitID = this.getSetting('id');

// Set timeout
    var timeout = unitID * 5000;
    this.log('timout', timeout);
    var self = this;

    //self.socket.connect(options);
//
    let client = new modbus.client.TCP(socket, unitID)
    setTimeout(() => {
      socket.connect(options);
      this.log('Delay connecting ...');
    },timeout)

    socket.on('connect', () => {

      this.log('Connected ...');
      this.setStoreValue('connected', 1);
      if (!this.getAvailable()) {
        this.setAvailable();
      }



// start normale poll
        Promise.all([
          client.readHoldingRegisters(40083, 1),  //0 powerac
          client.readHoldingRegisters(40093, 2),  //1 total generated power
          client.readHoldingRegisters(40084, 1),  //2 powerscale AC
          client.readHoldingRegisters(40107, 1),  //3 status
          client.readHoldingRegisters(40095, 1),  //4 Scale factor totaal
          client.readHoldingRegisters(40098, 1),  //5 DC power int16
          client.readHoldingRegisters(40099, 1),  //6 DC Scale factor uint16
          client.readHoldingRegisters(40103, 1),  //7 Temperature
          client.readHoldingRegisters(40106, 1)   //8 Temperature scale factor

        ]).then((results) => {
        //  var powerac = results[0].response._body._valuesAsArray[0];
          var total = results[1].response._body._valuesAsBuffer;
        //  var powerscale1 = results[2].response._body._valuesAsBuffer;
          var inverterstatus= results[3].response._body._valuesAsArray[0];
          var totalscale = results[4].response._body._valuesAsBuffer;
          var powerdc = results[5].response._body._valuesAsArray[0];
          var dcscale = results[6].response._body._valuesAsBuffer;
          var temperature = results[7].response._body._valuesAsArray[0];
          var temperaturescale = results[8].response._body._valuesAsBuffer;

          // POWER DC conversion
          var dcscale = dcscale.readInt16BE();
          // this.log('DC Power RAW', powerdc)
          var dcpower = powerdc*(Math.pow(10, dcscale));
          this.setCapabilityValue('measure_voltage.dc', dcpower);

          // Heatsink Temperature
          var temperaturescale = temperaturescale.readInt16BE();
          // this.log('temperatuur RAW', temperature)
          var temperature = temperature*(Math.pow(10, temperaturescale));
          this.setCapabilityValue('measure_temperature', temperature);

          /* TOTAL YIELD */
          // Total power = acc32
          var totalscale = totalscale.readInt16BE();
          var total = total.readUInt32BE();
          var total = total*(Math.pow(10, totalscale));
          var total = total / 1000;
          this.setCapabilityValue('meter_power', total);

          // STATUS
          if (this.getCapabilityValue('status') != Homey.__('Off') && inverterstatus == 1) {
            this.setCapabilityValue('status', Homey.__('Off'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus1').trigger(this, { status: Homey.__('Off') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Sleeping') && inverterstatus == 2) {
            this.setCapabilityValue('status', Homey.__('Sleeping'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus1').trigger(this, { status: Homey.__('Sleeping') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Wake up') && inverterstatus == 3) {
            this.setCapabilityValue('status', Homey.__('Wake up'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus1').trigger(this, { status: Homey.__('Wake up') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Producing') && inverterstatus == 4) {
            this.setCapabilityValue('status', Homey.__('Producing'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus1').trigger(this, { status: Homey.__('Producing') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Throttled') && inverterstatus == 5) {
            this.setCapabilityValue('status', Homey.__('Throttled'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus1').trigger(this, { status: Homey.__('Throttled') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Shutting down') && inverterstatus == 6) {
            this.setCapabilityValue('status', Homey.__('Shutting down'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus1').trigger(this, { status: Homey.__('Shutting down') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Fault') && inverterstatus == 7) {
            this.setCapabilityValue('status', Homey.__('Fault'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus1').trigger(this, { status: Homey.__('Fault') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Maintenance') && inverterstatus == 8) {
          this.setCapabilityValue('status', Homey.__('Maintenance'));
          Homey.ManagerFlow.getCard('trigger', 'changedStatus1').trigger(this, { status: Homey.__('Maintenance') }, {});
          }

          //errors
        }).catch((err) => {
          this.log(err);
        })
        // AC POWER
        var storedgeinstalled = this.getSetting('storedge');
        this.log('Storedge installed?', storedgeinstalled);
        if (storedgeinstalled === true) {
        }
        else {
        Promise.all([
          // POWER AC without StorEdge
          client.readHoldingRegisters(40083, 1),  //0 powerac
          client.readHoldingRegisters(40084, 1),  //1 powerscale AC

        ]).then((results) => {
          var powerac = results[0].response._body._valuesAsArray[0];
          var powerscale1 = results[1].response._body._valuesAsBuffer;

          // POWER AC conversion
          var powerscale = powerscale1.readInt16BE();
          var acpower = powerac*(Math.pow(10, powerscale));
          var acpower = Math.round(acpower);
          this.setCapabilityValue('measure_power', acpower);
          this.setStoreValue('acpower', acpower);
          this.log('AC POWER zonder storedge')

          //errors
        }).catch((err) => {
  this.log(err);
})}

        // METER INSTALLED?
        var meterinstalled = false;
        var storedgeinstalled = false;
        this.log('meter?', meterinstalled);
        if ((meterinstalled === true) && (storedgeinstalled === false)) {
          Promise.all([
            client.readHoldingRegisters(40206, 1), //0 importexport meter
            client.readHoldingRegisters(40210, 1), //1 powerscale importexport meter
            client.readHoldingRegisters(40226, 2), //2 total exported power
            client.readHoldingRegisters(40234, 2), //3 total imported power
            client.readHoldingRegisters(40242, 1), //4 Scale factor importexport
            client.readHoldingRegisters(40196, 1) //5 voltage

          ]).then((results) => {
            var powergrid = results[0].response._body._valuesAsArray[0];
            var meterscale = results[1].response._body._valuesAsBuffer;
            var totalexport = results[2].response._body._valuesAsBuffer;
            var totalimport = results[3].response._body._valuesAsBuffer;
            var impexpscale = results[4].response._body._valuesAsBuffer;
            var voltage = results[5].response._body._valuesAsArray[0];

            /* VOLTAGE */
            if (voltage === 65535) {
             this.setCapabilityValue('measure_voltage.meter', 0);
            } else {
              var volt = voltage / 100;
              this.setCapabilityValue('measure_voltage.meter', volt);
            }


            //Meterscale conversion
            var meterscale1 = meterscale.readInt16BE();
            var powergrid = powergrid*(Math.pow(10, meterscale1));
            var powergrid = Math.round(powergrid);

            /* TOTAL export */
            var impexpscale = impexpscale.readInt16BE();
            var totalexport = totalexport.readUInt32BE();
        //    var totalexport = totalexport*(Math.pow(10, (totalscale)));
            var totalexport = totalexport / 1000;
            this.setCapabilityValue('meter_power.export', totalexport);

            /* TOTAL import */
            var totalimport = totalimport.readUInt32BE();
        //    var totalimport1 = totalimport*(Math.pow(10, (impexpscale)));
            var totalimport = totalimport / 1000;
            this.setCapabilityValue('meter_power.import', totalimport);
            //  POWER
            var acpower = this.getStoreValue('acpower');
            if (powergrid > 32767) {
              var powergrid_export = 0;
              var powergrid_import = 65535 - powergrid;
              var ownconsumption = acpower + powergrid_import;
              this.setCapabilityValue('powergrid_export', powergrid_export);
              this.setCapabilityValue('powergrid_import', powergrid_import);
              this.setCapabilityValue('ownconsumption', ownconsumption);
              Homey.ManagerFlow.getCard('trigger', 'changedExportPower1').trigger(this, { export: powergrid_export }, {});
              Homey.ManagerFlow.getCard('trigger', 'changedImportPower1').trigger(this, { import: powergrid_import }, {});
              Homey.ManagerFlow.getCard('trigger', 'changedConsumption1').trigger(this, { consumption: ownconsumption }, {});
            }
            else {
              var powergrid_export = powergrid;
              var powergrid_import = 0;
              var ownconsumption = acpower - powergrid_export;
              this.setCapabilityValue('powergrid_export', powergrid_export);
              this.setCapabilityValue('powergrid_import', powergrid_import);
              this.setCapabilityValue('ownconsumption', ownconsumption);
              Homey.ManagerFlow.getCard('trigger', 'changedExportPower1').trigger(this, { export: powergrid_export }, {});
              Homey.ManagerFlow.getCard('trigger', 'changedImportPower1').trigger(this, { import: powergrid_import }, {});
              Homey.ManagerFlow.getCard('trigger', 'changedConsumption1').trigger(this, { consumption: ownconsumption }, {});
            }

            //errors
          }).catch((err) => {
    this.log(err);
  })}
      else {
      }
  //StorEdge

  var storedge = false;
  if (storedge != true) {this.log('geen storedge')
}
else {
  Promise.all([
    //Battery
    client.readHoldingRegisters(57716, 2), //0 battery power Watt
    client.readHoldingRegisters(57729, 2), //1 battery SOC %
    client.readHoldingRegisters(57732, 2), //2 Battery SOH %
    client.readHoldingRegisters(57726, 2),  //3 max Capacity Wh
    client.readHoldingRegisters(57728, 2),  //4 available Capacity Wh
    client.readHoldingRegisters(57666, 2),  //5 rated energy Wh
    client.readHoldingRegisters(57670, 2),  //6 max discharge continu W
    client.readHoldingRegisters(57718, 4),  //7 Lifetime export Wh
    client.readHoldingRegisters(57722, 4),  //8 Lifetime import Wh
    client.readHoldingRegisters(57734, 2),  //9 status - uint32
    client.readHoldingRegisters(57736, 2),  //10 status internal - uint32
    //Meter
    client.readHoldingRegisters(40206, 1), //11 importexport meter
    client.readHoldingRegisters(40210, 1), //12 powerscale importexport meter
    client.readHoldingRegisters(40226, 2), //13 total exported power
    client.readHoldingRegisters(40234, 2), //14 total imported power
    client.readHoldingRegisters(40242, 1), //15 Scale factor importexport
    client.readHoldingRegisters(40196, 1), //16 voltage
    //Power AC
    client.readHoldingRegisters(40083, 2),  //17 powerac
    client.readHoldingRegisters(40084, 1),  //18 powerscale AC
    //new parameters
    client.readHoldingRegisters(57708, 2),  //19 Avg temp
    //Storage control
    client.readHoldingRegisters(57348 , 1),  //20 Storage control module uint16
    client.readHoldingRegisters(57354 , 1), //21 Storage mode default uint16
    client.readHoldingRegisters(57355 , 2),  //22 Storage remote control Timeout uint32
    client.readHoldingRegisters(57357 , 1),  //23 Storage remote control Command Mode uint16
    client.readHoldingRegisters(57358 , 2),  //24 Storage remote control Charge limit Float32
    client.readHoldingRegisters(57360 , 2),  //25 Storage remote control DischargeCharge limit Float32
  ]).then((results) => {
    let batterypower = results[0].response._body._valuesAsBuffer;
    var soh = results[1].response._body._valuesAsBuffer;
    var soc = results[2].response._body._valuesAsBuffer;        //9280
    var maxcap = results[3].response._body._valuesAsBuffer;     //9800
    var cap = results[4].response._body._valuesAsBuffer;        //9310
    var energy = results[5].response._body._valuesAsBuffer;     //9310
    var battexport= results[7].response._body._valuesAsBuffer;
    var battimport = results[8].response._body._valuesAsBuffer;
    var battstatus = results[9].response._body._valuesAsArray[0];
    var battstatusint = results[10].response._body._valuesAsBuffer;
    //Meter
    var powergrid = results[11].response._body._valuesAsArray[0];
    var meterscale = results[12].response._body._valuesAsBuffer;
    var totalexport = results[13].response._body._valuesAsBuffer;
    var totalimport = results[14].response._body._valuesAsBuffer;
    var impexpscale = results[15].response._body._valuesAsBuffer;
    var voltage = results[16].response._body._valuesAsArray[0];
    //Power
    let powerac = results[17].response._body._valuesAsBuffer;
    let powerscalenotinuse = results[18].response._body._valuesAsBuffer;
    //test parameters
    var avgtemp = results[19].response._body._valuesAsBuffer;
    // Storage control
    var storagecontrol = results[20].response._body._valuesAsBuffer;
    var storagedefault = results[21].response._body._valuesAsBuffer;
    var timeout = results[22].response._body._valuesAsBuffer;
    var storagecommand = results[23].response._body._valuesAsBuffer;
    var storagechargelimit = results[24].response._body._valuesAsBuffer;
    var storagedischargelimit = results[25].response._body._valuesAsBuffer;


    //Meter
    // Battery Power
    var batterypower1 = Buffer.from(batterypower, 'hex').swap16().swap32().readFloatBE();
    this.setStoreValue('battpower', batterypower1);

    // POWER AC conversion
    let powerscale = powerac.readInt16BE(2);
    let acpower1 = powerac.readInt16BE();
    let acpower = acpower1*(Math.pow(10, powerscale));
    var solarpower = (acpower + batterypower1);
    var oldscale = this.getStoreValue('oldscale');

    //Meterscale conversion
    var meterscale1 = meterscale.readInt16BE();
    var powergrid = powergrid*(Math.pow(10, meterscale1));
    //var powergrid = Math.round(powergrid);

    //  POWER
    if (powergrid > 32767) {
      var powergrid_export = 0;
      var powergrid_import = 65535 - powergrid;
      var ownconsumption = acpower + powergrid_import;
      Homey.ManagerFlow.getCard('trigger', 'changedExportPower1').trigger(this, { export: powergrid_export }, {});
      Homey.ManagerFlow.getCard('trigger', 'changedImportPower1').trigger(this, { import: powergrid_import }, {});
      Homey.ManagerFlow.getCard('trigger', 'changedConsumption1').trigger(this, { consumption: ownconsumption }, {});
    }
    else {
      var powergrid_export = powergrid;
      var powergrid_import = 0;
      var ownconsumption = acpower - powergrid_export;
      Homey.ManagerFlow.getCard('trigger', 'changedExportPower1').trigger(this, { export: powergrid_export }, {});
      Homey.ManagerFlow.getCard('trigger', 'changedImportPower1').trigger(this, { import: powergrid_import }, {});
      Homey.ManagerFlow.getCard('trigger', 'changedConsumption1').trigger(this, { consumption: ownconsumption }, {});
    }

// avoid sub zero solar
        if (solarpower > 0) {
        this.setStoreValue('acpower', solarpower);
      }
      else {
        var solarpower = 0;
      }

//check for avoiding strange insights
      if (powerscale === oldscale) {
      this.setCapabilityValue('measure_power', solarpower);
      this.setCapabilityValue('powergrid_export', powergrid_export);
      this.setCapabilityValue('powergrid_import', powergrid_import);
      this.setCapabilityValue('ownconsumption', ownconsumption);
      this.setCapabilityValue('measure_power.ac', acpower);
      this.setStoreValue('acpower', solarpower);
      this.setStoreValue('oldscale', powerscale);
    //  this.log('oldscale is ok');
    }
    else {
  //  this.log('oldscale even wachten');
    this.setStoreValue('oldscale', powerscale);
    }

    /* VOLTAGE */
    if (voltage === 65535) {
     this.setCapabilityValue('measure_voltage.meter', 0);
    } else {
      var volt = voltage / 100;
      this.setCapabilityValue('measure_voltage.meter', volt);
    };
    /* TOTAL export */
    var impexpscale = impexpscale.readInt16BE();
    var totalexport = totalexport.readUInt32BE();
//    var totalexport = totalexport*(Math.pow(10, (totalscale)));
    var totalexport = totalexport / 1000;
    this.setCapabilityValue('meter_power.export', totalexport);

    /* TOTAL import */
    var totalimport = totalimport.readUInt32BE();
//    var totalimport1 = totalimport*(Math.pow(10, (impexpscale)));
    var totalimport = totalimport / 1000;
    this.setCapabilityValue('meter_power.import', totalimport);

//Everything for the battery
    //Temp
    var avgtemp = Buffer.from(avgtemp, 'hex').swap16().swap32().readFloatBE();
    this.setStoreValue('avgtemp', avgtemp);

    //SOC
    var soc1 = Buffer.from(soc, 'hex').swap16().swap32().readFloatBE();
    this.setStoreValue('soc', soc1);

    //Max Capacity
    var maxcap1 = Buffer.from(maxcap, 'hex').swap16().swap32().readFloatBE();

    //Usable Capacity
    var cap1 = Buffer.from(cap, 'hex').swap16().swap32().readFloatBE();

    //SOH
    var soh = Buffer.from(soh, 'hex').readFloatBE();
    var currentenergy = (soc1 * soh) / 100000;
    this.setStoreValue('currentenergy', currentenergy);
    // in percentage
    var soh1 = (soh / cap1) * 100;
    this.setStoreValue('soh', soh1);

// Lifetime import export doesnt work
    //Battery lifetime export
    /*
    var battexport1 = battexport.readUInt32LE();
    this.log('export', battexport);
    this.log('export', battexport1);
    var battexport1 = battexport1;
    this.setStoreValue('battexport', battexport1);

    //Battery lifetime import
    var battimport1 = battimport.readUInt32LE();
    var battimport1 = battimport1;
    this.log('import', battimport);
    this.log('import', battimport1);
    this.setStoreValue('battimport', battimport1);
    */

    //Status
    this.setStoreValue('battstatus', battstatus);

    // STORAGE control
    // Storage control mode
    var storagecontrol = storagecontrol.readInt16BE();
    this.setStoreValue('storagecontrol', storagecontrol);
    /*
        0 – Disabled
        1 – Maximize Self Consumption
        2 – Time of Use (Profile programming)
        3 – Backup Only
        4 – Remote Control – the battery charge/discharge state is controlled by an external controller
    */

    // Storage remote control Mode
    var storagedefault = storagedefault.readInt16BE();
    var storagecommand = storagecommand.readInt16BE();
    this.setStoreValue('storagecommand', storagecommand);
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
    // Storage remote control settings
    var storagechargelimit = Buffer.from(storagechargelimit, 'hex').swap16().swap32().readFloatBE();
    this.setStoreValue('storagechargelimit', storagechargelimit);
    var storagedischargelimit = Buffer.from(storagedischargelimit, 'hex').swap16().swap32().readFloatBE();
    this.setStoreValue('storagedischargelimit', storagedischargelimit);

    //errors
  }).catch((err) => {
this.log(err);
})
//Write data to inverter
let controlmodeset = 10;
let remotecontrolset = 10;
let chargepower = 6600;
let dischargepower = 6600;
var chargehex1 = 16384;
var chargehex2 = 17820;
var dischargehex1 = 16384;
var dischargehex2 = 17820;
ManagerDrivers.getDriver('storedge').getDevices().forEach(function (storedge) {
  controlmodeset = storedge.getStoreValue('controlmodeset');
});
ManagerDrivers.getDriver('storedge').getDevices().forEach(function (storedge) {
  remotecontrolset = storedge.getStoreValue('remotecontrolset');
});
ManagerDrivers.getDriver('storedge').getDevices().forEach(function (storedge) {
  chargepower = storedge.getStoreValue('chargepower');
});
ManagerDrivers.getDriver('storedge').getDevices().forEach(function (storedge) {
  dischargepower = storedge.getStoreValue('dischargepower');
});

// retrieve data from inverter
var storagecontrolget= 10;
var remotecontrolget = 10
var chargeget = 6600;
var dischargeget = 6600;
ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
  storagecontrolget = inverter.getStoreValue('storagecontrol');
});
ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
  remotecontrolget = inverter.getStoreValue('storagecommand');
});
ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
  chargeget = inverter.getStoreValue('storagechargelimit');
});
ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
  dischargeget = inverter.getStoreValue('storagedischargelimit');
});


//Controlmode
if (controlmodeset == 0) {
controlmodeset = 0;
} else if (controlmodeset == 1) {
controlmodeset = 1;
}  else if (controlmodeset == 2) {
controlmodeset = 2;
} else if (controlmodeset == 3) {
controlmodeset = 3;
} else if (controlmodeset == 4) {
controlmodeset = 4;
}
else {
  controlmodeset = 1;}
// Remote controlmode
if (remotecontrolset == 0) {
remotecontrolmodeset = 0;
} else if (remotecontrolset == 1) {
controlmodeset = 1;
}  else if (remotecontrolset == 2) {
remotecontrolset = 2;
} else if (remotecontrolset == 3) {
remotecontrolset = 3;
} else if (remotecontrolset == 4) {
remotecontrolset = 4;
} else if (remotecontrolset == 5) {
remotecontrolset = 5;
} else if (remotecontrolset == 6) {
remotecontrolset = 6;
} else if (remotecontrolset == 7) {
remotecontrolset = 7;
}
else {
  remotecontrolset = 7;}

//chargepower
if (chargepower == 500) {
chargehex1 =  0;
chargehex2 =  17402;
} else if (chargepower == 1000) {
  chargehex1 =  0;
  chargehex2 =  17530;
}  else if (chargepower == 1500) {
chargehex1 =  32768;
chargehex2 =  17596;
} else if (chargepower == 2000) {
  chargehex1 = 0;
  chargehex2 = 17658;
} else if (chargepower == 2500) {
  chargehex1 =  16384;
  chargehex2 =  17692;
} else if (chargepower == 3000) {
  chargehex1 =  32768;
  chargehex2 =  17723;
} else if (chargepower == 4000) {
  chargehex1 =  0;
  chargehex2 =  17786;
} else if (chargepower == 5000) {
  chargehex1 =  16384;
  chargehex2 =  17820;
}
else if (dischargepower == 6600) {
  dischargehex1 =  16384;
  dischargehex2 =  17870;
}
else {
  chargehex1 =  16384;
  chargehex2 =  17820;}

  //dischargepower
  if (dischargepower == 500) {
    dischargehex1 =  0;
    dischargehex2 =  17402;
  } else if (dischargepower == 1000) {
    dischargehex1 =  0;
    dischargehex2 =  17530;
  }  else if (dischargepower == 1500) {
  dischargehex1 =  32768;
  dischargehex2 =  17596;
} else if (dischargepower == 2000) {
    dischargehex1 = 0;
    dischargehex2 = 17658;
  } else if (dischargepower == 2500) {
    dischargehex1 =  16384;
    dischargehex2 =  17692;
  } else if (dischargepower == 3000) {
    dischargehex1 =  32768;
    dischargehex2 =  17723;
  } else if (dischargepower == 4000) {
    dischargehex1 =  0;
    dischargehex2 =  17786;
  } else if (dischargepower == 5000) {
    dischargehex1 =  16384;
    dischargehex2 =  17820;
  }
  else if (dischargepower == 6600) {
    dischargehex1 =  16384;
    dischargehex2 =  17870;
  }
  else {
    dischargehex1 =  16384;
    dischargehex2 =  17820;}
//////////////
this.log('controlmodeget', storagecontrolget);
this.log('controlmodeset', controlmodeset);
this.log('remotecontrolset', remotecontrolset);
this.log('remotecontrolget', remotecontrolget);
this.log('chargeget', chargeget);
this.log('chargeset', chargepower);
this.log('dischargeget', dischargeget);
this.log('dischargeset', dischargepower);
// dit is het schrijven voor storage control

if (controlmodeset == storagecontrolget) {
} else {
  client.writeSingleRegister(57348, controlmodeset)
.then(function (resp) {
  console.log('controlmodewrite', resp)
})}
// dit is het schrijven voor remote control
if (remotecontrolset == remotecontrolget) {
} else {
  client.writeSingleRegister(57357, remotecontrolset)
  .then(function (resp) {
    console.log('remotecontrolwrite', resp)
  })
}
/// DIT is het regeltje om charge  te beperken
if (chargepower == chargeget) {
} else {
  client.writeMultipleRegisters(57358, [chargehex1, chargehex2])
  .then(function (resp) {
    console.log('chargewrite', resp)
  })

}
/// DIT is het regeltje om discharge  te beperken
if (dischargepower == dischargeget) {
} else {
  client.writeMultipleRegisters(57360, [dischargehex1, dischargehex2])
  .then(function (resp) {
    console.log('dischargewrite', resp)
  })
}

/*
// if different write new setting
if (controlmodeset =!= storagecontrol) {
client.writeSingleRegister(57348, controlmodeset)
}
else {
};
*/
  //errors
/// else sluiten
}
  this.pollingInterval = setInterval(() => {
    socket.end();
  }, this.getSetting('polling') * 1500)
    })
  // Dit sluit de polling
//
    //avoid all the crash reports
    socket.on('error', (err) => {
      this.log(err);
    //  this.setUnavailable(err.err);
    //  socket.end();
    })

    socket.on('close', () => {
      this.log('Client closed');
      clearInterval(this.pollingInterval);
      var unitID = this.getSetting('id')
      var timeout = ((unitID * 5000) + 20000)

      setTimeout(() => {
        var unitID = this.getSetting('id')
        var timeout = ((unitID * 5000) + 20000)
        socket.connect(options);
        this.log('reconnecting connecting ...');
      },timeout)
})


  }
  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  }

module.exports = SolaredgeModbusDevice;
