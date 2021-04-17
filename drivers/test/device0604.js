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

    var meter = this.getSetting('meter');
    this.log('meter?', meter);

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

    let client = new modbus.client.TCP(socket)

    socket.connect(options);

    socket.on('connect', () => {

      this.log('Connected ...');
      if (!this.getAvailable()) {
        this.setAvailable();
      }

      this.pollingInterval = setInterval(() => {
        Promise.all([
          client.readHoldingRegisters(40083, 1),//0 powerac
          client.readHoldingRegisters(40196, 1), //1 voltage
          client.readHoldingRegisters(40084, 1), //2 powerscale AC
          client.readHoldingRegisters(40107, 1), //3 status
          client.readHoldingRegisters(40361, 1), //4 Scale factor totaal
          client.readHoldingRegisters(40093, 2) //5 Total generated power
      //    client.readHoldingRegisters(40207, 1), //1 importexport meter

        ]).then((results) => {
          var powerac = results[0].response._body._valuesAsArray[0];
          var voltage = results[1].response._body._valuesAsArray[0];
          var powerscale = results[2].response._body._valuesAsBuffer;
          var inverterstatus= results[3].response._body._valuesAsArray[0];
          var totalscale = results[4].response._body._valuesAsBuffer;
          var total = results[5].response._body._valuesAsBuffer;
  //        var powergrid = results[0].response._body._valuesAsArray[0];

          this.log('Powerac', powerac);
          //11 meter id 1
          //logs

          // POWER AC conversion
          var powerscale = powerscale.readInt16BE().toString();
          var acpower = powerac*(Math.pow(10, powerscale));
          var acpower = Math.round(acpower);
          this.setCapabilityValue('measure_power', acpower);
          this.setStoreValue('acpower', acpower);


          /* VOLTAGE */
          if (voltage === 65535) {
           this.setCapabilityValue('measure_voltage', 0);
          } else {
            var volt = voltage / 100;
            this.setCapabilityValue('measure_voltage', volt);
         }

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
          } else if (this.getCapabilityValue('status') != Homey.__('Starting') && inverterstatus == 3) {
            this.setCapabilityValue('status', Homey.__('Starting'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Starting') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Production') && inverterstatus == 4) {
            this.setCapabilityValue('status', Homey.__('Production'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Production') }, {});
          } else if (this.getCapabilityValue('status') != Homey.__('Throttled Production') && inverterstatus == 5) {
            this.setCapabilityValue('status', Homey.__('Throttled Production'));
            Homey.ManagerFlow.getCard('trigger', 'changedStatus').trigger(this, { status: Homey.__('Throttled Production') }, {});
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

          var powergrid = results[0].response._body._valuesAsArray[0];


          //Meterscale conversion
          var meterscale1 = meterscale.readInt16BE().toString();
          var powergrid = powergrid*(Math.pow(10, meterscale1));
          var powergrid = Math.round(powergrid);

          /* TOTAL export */
          var impexpscale = impexpscale.readInt16BE().toString();
          var totalexport = totalexport.readUInt32BE().toString();
      //    var totalexport = totalexport*(Math.pow(10, (totalscale)));
          var totalexport = totalexport / 1000;
          this.setCapabilityValue('total_export', totalexport);

          /* TOTAL import */
          var totalimport = totalimport.readUInt32BE().toString();
      //    var totalimport1 = totalimport*(Math.pow(10, (impexpscale)));
          var totalimport = totalimport / 1000;
          this.setCapabilityValue('total_import', totalimport);

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

          //kopieren
        }).catch((err) => {
          this.log(err);
        })
      }, this.getSetting('polling') * 1000)

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
