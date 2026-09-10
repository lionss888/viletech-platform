FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY . ./
RUN CGO_ENABLED=0 go build -o /intake ./cmd/intake

FROM alpine:3.20
RUN apk add --no-cache ca-certificates nodejs npm
COPY --from=build /intake /usr/local/bin/intake
COPY agent-bridge /opt/agent-bridge
WORKDIR /opt/agent-bridge
RUN npm install --omit=dev
ENV INTAKE_HOME=/var/lib/vdp-intake
ENV INTAKE_AGENT_BRIDGE=/opt/agent-bridge/ask.mjs
# Cloud agent works without local Cursor IDE inside the container.
ENV INTAKE_AGENT_CLOUD=1
VOLUME ["/var/lib/vdp-intake"]
WORKDIR /
ENTRYPOINT ["intake"]
