FROM golang:1.22-alpine AS build
WORKDIR /src
COPY shared /shared
COPY hub/go.mod hub/go.sum* ./
RUN go mod edit -replace github.com/viletech/vdp/shared=/shared && go mod download
COPY hub/ ./
RUN go build -o /vdp-hub ./cmd/api

FROM alpine:3.20
COPY --from=build /vdp-hub /usr/local/bin/vdp-hub
ENV STORE_DRIVER=postgres
EXPOSE 8081
ENTRYPOINT ["/usr/local/bin/vdp-hub"]
