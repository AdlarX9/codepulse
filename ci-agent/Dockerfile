# Multi-stage build for CodePulse CI Agent

# Build stage
FROM rust:1.75-slim as builder

WORKDIR /build

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Copy source
COPY src ./src

# Build release binary
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install CA certificates for HTTPS
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /build/target/release/ci-agent /usr/local/bin/ci-agent

# Create non-root user
RUN useradd -m -u 1000 codepulse
USER codepulse

ENTRYPOINT ["ci-agent"]
