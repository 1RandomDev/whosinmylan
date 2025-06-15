const express = require('express');
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const CSV = require('csv-string');

class Webinterface {
    constructor(host, port, adminPassword, apiKey, jwtKey, main) {
        this.host = host;
        this.port = port;
        this.adminPassword = adminPassword;
        this.apiKey = apiKey;
        this.jwtKey = jwtKey;
        this.main = main;

        if(this.adminPassword && !this.jwtKey) {
            this.jwtKey = this.generateRandomKey();
            console.warn('WEBUI_JWT_KEY is not set. Generating random key, this will lead to all users being logged out.');
        }
    }

    start() {
        this.app = express();

        this.app.use(express.json());
        this.app.use(cookieParser());
        this.app.use(fileUpload())
        this.app.use((req, res, next) => {
            const queryParams = Object.keys(req.query);
            req.rawQuery = queryParams.length != 0 ? '?'+queryParams.map(key => key + '=' + req.query[key]).join('&') : '';

            if(!this.adminPassword) {
                // redirect away from login page if authentication diabled
                if(req.path == '/login.html') {
                    res.redirect('/'+req.rawQuery);
                    return;
                }
            } else {
                if(req.path == '/api/login') {
                    // ignore requests to login api
                    next();
                    return;
                }

                let loggedIn = false;
                if(req.cookies.token) {
                    loggedIn = this.checkToken(req.cookies.token);
                } else if(this.apiKey && req.headers.authorization) {
                    loggedIn = req.headers.authorization.split(' ')?.[1] === this.apiKey;
                }

                if(req.path.startsWith('/api/')) {
                    // require login for api requests
                    if(!loggedIn) {
                        res.status(401).end();
                        return;
                    }
                } else if(req.path == '/login.html') {
                    // redirect away from login page if already logged in
                    if(loggedIn) {
                        res.redirect('/'+req.rawQuery);
                        return;
                    }
                } else if(req.path == '/' || req.path.endsWith('.html')) {
                    // require login for all other pages
                    if(!loggedIn) {
                        res.redirect('/login.html'+req.rawQuery);
                        return;
                    }
                }
            }
            next();
        });
        this.app.use(express.static('./www'));

        this.app.get('/api/rescan', async (req, res) => {
            const newDeviceCount = await this.main.updateDeviceList(req.query.if);
            res.json({newDeviceCount});
        });
        this.app.get('/api/export/devices.csv', (req, res) => {
            const devices = req.query.if ? this.main.database.getDevicesByInterface(req.query.if) : this.main.database.getAllDevices();
            let csv = [['Name', 'Known', 'Mac', 'Ip', 'Hardware', 'Last seen', 'Interface']];
            devices.forEach(device => {
                const row = [device.name, device.known ? 'true' : 'false', device.mac, device.ip, device.hw, device.last_seen == -1 ? 'Never' : new Date(device.last_seen).toISOString(), device.if];
                csv.push(row);
            });
            csv = CSV.stringify(csv);

            res.setHeader('Content-Type', 'text/csv');
            res.send(csv);
        });
        this.app.get('/api/export/devices.json', (req, res) => {
            const devices = req.query.if ? this.main.database.getDevicesByInterface(req.query.if) : this.main.database.getAllDevices();
            devices.forEach(device => {
                device.id = undefined;
                device.known = device.known ? true : false;
                device.last_seen = device.last_seen == -1 ? 'Never' : new Date(device.last_seen).toISOString();
                device.if = device.if
            });

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(devices, null, 4));
        });
        this.app.post('/api/import/devices', (req, res) => {
            try {
                const mimetype = req.files.file.mimetype;
                let content = req.files.file.data.toString();
                const devices = this.main.database.getAllDevices();
                const stats = {
                    imported: 0,
                    updated: 0
                }

                switch(mimetype) {
                    case 'application/json':
                        content = JSON.parse(content);
                        content.forEach(importDevice => {
                            if(!importDevice.mac) return;
                            if(importDevice.known != null) importDevice.known = importDevice.known ? 1 : 0;
                            if(importDevice.last_seen != null) importDevice.last_seen = importDevice.last_seen == 'Never' ? -1 : Date.parse(importDevice.last_seen);
                            importDevice.if = req.query.if || importDevice.if || this.main.config.interfaces[0];

                            let foundDevice = devices.find(dev => dev.if == importDevice.if && dev.mac == importDevice.mac);
                            if(foundDevice) {
                                foundDevice = Object.assign(foundDevice, importDevice);
                                console.log(foundDevice)
                                this.main.database.updateDevice(foundDevice);
                                stats.updated++;
                            } else {
                                importDevice = Object.assign({
                                    name: '',
                                    ip: '0.0.0.0',
                                    hw: '-',
                                    last_seen: -1,
                                    known: 0,
                                    if: this.main.config.interfaces[0]
                                }, importDevice);
                                this.main.database.saveDevice(importDevice);
                                stats.imported++;
                            }
                        });
                        res.json(stats);
                        break;
                    case 'text/csv':
                        content = CSV.parse(content);
                        content.shift();
                        content.forEach(importDevice => {
                            importDevice = {
                                name: importDevice[0],
                                known: importDevice[1],
                                mac: importDevice[2],
                                ip: importDevice[3],
                                hw: importDevice[4],
                                last_seen: importDevice[5],
                                if: importDevice[6]
                            };
                            if(!importDevice.mac) return;
                            if(importDevice.known != null) importDevice.known = importDevice.known ? 1 : 0;
                            if(importDevice.last_seen != null) importDevice.last_seen = importDevice.last_seen == 'Never' ? -1 : Date.parse(importDevice.last_seen);
                            importDevice.if = req.query.if || importDevice.if || this.main.config.interfaces[0];

                            let foundDevice = devices.find(dev => dev.if == importDevice.if && dev.mac == importDevice.mac);
                            if(foundDevice) {
                                foundDevice = Object.assign(foundDevice, importDevice);
                                this.main.database.updateDevice(foundDevice);
                                stats.updated++;
                            } else {
                                importDevice = Object.assign({
                                    name: '',
                                    ip: '0.0.0.0',
                                    hw: '-',
                                    last_seen: -1,
                                    known: 0,
                                    if: this.main.config.interfaces[0]
                                }, importDevice);
                                this.main.database.saveDevice(importDevice);
                                stats.imported++;
                            }
                        });

                        res.json(stats);
                        break;
                    default:
                        res.status(400).end('Unsupported filetype.');
                }
            } catch(err) {
                console.error(err);
                res.status(400).end();
            }
        });
        this.app.get('/api/device', (req, res) => {
            const devices = req.query.if ? this.main.database.getDevicesByInterface(req.query.if) : this.main.database.getAllDevices();
            const response = {online: [], offline: []};
            const now = Date.now();
            devices.forEach(device => {
                if(device.last_seen != -1 && device.last_seen + this.main.config.onlineTimeout > now) {
                    response.online.push(device);
                } else {
                    response.offline.push(device);
                }
            });
            res.json(response);
        });
        this.app.post('/api/device', (req, res) => {
            const data = req.body;
            try {
                this.main.database.updateDevice(data);
                res.end();
            } catch(err) {
                console.error(err);
                res.status(400).end();
            }
        });
        this.app.delete('/api/device', (req, res) => {
            const data = req.body;
            try {
                this.main.database.deleteDevice(data.id);
                res.end();
            } catch(err) {
                console.error(err);
                res.status(400).end();
            }
        });
        this.app.put('/api/device', (req, res) => {
            const data = req.body;
            try {
                const device = this.main.database.saveDevice(data);
                res.json(device);
            } catch(err) {
                console.error(err);
                res.status(400).end();
            }
        });

        this.app.post('/api/devstate', (req, res) => {
            const data = req.body;
            try {
                if(data.mac && data.ip && data.if) {
                    data.mac = data.mac.toLowerCase();
                    const savedDevices = this.main.database.getAllDevices();
                    const savedDevice = savedDevices.find(dev => dev.if == data.if && dev.mac == data.mac);
                    if(savedDevice) {
                        savedDevice.ip = data.ip;
                        savedDevice.last_seen = Date.now();
                        this.main.database.updateDevice(savedDevice);
                    } else {
                        data.hw = this.main.arpscan.getMacVendor(data.mac) || '(Unknown)';
                        data.name = '';
                        data.known = 0;
                        data.last_seen = Date.now();
                        const deviceId = this.main.database.saveDevice(data).id;
            
                        const message = `MAC: ${data.mac}, IP: ${data.ip}, Hw: ${data.hw}, If: ${data.if}`;
                        console.log('Found new device: '+message);
                        this.main.apprise.sendNotification('New Network Device', message + (this.main.config.webuiUrl ? `\n${this.main.config.webuiUrl}/?if=${data.if}&highlight=${deviceId}` : null));
                    }
                    res.end();
                } else {
                    res.status(400).end();
                }
            } catch(err) {
                console.error(err);
                res.status(400).end();
            }
        });

        this.app.get('/api/interfaces', (req, res) => {
            res.json(this.main.config.interfaces);
        });

        this.app.post('/api/login', (req, res) => {
            const data = req.body;
            if(data?.password) {
                const token = this.loginUser(data.password);
                if(token) {
                    res.cookie('token', token, {maxAge: 2630000000 /* 30d */}).json({success: true});
                } else {
                    res.json({success: false});
                }
            } else {
                res.status(400).end();
            }
        });
        this.app.post('/api/logout', (req, res) => {
            res.clearCookie('token').end();
        });

        this.app.listen(this.port, this.host, () => {
            console.log('Started webinterface on port '+this.port);
        });
    }

    generateRandomKey() {
        return crypto.randomBytes(30).toString('hex');
    }

    loginUser(password) {
        if(password === this.adminPassword) {
            const token = jwt.sign({}, this.jwtKey, {
                expiresIn: '30d'
            });
            return token;
        } else {
            return false;
        }
    }

    checkToken(token) {
        try {
            jwt.verify(token, this.jwtKey);
            return true;
        } catch(err) {
            return false;
        }
    }
}

module.exports = Webinterface;
