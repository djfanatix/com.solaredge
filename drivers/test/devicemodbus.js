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
const client = new modbus.client.TCP(socket)
let cycleDone = true

socket.on('connect', function () {
  setInterval(function () {
    if (!cycleDone) {
      return
    }

    cycleDone = false

    const fc01 = client.readHoldingRegisters(40083, 1)
    const fc02 = client.readHoldingRegisters(40196, 1)


    const allFcs = Promise.all([fc01, fc02])

    allFcs.then(function (var powerac = fc01) {
      cycleDone = true
    }, socket.close)
  }, 100)
})

socket.on('error', console.error)
socket.connect(options)
}
}
module.exports = SolaredgeModbusDevice;
