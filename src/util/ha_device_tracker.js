const mqtt = require('mqtt');

class HADeviceTracker {
    constructor(config, instanceId, main) {
        this.config = config;
        this.instanceId = instanceId;
        this.main = main;
        this.topicPrefix = `device_tracker/${instanceId}`;
        this.timers = {};
    }

    start() {
        if(this.config.trackedDevices && this.config.mqttHost) {
            this.client = mqtt.connect({
                host: this.config.mqttHost,
                port: this.config.mqttPort,
                username: this.config.mqttUsername,
                password: this.config.mqttPassword,
                will: {
                    topic: this.topicPrefix+'/available',
                    payload: 'offline',
                    retain: true
                },
                reconnectPeriod: 5000
            });
            this.client.on('connect', () => {
                console.log(`Connected to MQTT broker ${this.config.mqttHost}:${this.config.mqttPort}`);
                this.client.publish(this.topicPrefix+'/available', 'online', { retain: true });
                
                for(let mac of this.config.trackedDevices.split(',')) {
                    mac = mac.trim().toLowerCase();
                    const name = this.main.database.getDevicesByMac(mac)[0]?.name || mac; // Get name from first device entry otherwise use mac address as name
                    this.sendDiscoveryMessage(mac, name);
                }
            });
            this.client.on('error', err => {
                console.error('MQTT connection error:', err.message);
            });
        }
    }

    sendDiscoveryMessage(mac, name) {
        if(!this.client) return;
        if(!this.config.trackedDevices.toLowerCase().includes(mac)) return;

        const devId = mac.replace(/:/g, '');
        const discoveryMessage = {
            name: name,
            unique_id: `${this.instanceId}_${devId}`,
            availability_topic: this.topicPrefix+'/available',
            state_topic: `${this.topicPrefix}/${devId}/state`,
            device: {
                ids: this.instanceId,
                name: 'WhosInMyLAN',
                mf: '1RandomDev',
                mdl: 'Network Device Scanner'
            }
        };
        const discoveryTopic = `homeassistant/device_tracker/${this.instanceId}_${devId}/config`;
        this.client.publish(discoveryTopic, JSON.stringify(discoveryMessage), { retain: true });
    }

    markDeviceOnline(mac) {
        if(!this.client) return;
        if(!this.config.trackedDevices.toLowerCase().includes(mac)) return;

        const devId = mac.replace(/:/g, '');
        this.client.publish(`${this.topicPrefix}/${devId}/state`, 'home', { retain: true });
        clearTimeout(this.timers[devId]);
        this.timers[devId] = setTimeout(() => {
            this.client.publish(`${this.topicPrefix}/${devId}/state`, 'not_home', { retain: true });
        }, this.main.config.onlineTimeout);
    }
}
module.exports = HADeviceTracker;