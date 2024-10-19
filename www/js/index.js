const tableOnline = document.querySelector('#tableOnline tbody');
const tableOffline = document.querySelector('#tableOffline tbody');
const numDevicesOnline = document.getElementById('numDevicesOnline');
const numDevicesOffline = document.getElementById('numDevicesOffline');
const logoutBtn = document.getElementById('logoutBtn');
const addDeviceModal = document.querySelector('#addDeviceModal');
const addDeviceForm = document.querySelector('#addDeviceModal form');
const addDeviceFormButton = document.querySelector('#addDeviceModal form button[type="submit"]');
const exportImportModal = document.getElementById('exportImportModal');
const inputDevicesUpload = document.getElementById('inputDevicesUpload');
const settingsModal = document.getElementById('settingsModal');
const deleteModal = document.getElementById('deleteModal');
const toastContainer = document.getElementById('toastContainer');
const rescanBtn = document.getElementById('rescanBtn');
const interfaceSelect = document.getElementById('interfaceSelect');
const timeFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
let devices;
let deleteDevice, deleteDeviceEntry, scanInProgress, interfaces, selectedInterface;

const urlParams = new URLSearchParams(window.location.search);
const highlightDevice = urlParams.get('highlight');
let settings = {
    macAddressFormat: "1"
};

Object.assign(settings, JSON.parse(window.localStorage.getItem('wiml_settings')));
settingsModal.querySelectorAll('.settingsOption').forEach(element => {
    const currentValue = settings[element.dataset.settingsId];
    if(currentValue) {
        switch(element.nodeName) {
            case 'SELECT':
                element.querySelectorAll('option').forEach(option => {
                    if(option.value == currentValue) option.selected = true;
                });
                break;
            default:
                element.value = currentValue;
        }
    }
    element.addEventListener('change', () => {
        settings[element.dataset.settingsId] = element.value;
        window.localStorage.setItem('wiml_settings', JSON.stringify(settings));
        updateDeviceList();
    });
});

(async () => {
    interfaces = await fetch('/api/interfaces');
    if(!interfaces.ok) throw new Error('Request failed with status: '+res.status);
    interfaces = await interfaces.json();
    selectedInterface = urlParams.has('if') ? urlParams.get('if') : interfaces[0];
    if(interfaces.length > 1) {
        let html = '';
        interfaces.forEach(intf => {
            html +=
                `<input onclick="switchInterface('${intf}');" type="radio" class="btn-check" name="ifSel" id="ifSel-${intf}" autocomplete="off" ${intf == selectedInterface ? 'checked' : ''}>
                 <label class="btn btn-outline-warning" for="ifSel-${intf}">${intf}</label>`;
        });
        html +=
            `<input onclick="switchInterface('');" type="radio" class="btn-check" name="ifSel" id="ifSel-all" autocomplete="off" ${selectedInterface == '' ? 'checked' : ''}>
             <label class="btn btn-outline-warning" for="ifSel-all">Alle Interfaces</label>`;
        interfaceSelect.innerHTML = html;
        interfaceSelect.classList.remove('d-none');
    }

    updateDeviceList();
    setInterval(() => {
        updateDeviceList();
    }, 60000);
})();

function updateDeviceList() {
    const req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (this.readyState != 4 || this.status != 200) return;

        devices = JSON.parse(this.responseText);
        devices.online = devices.online.sort((a, b) => ip2int(a.ip) - ip2int(b.ip));
        devices.offline = devices.offline.sort((a, b) => b.last_seen - a.last_seen);
        tableOnline.innerHTML = '';
        tableOffline.innerHTML = '';
        numDevicesOnline.innerText = devices.online.length;
        numDevicesOffline.innerText = devices.offline.length

        devices.online.forEach(device => {
            const deviceElement = document.createElement('template');
            deviceElement.innerHTML =
                `<tr class="device ${highlightDevice == device.id ? 'highlight' : ''}" data-id="${device.id}">
                    <td><input class="form-control name" type="text" value="${device.name}" onchange="editDevice(this, ${device.id}, 'name');"></td>
                    <td class="text-nowrap"><a target="_blank" href="http://${device.ip}/">${device.ip}</a></td>
                    <td class="text-nowrap">${formatMacAddress(device.mac)}</td>
                    <td class="w-25">${device.hw}</td>
                    <td><button class="btn btn-${device.known ? 'success' : 'warning'} known-btn" onclick="toggleKnown(this, ${device.id});">${device.known ? 'Yes' : 'No'}</button></td>
                    <td><button class="btn btn-danger p-2" onclick="promptDeleteDevice(this, ${device.id});"><img height="20" width="20" src="img/delete.svg"></button></td>
                </tr>`;
            tableOnline.appendChild(deviceElement.content.firstChild);
        });
        devices.offline.forEach(device => {
            const deviceElement = document.createElement('template');
            deviceElement.innerHTML =
                `<tr class="device ${highlightDevice == device.id ? 'highlight' : ''}" data-id="${device.id}">
                    <td><input class="form-control name" type="text" value="${device.name}" onchange="editDevice(this, ${device.id}, 'name');"></td>
                    <td class="text-nowrap">${device.ip}</td>
                    <td class="text-nowrap">${formatMacAddress(device.mac)}</td>
                    <td class="w-25">${device.hw}</td>
                    <td>${device.last_seen == -1 ? 'Never' : timeFormat.format(device.last_seen)}</td>
                    <td><button class="btn btn-${device.known ? 'success' : 'warning'} known-btn" onclick="toggleKnown(this, ${device.id});">${device.known ? 'Yes' : 'No'}</button></td>
                    <td><button class="btn btn-danger p-2" onclick="promptDeleteDevice(this, ${device.id});"><img height="20" width="20" src="img/delete.svg"></button></td>
                </tr>`;
            tableOffline.appendChild(deviceElement.content.firstChild);
        });
        if(highlightDevice) {
            const element = document.querySelector(`.device[data-id="${highlightDevice}"]`);
            if(element) element.scrollIntoView({block:'center'});
        }
    };
    req.open('GET', '/api/device?if='+selectedInterface);
    req.send();
}

function switchInterface(intf) {
    selectedInterface = intf;
    updateDeviceList();
}

function toggleKnown(button, deviceId) {
    let device = devices.online.find(dev => dev.id == deviceId);
    if(!device) device = devices.offline.find(dev => dev.id == deviceId);
    device.known = 1-device.known;

    updateDevice(device, 'POST', () => {
        button.classList.remove('btn-success');
        button.classList.remove('btn-warning');
        button.classList.add(device.known ? 'btn-success' : 'btn-warning');
        button.innerText = device.known ? 'Yes' : 'No';
    });
}

function promptDeleteDevice(button, deviceId) {
    deleteDeviceEntry = button.parentElement.parentElement;
    deleteDevice = devices.online.find(dev => dev.id == deviceId);
    if(!deleteDevice) deleteDevice = devices.offline.find(dev => dev.id == deviceId);

    deleteModal.querySelector('.deviceName').innerText = deleteDevice.name;
    deleteModal.querySelector('.deviceIp').innerText = deleteDevice.ip;
    deleteModal.querySelector('.deviceMac').innerText = deleteDevice.mac;
    new bootstrap.Modal(deleteModal).show();
}
deleteModal.querySelector('.deleteBtn').addEventListener('click', () => {
    updateDevice(deleteDevice, 'DELETE', () => {
        deleteDeviceEntry.remove();
        showToast({
            message: `Deleted device <b>${deleteDevice.name}</b>`,
            type: 'danger'
        });
    });
});

function editDevice(input, deviceId, value) {
    let device = devices.online.find(dev => dev.id == deviceId);
    if(!device) device = devices.offline.find(dev => dev.id == deviceId);
    device[value] = input.value;

    updateDevice(device, 'POST');
}

addDeviceForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if(!addDeviceForm.checkValidity()) return;

    const data = new FormData(addDeviceForm);
    const device = {
        name: data.get('name'),
        mac: data.get('mac').toLowerCase().replace('-', ':'),
        ip: '0.0.0.0',
        hw: '-',
        last_seen: -1,
        known: data.get('known') ? 1 : 0,
        if: selectedInterface || interfaces[0]
    }
    
    updateDevice(device, 'PUT', () => {
        showToast({
            message: `Added device <b>${device.name}</b>`,
            type: 'success'
        });
        updateDeviceList();
        bootstrap.Modal.getInstance(addDeviceModal).hide();
        addDeviceForm.reset();
    });
});
addDeviceForm.addEventListener('input', () => {
    addDeviceFormButton.disabled = !addDeviceForm.checkValidity();
});

function updateDevice(device, method, cb) {
    const req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (this.readyState != 4 || this.status != 200) return;
        if(cb) cb();
    };
    req.open(method, '/api/device');
    req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    req.send(JSON.stringify(device));
}

inputDevicesUpload.addEventListener('change', () => {
    const formData = new FormData();
    formData.append('file', inputDevicesUpload.files[0]);

    const req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (this.readyState != 4 || this.status != 200) return;
        
        updateDeviceList();
        bootstrap.Modal.getInstance(exportImportModal).hide();

        const stats = JSON.parse(this.responseText);
        showToast({
            message: `Import complete. New: <b>${stats.imported}</b> Updated: <b>${stats.updated}</b>`,
            type: 'success'
        });
    };
    req.open('POST', '/api/import/devices?if='+selectedInterface);
    req.send(formData);

    inputDevicesUpload.value = '';
});

rescanBtn.addEventListener('click', async () => {
    if(scanInProgress) return;
    scanInProgress = true;
    rescanBtn.querySelector('.spinner').classList.remove('d-none');
    try {
        let res = await fetch('/api/rescan?if='+selectedInterface);
        if(!res.ok) throw new Error('Request failed with status: '+res.status);
        res = await res.json();
        showToast({
            message: `Scan complete, found <b>${res.newDeviceCount}</b> new devices`,
            type: 'success'
        });
        updateDeviceList();
    } catch(err) {
        console.error(err);
    }
    scanInProgress = false;
    rescanBtn.querySelector('.spinner').classList.add('d-none');
});

if(document.cookie.includes('token=')) logoutBtn.classList.remove('d-none');
logoutBtn.addEventListener('click', function(event) {
    event.preventDefault();

    const req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (this.readyState != 4 || this.status != 200) return;
        window.location.replace('/login.html');
    };
    req.open('POST', '/api/logout');
    req.send();
});

function ip2int(ip) {
    return ip.split('.').reduce((acc, byte) => acc + byte.padStart(3, 0), '');
}

function formatMacAddress(mac) {
    switch(settings.macAddressFormat) {
        case "1":
            return mac.toUpperCase();
        case "2":
            return mac.toLowerCase();
        case "3":
            return mac.toUpperCase().replace(/:/g, '-');
    }
}

function showToast(data) {
    let toastElement = document.createElement('template');
    toastElement.innerHTML =
        `<div class="toast align-items-center border-0 mb-2 text-bg-${data.type || 'secondary'}">
            <div class="d-flex">
                <div class="toast-body">
                    ${data.message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>`;
    toastElement = toastElement.content.firstChild;
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    toastContainer.appendChild(toastElement);
    new bootstrap.Toast(toastElement).show();
}
