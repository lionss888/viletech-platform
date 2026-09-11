FROM golang:1.22-alpine AS gobuild
WORKDIR /src
COPY go.mod ./
COPY . ./
RUN CGO_ENABLED=0 go build -o /intake ./cmd/intake

FROM node:22-alpine AS febuild
WORKDIR /fe
COPY fe/package.json fe/package-lock.json* ./
COPY fe/bun.lock* ./
RUN npm install
COPY fe/ ./
# Preserve platform API client if present in build context
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache ca-certificates
COPY --from=gobuild /intake /usr/local/bin/intake
COPY agent-bridge /opt/agent-bridge
WORKDIR /opt/agent-bridge
RUN npm install --omit=dev
COPY --from=febuild /fe/.output /opt/intake-fe
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENV INTAKE_HOME=/var/lib/vdp-intake
ENV INTAKE_AGENT_BRIDGE=/opt/agent-bridge/ask.mjs
ENV INTAKE_AGENT_CLOUD=1
ENV INTAKE_SPA_PORT=3000
VOLUME ["/var/lib/vdp-intake"]
WORKDIR /
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["intake", "-hitl"]
