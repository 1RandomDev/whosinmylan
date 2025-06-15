const childProcess = require('child_process');
const fs = require('fs');

const MAC_VENDOR_FILE = '/usr/share/arp-scan/ieee-oui.txt';

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

function getMacVendor(mac) {
    mac = mac.replace(/:/g, '').toUpperCase();
    const mappings = fs.readFileSync(MAC_VENDOR_FILE).toString();
    for(let line of mappings.split('\n')) {
        if(line.length == '' || line.startsWith('#')) continue;
        const [prefix, vendor] = line.split('\t');
        if(mac.startsWith(prefix)) return vendor;
    }
}

module.exports.scanNetwork = scanNetwork;
module.exports.getMacVendor = getMacVendor;
