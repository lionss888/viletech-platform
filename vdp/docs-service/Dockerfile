FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN go build -o /docs-service .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /docs-service /usr/local/bin/docs-service
ENV PORT=8090
ENV DOCS_PATH=/generate
EXPOSE 8090
CMD ["docs-service"]
