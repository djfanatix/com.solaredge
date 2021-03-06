 Homey app to receive realtime data from your SolarEdge solar installation using local Modbus TCP

## Purpose
The difference of this app and the already existing solar panels app is that this app reads the data directly from the inverter.
The SolarEdge api is only limited to 300 calls/ day, so you get only updates every 10-15 minutes.

The modbus app receives data every few seconds.
If you have the SolarEdge energy monitor installed you can maximize your self-consumption and limit your exported power by using it. You can make flows based on your generated solar power, exported power, imported power or current power consumption.

The iOS / android app from SolarEdge is fine, so it is not the purpose to create this app again.

## Supported devices
Following devices are supported
- Inverters with SetApp and with display
- Modbus energy Meter
- Storedge devices (DC connected battery storage)

## Inverters
Modbus TCP is disabled by default on all inverters, you have to enable this function
Important: The TCP server idle time is 2 minutes after starting. In order to leave the connection open, the request should be made
within 2 minutes. The connection can remain open without any MODBUS requests.
General information can be found at:
https://www.SolarEdge.com/sites/default/files/sunspec-implementation-technical-note.pdf

## Inverters with SetApp
// I didn't test this myself, as I don't have this kind of inverter.//
Enable wifi direct on the inverter. Connect to the inverter access point like you would for a normal wifi network. The wifi password is published at the right side of the inverter. Then open up a browser and go to http://172.16.0.1 . From this webpage you can enable modbus TCP without setApp or installer account.

## Inverters with display (without SetApp)
Your CPU firmware has to be at least v 3.xxxx, if this is not the case, upgrade your firmware.
https://www.SolarEdge.com/sites/default/files/upgrading_an_inverter_using_micro_sd_card.pdf
Go to the menu by the following steps:
- Long press the 'OK' button for a few seconds
- Release the 'OK' button
- The screen will ask a password, this is '12312312' (the 2nd button from the left is '1', the 3rd button is '2', etc...)
- Go to Communication --> LAN Conf --> Modbus TCP (the default port is 502).
- To modify the TCP port, select Modbus TCP --> TCP Port, set the port number and long-press Enter

## Support topic
For support please use the official support topic on the forum [here](https://community.athom.com/t/app-SolarEdge/45487).

## Donations
If you appreciate the app: [Buy me a Beer](https://www.paypal.com/paypalme/pieterverougstraete)]
@athom a Homey Pro is always appreciated :-)

## Thanks
Thanks to Richard Barkestam and Jelger Haanstra for the SMA Energy app, where this app is based on.

## To Do (by priority)
- Learn to program :-)
- Implement Storage
- Make a virtual device with some derived data
- Phase and load monitoring
- For Belgium users: Make calculations for the capacity tariff in 2022.
- Tariff calculations


## Changelog

### v1.0.4
* Bugfixes + older homeys
### v1.0.3
* Bugfixes
### v1.0.2
* Inverter status implementation + rounding values
### v1.0.1
* Flows and tokens are working
### v1.0.0
* Initial release
