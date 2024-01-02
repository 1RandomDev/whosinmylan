const arpscan = require('./util/arpscan');
const Database = require('./util/database');
const Apprise = require('./util/apprise');
const Webinterface = require('./util/webinterface');
require('dotenv').config()

class Main {
    async updateDeviceList() {
        console.log('Scanning for new devices...');

        let foundDevices;
        try {
            foundDevices = await arpscan.scanNetwork(this.config.interface);
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
                const deviceId = this.database.saveDevice(foundDevice).id;
    
                const message = `MAC: ${foundDevice.mac}, IP: ${foundDevice.ip}, Hw: ${foundDevice.hw}`;
                console.log('Found new device: '+message);
                this.apprise.sendNotification('New Network Device', message + (this.config.webuiUrl ? `\n${this.config.webuiUrl}/?highlight=${deviceId}` : null));
            }
        });
    }
    
    start() {
        this.config = {
            scanInterval: process.env.SCAN_INTERVAL*1000 || 60000,
            interface: process.env.INTERFACE || 'eth0',
            databaseFile: process.env.DATABASE_FILE || './data/data.db',

            appriseUrl: process.env.APPRISE_URL,

            webuiUrl: process.env.WEBUI_URL,
            webuiHost: process.env.WEBUI_HOST || '0.0.0.0',
            webuiPort: process.env.WEBUI_PORT || 8484,
            webuiPassword: process.env.WEBUI_PASSWORD,
            webuiJwtKey: process.env.WEBUI_JWT_KEY
        };

        this.database = new Database(this.config.databaseFile);
        this.apprise = new Apprise(this.config.appriseUrl);
    
        this.webinterface = new Webinterface(this.config.webuiHost, this.config.webuiPort, this.config.webuiPassword, this.config.webuiJwtKey, this);
        this.webinterface.start();
        
        this.updateDeviceList();
    
        setInterval(() => {
            this.updateDeviceList();
        }, this.config.scanInterval);
    }
}
new Main().start();
