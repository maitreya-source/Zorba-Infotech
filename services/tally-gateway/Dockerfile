# ------------------------------------------------------------------------------
# Stage 1: Build Container (Go Alpine)
# ------------------------------------------------------------------------------
FROM golang:alpine AS builder

WORKDIR /app

# Copy source code and tidy dependencies
COPY . .
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -extldflags '-static'" \
    -o tally-gateway .

# ------------------------------------------------------------------------------
# Stage 2: Production Distroless Container (Minimal Attack Surface, < 15MB)
# ------------------------------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /

# Copy compiled binary from builder stage
COPY --from=builder /app/tally-gateway /tally-gateway

# Expose Cloud Run default port
ENV PORT=8080
EXPOSE 8080

# Run as non-root user (security best practice)
USER nonroot:nonroot

ENTRYPOINT ["/tally-gateway"]
