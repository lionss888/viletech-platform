FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN go build -o /mail-gateway .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget
COPY --from=build /mail-gateway /usr/local/bin/mail-gateway
ENV PORT=8091
EXPOSE 8091
CMD ["mail-gateway"]
