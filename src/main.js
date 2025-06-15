const arpscan = require('./util/arpscan');
const Database = require('./util/database');
const Apprise = require('./util/apprise');
const Webinterface = require('./util/webinterface');
require('dotenv').config()

class Main {
    async updateDeviceList(interfaceFilter) {
        const savedDevices = this.database.getAllDevices();
        let foundDevices = [], newDeviceCount = 0;

        for(let curInterface of this.config.interfaces) {
            if(interfaceFilter && curInterface != interfaceFilter) continue;

            console.log(`Scanning interface ${curInterface}...`);
            try {
                foundDevices = await arpscan.scanNetwork(curInterface);
            } catch(err) {
                console.error(`Error while scanning interface ${curInterface}: ${err}`);
                return;
            }
        
            foundDevices.forEach(async foundDevice => {
                const savedDevice = savedDevices.find(dev => dev.if == curInterface && dev.mac == foundDevice.mac);
                if(savedDevice) {
                    savedDevice.hw = foundDevice.hw;
                    savedDevice.ip = foundDevice.ip;
                    savedDevice.last_seen = Date.now();
                    this.database.updateDevice(savedDevice);
                } else {
                    foundDevice.if = curInterface;
                    foundDevice.name = '';
                    foundDevice.known = 0;
                    foundDevice.last_seen = Date.now();
                    const deviceId = this.database.saveDevice(foundDevice).id;
        
                    const message = `MAC: ${foundDevice.mac}, IP: ${foundDevice.ip}, Hw: ${foundDevice.hw}, If: ${curInterface}`;
                    console.log('Found new device: '+message);
                    this.apprise.sendNotification('New Network Device', message + (this.config.webuiUrl ? `\n${this.config.webuiUrl}/?if=${curInterface}&highlight=${deviceId}` : null));
                    newDeviceCount++;
                }
            });
        }

        return newDeviceCount;
    }
    
    start() {
        this.config = {
            scanInterval: process.env.SCAN_INTERVAL*1000 || 60000, 
            interfaces: process.env.INTERFACE.split(',').map(intf => intf.trim()) || ['eth0'],
            databaseFile: process.env.DATABASE_FILE || './data/data.db',
            appriseUrl: process.env.APPRISE_URL,
            webui: {
                url: process.env.WEBUI_URL,
                host: process.env.WEBUI_HOST,
                port: process.env.WEBUI_PORT || 8484,
                adminPassword: process.env.WEBUI_PASSWORD,
                jwtKey: process.env.WEBUI_JWT_KEY,
                apiKey: process.env.API_KEY
            }
        };
        this.config.onlineTimeout = process.env.ONLINE_TIMEOUT || (this.config.scanInterval > 0 ? this.config.scanInterval+10000 : 300000);

        this.database = new Database(this.config.databaseFile);
        this.database.createNewColumns({firstInterface: this.config.interfaces[0]});

        this.apprise = new Apprise(this.config.appriseUrl);

        this.arpscan = arpscan;
    
        this.webinterface = new Webinterface(this.config.webui, this);
        this.webinterface.start();
        
        if(this.config.scanInterval > 0) {
            setTimeout(() => {
                this.updateDeviceList();
            }, 3000);
            setInterval(() => {
                this.updateDeviceList();
            }, this.config.scanInterval);
        }
    }
}
new Main().start();
