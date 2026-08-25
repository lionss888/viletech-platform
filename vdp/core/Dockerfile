FROM golang:1.22-alpine AS build
WORKDIR /src
COPY shared /shared
COPY core/go.mod core/go.sum* ./
RUN go mod edit -replace github.com/viletech/vdp/shared=/shared && go mod download
COPY core/ ./
RUN go build -o /vdp-core ./cmd/api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget
COPY --from=build /vdp-core /usr/local/bin/vdp-core
ENV STORE_DRIVER=postgres
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/vdp-core"]
