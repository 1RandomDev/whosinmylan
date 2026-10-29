FROM alpine:latest AS arp-scan-builder

ARG ARP_SCAN_VERSION=latest

RUN apk add --no-cache build-base autoconf automake libpcap-dev curl \
    && if [ "$ARP_SCAN_VERSION" = "latest" ]; then \
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


FROM alpine:latest

COPY --from=arp-scan-builder /out/ /

RUN apk add --no-cache nodejs npm tzdata libpcap python3 py3-pip g++ make \
    && pip install --no-cache-dir --break-system-packages apprise \
    && mkdir /data

COPY . /app
WORKDIR /app
RUN npm install --omit=dev

ENV DATABASE_FILE=/data/data.db
ENTRYPOINT ["node", "src/main.js"]
