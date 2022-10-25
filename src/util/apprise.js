const childProcess = require('child_process');

class Apprise {
    constructor(url) {
        this.url = url;
    }

    sendNotification(title, message) {
        if(!this.url) return;

        const process = childProcess.spawn('apprise', ['-v', '-t', title, '-b', message, this.url]);
        let buffer = '';
        process.stdout.on('data', data => buffer += data);
        process.on('close', code => {
            if(buffer) {
                console.error('Apprise reported an error while sending notification:');
                console.error(buffer);
            }
        });
        process.on('error', err => {
            console.error('Error while sending notification with apprise: '+err);
        });
    }
}

module.exports = Apprise;
