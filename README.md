
<div align="center">
<a href="https://github.com/1RandomDev/whosinmylan">
    <img src="https://raw.githubusercontent.com/1RandomDev/whosinmylan/master/www/img/icon.png" width="128" />
</a>
</div>
<br>

# Whos In My LAN

Network scanner with webinterface, notifications and HomeAssistant integration for device trackers.

![Screenshot](https://raw.githubusercontent.com/1RandomDev/whosinmylan/master/assets/screenshot1.png)
For more images see [here](https://github.com/1RandomDev/whosinmylan/tree/master/assets).

## Installation

**Docker CLI:**
```bash
docker run -d --name=whosinmylan \
    --network=host \
    -v <data_directory>:/data \
    -e TZ=<timezone> \
    -e INTERFACE=eth0 \
    -e WEBUI_URL=https://whosinmylan.myserver.de \
    -e WEBUI_PASSWORD=<my_password> \
    -e WEBUI_JWT_KEY=<long_random_string> \
    ghcr.io/1randomdev/whosinmylan:latest
```

**Docker Compose:**
```yaml
services:
  whosinmylan:
    container_name: whosinmylan
    image: ghcr.io/1randomdev/whosinmylan:latest
    network_mode: host
    volumes:
      - ./data:/data
    environment:
      - TZ=<timezone>
      - INTERFACE=eth0
      - WEBUI_URL=https://whosinmylan.myserver.de
      - WEBUI_PASSWORD=<my_password>
      - WEBUI_JWT_KEY=<long_random_string>
    restart: unless-stopped
```
For all available options see [docker-compose.yml](https://github.com/1RandomDev/whosinmylan/blob/master/docker-compose.yml)

## Configuration
| Variable | Description | Default |
| -------- | ----------- | ------- |
| INTERFACE | Network interface to scan. Multiple interfaces can be specified comma separated (e.g. `vlan1,vlan2`). | `eth0` |
| SCAN_INTERVAL | Time between scans in sconds. | `60` |
| ONLINE_TIMEOUT | Time until a device is shown as offline. | `SCAN_INTERVAL+10s` |
| WEBUI_URL | URL of the webinterface which is used for things like links in notifications. | none |
| WEBUI_PORT | Port of the webinterface. | `8484` |
| WEBUI_HOST | Network interface through which the webinterface should be accessible. | `0.0.0.0` |
| WEBUI_PASSWORD | Password for accessing the webinterface. | none |
| WEBUI_JWT_KEY | Key for generating login tokens (JWT). Should be set to a long random string. If kept empty sessions won't be saved across restarts. | random generated |
| APPRISE_URL | URL for prefered notification service. See [list of supported services](https://github.com/caronc/apprise#supported-notifications). | none |
| INSTANCE_ID | Currently only used for HomeAssistant discovery. Only needs to be changed when running multiple instances. | `whosinmylan` |
| TRACKED_DEVICES | Comma separated list of mac addresses for which devices trackers should be exposed to HomeAssistant. | none |
| MQTT_HOST | Host of the MQTT broker used to connect to HomeAssistant. | none |
| MQTT_PORT | MATT broker port. | `1883` |
| MQTT_USERNAME | MQTT broker username if needed. | none |
| MQTT_PASSWORD | MQTT broker password if needed. | none |
| DATABASE_FILE | Path to the database file. | `/data/data.db` |

## Resources
Icon: https://freeicons.io/business-seo-elements/network-scheme-connection-networking-icon-38209
