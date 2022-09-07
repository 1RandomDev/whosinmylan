const childProcess = require('child_process');

async function scanNetwork(interface) {
    return new Promise((resolve, reject) => {
        const arpscan = childProcess.spawn('arp-scan', ['-glNx', '-I', interface]);
       
        let buffer = '', errbuffer = '';
        arpscan.stdout.on('data', data => buffer += data);
        arpscan.stderr.on('data', data => errbuffer += data);

        arpscan.on('close', code => {
            if(code != 0) {
                reject(errbuffer);
                return;
            }

            const devices = [];
            buffer = buffer.split('\n');
            buffer.pop();
            buffer.forEach(device => {
                device = device.split('\t');
                devices.push({
                    ip: device[0],
                    mac: device[1],
                    hw: device[2]
                });
            });

            resolve(devices);
        });

        arpscan.on('error', err => {
            reject(err);
        })
    });
}

module.exports.scanNetwork = scanNetwork;
