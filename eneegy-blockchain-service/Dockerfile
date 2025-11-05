# Multi-stage build for Rust blockchain service
FROM rust:1.75-slim as builder

# Install required packages
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy Cargo files
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src
COPY proto ./proto
COPY build.rs ./

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -r -s /bin/false blockchain

# Copy the binary
COPY --from=builder /app/target/release/blockchain-service /usr/local/bin/

# Change ownership
RUN chown blockchain:blockchain /usr/local/bin/blockchain-service

# Switch to non-root user
USER blockchain

# Expose gRPC port
EXPOSE 50051

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD echo "Health check not implemented yet"

# Run the application
CMD ["blockchain-service"]



