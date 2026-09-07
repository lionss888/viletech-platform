FROM golang:1.23-alpine AS build
WORKDIR /src
COPY shared /shared
COPY extraction/go.mod ./extraction/
WORKDIR /src/extraction
RUN go mod download
COPY extraction/ ./
RUN go build -o /extraction ./cmd/api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /extraction /usr/local/bin/extraction
ENV PORT=8093
ENV EXTRACTION_PRIMARY=fixture
ENV EXTRACTION_GOLD_DIR=/var/vdp/extraction-gold
EXPOSE 8093
VOLUME ["/var/vdp/extraction-gold"]
CMD ["extraction"]
