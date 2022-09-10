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
                if(this.gotify) {
                    try {
                        await this.gotify.sendNotification('New Network Device', message, this.config.webuiUrl ? `${this.config.webuiUrl}/?highlight=${deviceId}` : null);
                    } catch(err) {
                        console.error('Cloud not send Gotify message: '+err);
                    }
                }
            }
        });
    }
    
    start() {
        this.config = {
            scanInterval: process.env.SCAN_INTERVAL*1000 || 60000,
            interface: process.env.INTERFACE || 'eth0',
            databaseFile: process.env.DATABASE_FILE || './data/data.db',

            gotifyUrl: process.env.GOTIFY_URL,
            gotifyToken: process.env.GOTIFY_TOKEN,
            gotifyPriority: process.env.GOTIFY_PRIORITY || 5,

            webuiUrl: process.env.WEBUI_URL,
            webuiPort: process.env.WEBUI_PORT || 8484,
            webuiPassword: process.env.WEBUI_PASSWORD,
            webuiJwtKey: process.env.WEBUI_JWT_KEY
        };

        this.database = new Database(this.config.databaseFile);
        if(this.config.gotifyUrl && this.config.gotifyToken)
            this.gotify = new Gotify(this.config.gotifyUrl, this.config.gotifyToken, this.config.gotifyPriority);
    
        this.webinterface = new Webinterface(this.config.webuiPort, this.config.webuiPassword, this.config.webuiJwtKey, this);
        this.webinterface.start();
        
        this.updateDeviceList();
    
        setInterval(() => {
            this.updateDeviceList();
        }, this.config.scanInterval);
    }
}
new Main().start();
