FROM alpine:latest AS builder

ARG ARP_SCAN_VERSION=latest

RUN apk add --no-cache build-base autoconf automake libpcap-dev curl python3 nodejs npm

# Build arp-scan
RUN if [ "$ARP_SCAN_VERSION" = "latest" ]; then \
        ARP_SCAN_VERSION=$(curl -fsSLo /dev/null -w '%{url_effective}' https://github.com/royhills/arp-scan/releases/latest | sed -n 's|.*/releases/tag/||p'); \
        [ -n "$ARP_SCAN_VERSION" ] || ARP_SCAN_VERSION=master; \
    fi \
    && echo "Building arp-scan ${ARP_SCAN_VERSION}" \
    && mkdir /tmp/arp-scan \
    && curl -fsSL https://github.com/royhills/arp-scan/archive/${ARP_SCAN_VERSION}.tar.gz | tar xz -C /tmp/arp-scan --strip-components=1 \
    && cd /tmp/arp-scan \
    && sed -i 's/^#define PROMISC 1/#define PROMISC 0/' arp-scan.h \
    && autoreconf --install \
    && ./configure --prefix=/usr --sysconfdir=/etc --without-libcap \
    && make \
    && make install-exec install-dist_pkgdataDATA install-dist_pkgsysconfDATA DESTDIR=/out \
    && chmod u-s /out/usr/bin/arp-scan

# Build node dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev


FROM alpine:latest

COPY --from=builder /out/ /
RUN apk add --no-cache tzdata libpcap nodejs python3 py3-pip \
    && pip install --no-cache-dir --break-system-packages apprise \
    && apk del py3-pip \
    && mkdir /data

COPY . /app
COPY --from=builder /app/node_modules /app/node_modules
WORKDIR /app

ENV DATABASE_FILE=/data/data.db
ENTRYPOINT ["node", "src/main.js"]
