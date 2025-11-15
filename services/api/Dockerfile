# Multi-stage Dockerfile for AWS Lambda (Node.js 20 on arm64)
# Optimized for cold start performance and small image size

# Stage 1: Build application
FROM public.ecr.aws/lambda/nodejs:20-arm64 AS builder

# Set working directory
WORKDIR /build

# Copy package files first (better layer caching)
COPY package*.json ./

# Install dependencies (ignore native build scripts)
RUN npm install --ignore-scripts

# Copy tsconfig and source code
COPY tsconfig.docker.json ./tsconfig.json
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Stage 2: Runtime
FROM public.ecr.aws/lambda/nodejs:20-arm64

# Copy built application from builder stage
COPY --from=builder /build/dist ${LAMBDA_TASK_ROOT}/

# Copy package files
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Install only production dependencies
WORKDIR ${LAMBDA_TASK_ROOT}
RUN npm install --production --ignore-scripts

# Set handler
CMD ["index.handler"]
