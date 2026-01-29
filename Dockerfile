# ---------- Build stage ----------
FROM golang:1.25.5 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o app

# ---------- Runtime stage ----------
FROM gcr.io/distroless/base-debian12

WORKDIR /app

# Copy the binary
COPY --from=builder /app/app /app/app
# Copy the .env file (Make sure .env isn't in your .dockerignore!)
COPY --from=builder /app/.env /app/.env

EXPOSE 4500

USER nonroot:nonroot

CMD ["/app/app"]
