FROM golang:1.23-alpine AS build
WORKDIR /src
COPY shared /shared
COPY manager-ops/go.mod manager-ops/go.sum* ./
RUN go mod edit -replace github.com/viletech/vdp/shared=/shared && go mod download
COPY manager-ops/ ./
RUN CGO_ENABLED=0 go build -o /manager-ops ./cmd/api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget
COPY --from=build /manager-ops /usr/local/bin/manager-ops
ENV PORT=8094
EXPOSE 8094
ENTRYPOINT ["/usr/local/bin/manager-ops"]
