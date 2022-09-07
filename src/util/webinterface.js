const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');

class Webinterface {
    constructor(port, adminPassword, jwtKey, main) {
        this.port = port;
        this.adminPassword = adminPassword;
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
        this.app.use((req, res, next) => {
            if(!this.adminPassword) {
                // redirect away from login page if authentication diabled
                if(req.path == '/login.html') {
                    res.redirect('/');
                    return;
                }
            } else {
                if(req.path == '/api/login') {
                    // ignore requests to login api
                    next();
                    return;
                }

                let loggedIn = false;
                const token = req.cookies.token;
                if(token) loggedIn = this.checkToken(token);

                if(req.path.startsWith('/api/')) {
                    // require login for api requests
                    if(!loggedIn) {
                        res.status(401).end();
                        return;
                    }
                } else if(req.path == '/login.html') {
                    // redirect away from login page if already logged in
                    if(loggedIn) {
                        res.redirect('/');
                        return;
                    }
                } else if(req.path == '/' || req.path.endsWith('.html')) {
                    // require login for all other pages
                    if(!loggedIn) {
                        res.redirect('/login.html');
                        return;
                    }
                }
            }
            next();
        });
        this.app.use(express.static('./www'));

        this.app.get('/api/device', (req, res) => {
            const devices = this.main.database.getAllDevices();
            const now = Date.now();
            devices.forEach(device => {
                if(device.last_seen == -1) {
                    device.online = false;
                } else {
                    device.online = device.last_seen + this.main.scanInterval*3 > now;
                }
            });
            res.json(devices);
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

        this.app.post('/api/login', (req, res) => {
            const data = req.body;
            if(data.password) {
                const token = this.loginUser(data.password);
                if(token) {
                    res.cookie('token', token, {maxAge: 2630000000}).json({success: true});
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

        this.app.listen(this.port, () => {
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
