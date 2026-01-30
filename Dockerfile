# ---------- Build stage ----------
FROM golang:1.25.5-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o app

# ---------- Runtime stage ----------
FROM alpine:3.19
WORKDIR /app

COPY --from=builder /app/app /app/app
COPY --from=builder /app/.env /app/.env

RUN touch logs.log && chmod 666 logs.log

EXPOSE 4500
CMD ["./app"]
