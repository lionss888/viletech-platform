FROM golang:1.22-alpine AS gobuild
WORKDIR /src
COPY go.mod ./
COPY . ./
RUN CGO_ENABLED=0 go build -o /intake ./cmd/intake

# FE is built on the host (`cd fe && npm run build`) — Docker copies .output.
# In-container vite/rolldown native optional deps fail under npm+Docker Desktop.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=gobuild /intake /usr/local/bin/intake
COPY agent-bridge /opt/agent-bridge
WORKDIR /opt/agent-bridge
RUN npm install --omit=dev
COPY fe/.output /opt/intake-fe
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
