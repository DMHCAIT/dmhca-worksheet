#!/bin/bash

# Production Deployment Script for Work Tracker
# Run this script to deploy the application to production

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
if [ $NODE_MAJOR_VERSION -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $NODE_VERSION"
    exit 1
fi

print_status "Node.js version: $NODE_VERSION ✓"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi

# Backend deployment
print_status "Setting up backend..."
cd backend

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.production template..."
    cp .env.production .env
    print_warning "Please update the .env file with your production values before continuing."
    read -p "Press Enter to continue after updating .env file..."
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
npm install --production

# Run database migrations/setup if needed
if [ -f "../database/schema.sql" ]; then
    print_status "Database schema is ready. Make sure to run it in your Supabase dashboard."
fi

# Start backend in production mode
print_status "Starting backend server..."
npm run start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    print_status "Backend server started successfully (PID: $BACKEND_PID)"
else
    print_error "Backend server failed to start"
    exit 1
fi

# Frontend deployment
print_status "Setting up frontend..."
cd ../frontend

# Check if .env.local exists
if [ ! -f .env.local ]; then
    print_warning ".env.local file not found. Creating from .env.production template..."
    cp .env.production .env.local
fi

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm install

# Build the frontend
print_status "Building frontend for production..."
npm run build

# Check build success
if [ $? -eq 0 ]; then
    print_status "Frontend build completed successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Start frontend
print_status "Starting frontend server..."
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 10

# Health checks
print_status "Running health checks..."

# Check backend health
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
    print_status "Backend health check: ✓"
else
    print_error "Backend health check failed (HTTP $BACKEND_HEALTH)"
fi

# Check frontend
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$FRONTEND_HEALTH" = "200" ]; then
    print_status "Frontend health check: ✓"
else
    print_error "Frontend health check failed (HTTP $FRONTEND_HEALTH)"
fi

# Final status
echo ""
print_status "🎉 Deployment completed!"
echo ""
echo "Services running:"
echo "  Backend:  http://localhost:5000"
echo "  Frontend: http://localhost:3000"
echo ""
echo "PIDs:"
echo "  Backend:  $BACKEND_PID"
echo "  Frontend: $FRONTEND_PID"
echo ""
echo "To stop services:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
print_warning "Make sure to configure your reverse proxy/load balancer for production!"

# Save PIDs for easy stopping
echo "$BACKEND_PID $FRONTEND_PID" > .deployment_pids

print_status "Deployment PIDs saved to .deployment_pids"
print_status "Run './stop-production.sh' to stop all services"