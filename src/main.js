const arpscan = require('./util/arpscan');
const Database = require('./util/database');
const Gotify = require('./util/gotify');
const Webinterface = require('./util/webinterface');
require('dotenv').config()

class Main {
    async updateDeviceList() {
        console.log('Scanning for new devices...');

        let foundDevices;
        try {
            foundDevices = await arpscan.scanNetwork(process.env.INTERFACE || 'eth0');
        } catch(err) {
            console.error('Error while scanning network: '+err);
            return;
        }
    
        const savedDevices = this.database.getAllDevices();
    
        foundDevices.forEach(async foundDevice => {
            const savedDevice = savedDevices.find(dev => dev.mac == foundDevice.mac);
            if(savedDevice) {
                savedDevice.hw = foundDevice.hw;
                savedDevice.ip = foundDevice.ip;
                savedDevice.last_seen = Date.now();
                this.database.updateDevice(savedDevice);
            } else {
                foundDevice.name = '';
                foundDevice.known = 0;
                foundDevice.last_seen = Date.now();
                this.database.saveDevice(foundDevice);
    
                const message = `MAC: ${foundDevice.mac}, IP: ${foundDevice.ip}, Hw: ${foundDevice.hw}`;
                console.log('Found new device: '+message);
                if(this.gotify) {
                    try {
                        await this.gotify.sendNotification('New Network Device', message);
                    } catch(err) {
                        console.error('Cloud not send Gotify message: '+err);
                    }
                }
            }
        });
    }
    
    start() {
        this.scanInterval = process.env.SCAN_INTERVAL*1000 || 60000;
        this.database = new Database(process.env.DATABASE_FILE || './data/data.db');
        if(process.env.GOTIFY_URL && process.env.GOTIFY_TOKEN)
            this.gotify = new Gotify(process.env.GOTIFY_URL, process.env.GOTIFY_TOKEN, process.env.GOTIFY_PRIORITY || 5);
    
        this.webinterface = new Webinterface(process.env.WEBUI_PORT || 8484, process.env.WEBUI_PASSWORD, process.env.WEBUI_JWT_KEY, this);
        this.webinterface.start();
        
        this.updateDeviceList();
    
        setInterval(() => {
            this.updateDeviceList();
        }, this.scanInterval);
    }
}
new Main().start();
