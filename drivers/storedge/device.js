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
    }
/*
    setupCapabilities() {
        this.log('Setting up capabilities');

    showCapability(capabilityName, label) {
        //Device should have capability
        if (!this.hasCapability(capabilityName)) {
            this.log(`Adding missing capability '${capabilityName}' with label '${label}'`);
            this.addCapability(capabilityName);
            this.setCapabilityOptions(capabilityName, {title: { en: label}});
        } else {
            this.log(`Device has capability '${capabilityName}'`);
        }
    }

    hideCapability(capabilityName) {
        //Device doesnt have capability, remove it
        this.log(`Removing capability '${capabilityName}'`);
        this.removeCapability(capabilityName);
    }
*/
    updateValues() {
    //    let power = 0;
    //    ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
    //        power = inverter.getStoreValue('acpower');
    //    });
    //    this._updateProperty('measure_power.charge', power);
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
