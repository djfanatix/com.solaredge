'use strict';

const Homey = require('homey');
const modbus = require('jsmodbus');
const net = require('net');
const socket = new net.Socket();

class SolaredgeModbusDevice extends Homey.Device {

  onInit() {

    if (this.getClass() !== 'solarpanel') {
      this.setClass('solarpanel');
    }

    let options = {
      'host': this.getSetting('address'),
      'port': this.getSetting('port'),
      'unitId': 2,
      'timeout': 5000,
      'autoReconnect': true,
      'reconnectTimeout': this.getSetting('polling'),
      'logLabel' : 'solaredge Inverter',
      'logLevel': 'error',
      'logEnabled': true
    }
    // Capabilities for meter NOT INSTALLED
    var meterinstalled = this.getSetting('meter');
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

    // Changing of Capabilities --> Temp fix
    if (this.hasCapability('total_import')){
        this.removeCapability('total_import')};
    if (this.hasCapability('total_export')){
        this.removeCapability('total_export')};
    if (this.hasCapability('measure_voltage')){
        this.removeCapability('measure_voltage')};

// Start app
    let client = new modbus.client.TCP(socket)

    socket.connect(options);

    socket.on('connect', () => {

      this.log('Connected ...');
      if (!this.getAvailable()) {
        this.setAvailable();
      }

      this.pollingInterval = setInterval(() => {
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
          var powerac = results[0].response._body._valuesAsArray[0];
          var total = results[1].response._body._valuesAsBuffer;
          var powerscale = results[2].response._body._valuesAsBuffer;
          var inverterstatus= results[3].response._body._valuesAsArray[0];
          var totalscale = results[4].response._body._valuesAsBuffer;
          var powerdc = results[5].response._body._valuesAsArray[0];
          var dcscale = results[6].response._body._valuesAsBuffer;
          var temperature = results[7].response._body._valuesAsArray[0];
          var temperaturescale = results[8].response._body._valuesAsBuffer;

          // POWER DC conversion
          var dcscale = dcscale.readInt16BE().toString();
          // this.log('DC Power RAW', powerdc)
          var dcpower = powerdc*(Math.pow(10, dcscale));
          this.setCapabilityValue('measure_voltage.dc', dcpower);

          // Heatsink Temperature
          var temperaturescale = temperaturescale.readInt16BE().toString();
          // this.log('temperatuur RAW', temperature)
          var temperature = temperature*(Math.pow(10, temperaturescale));
          this.setCapabilityValue('measure_temperature', temperature);


          // POWER AC conversion
          var powerscale = powerscale.readInt16BE().toString();
          var acpower = powerac*(Math.pow(10, powerscale));
          var acpower = Math.round(acpower)
          this.setCapabilityValue('measure_power', acpower);
          this.setStoreValue('acpower', acpower);

          /* TOTAL YIELD */
          // Total power = acc32
          var totalscale = totalscale.readInt16BE().toString();
          var total = total.readUInt32BE().toString();
          var total = total*(Math.pow(10, totalscale));
          var total = total / 1000;
          this.setCapabilityValue('meter_power', total);

          // STATUS
          if (this.getCapabilityValue('status') != Homey.__('Off') && inverterstatus == 1) {
            this.setCapabilityValue('status', Homey.__('Off'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Off') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Sleeping') && inverterstatus == 2) {
            this.setCapabilityValue('status', Homey.__('Sleeping'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Sleeping') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Wake up') && inverterstatus == 3) {
            this.setCapabilityValue('status', Homey.__('Wake up'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Wake up') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Producing') && inverterstatus == 4) {
            this.setCapabilityValue('status', Homey.__('Producing'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Producing') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Throttled') && inverterstatus == 5) {
            this.setCapabilityValue('status', Homey.__('Throttled'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Throttled') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Shutting down') && inverterstatus == 6) {
            this.setCapabilityValue('status', Homey.__('Shutting down'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Shutting down') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Fault') && inverterstatus == 7) {
            this.setCapabilityValue('status', Homey.__('Fault'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Fault') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Maintenance') && inverterstatus == 8) {
          this.setCapabilityValue('status', Homey.__('Maintenance'));
          Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Maintenance') }, {});
          }

          //errors
        }).catch((err) => {
          this.log(err);
        })
        // METER INSTALLED?
        var meterinstalled = this.getSetting('meter');
        this.log('meter?', meterinstalled);
        if (meterinstalled != true) {this.log('geen meter geinstalleerd')
    }
      else {
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
          var meterscale1 = meterscale.readInt16BE().toString();
          var powergrid = powergrid*(Math.pow(10, meterscale1));
          var powergrid = Math.round(powergrid);

          /* TOTAL export */
          var impexpscale = impexpscale.readInt16BE().toString();
          var totalexport = totalexport.readUInt32BE().toString();
      //    var totalexport = totalexport*(Math.pow(10, (totalscale)));
          var totalexport = totalexport / 1000;
          this.setCapabilityValue('meter_power.export', totalexport);

          /* TOTAL import */
          var totalimport = totalimport.readUInt32BE().toString();
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
            Homey.ManagerFlow.getCard('trigger', 'changedExportPower').trigger(this, { export: powergrid_export }, {});
            Homey.ManagerFlow.getCard('trigger', 'changedImportPower').trigger(this, { import: powergrid_import }, {});
            Homey.ManagerFlow.getCard('trigger', 'changedConsumption').trigger(this, { consumption: ownconsumption }, {});
          }
          else {
            var powergrid_export = powergrid;
            var powergrid_import = 0;
            var ownconsumption = acpower - powergrid_export;
            this.setCapabilityValue('powergrid_export', powergrid_export);
            this.setCapabilityValue('powergrid_import', powergrid_import);
            this.setCapabilityValue('ownconsumption', ownconsumption);
            Homey.ManagerFlow.getCard('trigger', 'changedExportPower').trigger(this, { export: powergrid_export }, {});
            Homey.ManagerFlow.getCard('trigger', 'changedImportPower').trigger(this, { import: powergrid_import }, {});
            Homey.ManagerFlow.getCard('trigger', 'changedConsumption').trigger(this, { consumption: ownconsumption }, {});
          }

          //errors
        }).catch((err) => {
  this.log(err);
})}

  // Dit sluit de polling
      }, this.getSetting('polling') * 1000)

    })
    //avoid all the crash reports
    socket.on('error', (err) => {
      this.log(err);
      this.setUnavailable(err.err);
      socket.end();
    })

    socket.on('close', () => {
      this.log('Client closed, retrying in 63 seconds');

      clearInterval(this.pollingInterval);

      setTimeout(() => {
        socket.connect(options);
        this.log('Reconnecting now ...');
      }, 63000)
    })

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  }

module.exports = SolaredgeModbusDevice;
