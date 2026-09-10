FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY . ./
RUN CGO_ENABLED=0 go build -o /intake ./cmd/intake

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /intake /usr/local/bin/intake
ENV INTAKE_HOME=/var/lib/vdp-intake
VOLUME ["/var/lib/vdp-intake"]
# Token and chat ids come from env_file / host mount — never baked in.
ENTRYPOINT ["intake"]
