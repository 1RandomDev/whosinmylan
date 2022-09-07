const axios = require('axios');

class Gotify {
    constructor(url, token, priority) {
        this.url = url;
        this.token = token;
        this.priority = priority;
    }

    sendNotification(title, message) {
        return axios({
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-Gotify-Key': this.token
            },
            url: this.url+'/message',
            data: {
                title: title,
                message: message,
                priority: parseInt(this.priority)
            }
        });
    }
}

module.exports = Gotify;
