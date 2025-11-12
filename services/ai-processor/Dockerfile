# Multi-stage Dockerfile for AWS Lambda (Python 3.11 on arm64)
# Optimized for cold start performance and small image size

# Stage 1: Build dependencies
FROM public.ecr.aws/lambda/python:3.11-arm64 AS builder

# Set working directory
WORKDIR /build

# Copy requirements first (better layer caching)
COPY requirements.txt .

# Install dependencies to a local directory
RUN pip install --no-cache-dir --target /build/dependencies -r requirements.txt

# Stage 2: Runtime
FROM public.ecr.aws/lambda/python:3.11-arm64

# Copy dependencies from builder stage
COPY --from=builder /build/dependencies ${LAMBDA_TASK_ROOT}

# Copy application code
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Set Python path to include src directory
ENV PYTHONPATH="${LAMBDA_TASK_ROOT}/src:${PYTHONPATH}"

# Set handler
CMD ["src.lambda_handler.lambda_handler"]
