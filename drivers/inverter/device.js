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
      'unitId': 3,
      'timeout': 5000,
      'autoReconnect': true,
      'reconnectTimeout': this.getSetting('polling'),
      'logLabel' : 'solaredge Inverter',
      'logLevel': 'error',
      'logEnabled': true
    }

    let client = new modbus.client.TCP(socket, 2)

    //register flowCards


    socket.connect(options);

    socket.on('connect', () => {

      this.log('Connected ...');
      if (!this.getAvailable()) {
        this.setAvailable();
      }

      this.pollingInterval = setInterval(() => {
        Promise.all([
          client.readHoldingRegisters(40083, 1), //powerac
          client.readHoldingRegisters(40207, 1), //importexport meter
          client.readHoldingRegisters(40196, 1), //voltage
          client.readHoldingRegisters(40093, 2), // total generated power
          client.readHoldingRegisters(40084, 1), //powerscale AC
          client.readHoldingRegisters(40210, 1),  //powerscale importexport meter
          client.readHoldingRegisters(40107, 1)  //status


        ]).then((results) => {
          var powerac = results[0].response._body._valuesAsArray[0];
          var powergrid = results[1].response._body._valuesAsArray[0];
          var voltage = results[2].response._body._valuesAsArray[0];
          var total = results[3].response._body._valuesAsBuffer;
          var powerscale = results[4].response._body._valuesAsBuffer;
          var meterscale = results[5].response._body._valuesAsBuffer;
          var inverterstatus= results[6].response._body._valuesAsArray[0];

          //logs

          // POWER AC conversion
          var powerscale1 = powerscale.readInt16BE().toString();
          var acpower = powerac*(Math.pow(10, powerscale1));
          var acpower = Math.round(acpower)
          this.setCapabilityValue('measure_power', acpower);

          //Meterscale conversion
          var meterscale1 = meterscale.readInt16BE().toString();
          var powergrid = powergrid*(Math.pow(10, meterscale1));
          var powergrid = Math.round(powergrid)

          //  POWER
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

          /* VOLTAGE */
          if (voltage === 65535) {
           this.setCapabilityValue('measure_voltage', 0);
          } else {
            var volt = voltage / 100;
            this.setCapabilityValue('measure_voltage', volt);
         }

          /* TOTAL YIELD */
          // Total power = acc32
          var totaal = total.readUInt32BE().toString();
          var measureyield = totaal / 100;
          var measureyield = Math.round(measureyield)
          this.setCapabilityValue('measure_yield', measureyield);

          // STATUS
          if (this.getCapabilityValue('status') != Homey.__('Off') && inverterstatus == 1) {
            this.setCapabilityValue('status', Homey.__('Off'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Off') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Standby') && inverterstatus == 2) {
            this.setCapabilityValue('status', Homey.__('Standby'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Standby') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Grid Monitoring_wake-up') && inverterstatus == 3) {
            this.setCapabilityValue('status', Homey.__('Grid Monitoring_wake-up'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Grid Monitoring_wake-up') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Inverter is ON and producing power') && inverterstatus == 4) {
            this.setCapabilityValue('status', Homey.__('Inverter is ON and producing power'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Inverter is ON and producing power') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Production') && inverterstatus == 5) {
            this.setCapabilityValue('status', Homey.__('Production'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Production') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Shutting down') && inverterstatus == 6) {
            this.setCapabilityValue('status', Homey.__('Shutting down'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Shutting down') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Fault') && inverterstatus == 7) {
            this.setCapabilityValue('status', Homey.__('Fault'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Fault') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Maintenance/setup') && inverterstatus == 8) {
          this.setCapabilityValue('status', Homey.__('Maintenance/setup'));
          Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Maintenance/setup') }, {});
          }

          //errors
        }).catch((err) => {
          this.log(err);
        })
      }, this.getSetting('polling') * 1000)

    })

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
