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

    let client = new modbus.client.TCP(socket)

    //register flowCards


    socket.connect(options);

    socket.on('connect', () => {

      this.log('Connected ...');
      if (!this.getAvailable()) {
        this.setAvailable();
      }

      this.pollingInterval = setInterval(() => {
        Promise.all([
          client.readHoldingRegisters(40093, 2), // total generated power

        ]).then((results) => {
          var total = results[3].response._body._valuesAsBuffer;

          //logs

          /* TOTAL YIELD */
          // Total power = acc32
          var totaal = total.readUInt32BE().toString();
          var measureyield = totaal / 100;
          var measureyield = Math.round(measureyield)
          this.setCapabilityValue('measure_yield', measureyield);


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
