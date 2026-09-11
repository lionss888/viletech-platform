FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY . ./
RUN CGO_ENABLED=0 go build -o /intake ./cmd/intake

# Node 22+ required by @cursor/sdk
FROM node:22-alpine
RUN apk add --no-cache ca-certificates
COPY --from=build /intake /usr/local/bin/intake
COPY agent-bridge /opt/agent-bridge
WORKDIR /opt/agent-bridge
RUN npm install --omit=dev
ENV INTAKE_HOME=/var/lib/vdp-intake
ENV INTAKE_AGENT_BRIDGE=/opt/agent-bridge/ask.mjs
ENV INTAKE_AGENT_CLOUD=1
VOLUME ["/var/lib/vdp-intake"]
WORKDIR /
ENTRYPOINT ["intake"]
