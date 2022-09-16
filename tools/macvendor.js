const axios = require('axios');
const fs = require('fs');

async function generateListFile() {
    let out = '';
    axios({
        method: 'get',
        headers: {
            'User-agent': 'Mozilla/5.0'
        },
        url: 'https://gitlab.com/wireshark/wireshark/-/raw/master/manuf'
    }).then(res => {
        const vendorList = res.data;
        vendorList.split('\n').forEach(line => {
            line = line.trim();
            if(line == '' || line.startsWith('#')) {
                out += line+'\n';
                return;
            }

            const lineSplit = line.split(/\s\s+|\t/);
            lineSplit[0] = lineSplit[0].replace(/:/g, '');
            if(lineSplit[0].length > 6) return;
            if(lineSplit.length == 3) {
                out += `${lineSplit[0]}\t${lineSplit[2]}\n`;
            } else {
                out += `${lineSplit[0]}\t${lineSplit[1]}\n`;
            }
        });

        fs.writeFileSync('./macvendor.txt', out);
        console.log('Wrote vendor list to file macvendor.txt');
    }).catch(err => {
        console.error('Error while downloading vendor list: '+err)
    });
}
generateListFile();
