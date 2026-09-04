FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . ./
RUN go build -o /vdp-delivery ./cmd/api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /vdp-delivery /usr/local/bin/vdp-delivery
EXPOSE 8090
ENTRYPOINT ["/usr/local/bin/vdp-delivery"]
