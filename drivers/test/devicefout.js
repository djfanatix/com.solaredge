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
          client.readHoldingRegisters(40083, 1).then(function (resp) {var powerac = resp._body._valuesAsArray[0]});//0 powerac
          client.readHoldingRegisters(40196, 1).then(function (resp) {var voltage = resp._body._valuesAsArray[0]}); //1 voltage
          client.readHoldingRegisters(40084, 1).then(function (resp) {var powerscale = resp._body._valuesAsArray[0]}); //2 powerscale AC
          client.readHoldingRegisters(40107, 1).then(function (resp) {var inverterstatus = resp._body._valuesAsArray[0]}); //3 status
          client.readHoldingRegisters(40242, 1).then(function (resp) {var totalscale = resp._body._valuesAsArray[0]}); //4 Scale factor totaal
          client.readHoldingRegisters(40093, 2).then(function (resp) {var total = resp._body._valuesAsArray[0]}); //5 Total generated power

          this.log('voltage', voltage);
          //11 meter id 1
          //logs

          /* VOLTAGE */
          if (voltage === 65535) {
           this.setCapabilityValue('measure_voltage', 0);
          } else {
            var volt = voltage / 100;
            this.setCapabilityValue('measure_voltage', volt);
         }
    },
    //errors
      //start polling
   this.getSetting('polling') * 1000)
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
    socket.end();
  }

}

module.exports = SolaredgeModbusDevice;
