'use strict';

const Homey	= require('homey');
const { ManagerDrivers } = require('homey');

class StorEdgeDriver extends Homey.Driver {

	onInit() {
        this.log('StorEdge driver has been initialized');

	}

  onPair (socket) {
    let devices = [];

    socket.on('list_devices', (data, callback) => {

      //We need to find an inverter and an energy meter for this to make sense
      if (ManagerDrivers.getDriver('inverter').getDevices().length > 0) {
            devices.push({
              name: 'Storedge',
              data: {
                id: 99999999999999
              }
            });
            callback(null, devices);

      } else {

        callback(new Error('You need to have the SolarEdge inverter with Modbus meter installed before you can add StorEdge'));
      }
    });
  }
}

module.exports = StorEdgeDriver;
