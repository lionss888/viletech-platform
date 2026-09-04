FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN go build -o /sms-gateway .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget
COPY --from=build /sms-gateway /usr/local/bin/sms-gateway
ENV PORT=8092
EXPOSE 8092
CMD ["sms-gateway"]
