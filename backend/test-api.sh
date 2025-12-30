#!/bin/bash
echo "Testing API endpoints..."

echo "1. Testing /api/projects..."
curl -s -w "Status: %{http_code}\n" http://localhost:5001/api/projects || echo "FAILED"

echo -e "\n2. Testing /api/users..."
curl -s -w "Status: %{http_code}\n" http://localhost:5001/api/users || echo "FAILED"

echo -e "\n3. Testing /api/tasks..."
curl -s -w "Status: %{http_code}\n" http://localhost:5001/api/tasks || echo "FAILED"

echo -e "\n4. Testing /api/projections..."
curl -s -w "Status: %{http_code}\n" http://localhost:5001/api/projections || echo "FAILED"

echo -e "\n5. Testing health endpoint..."
curl -s -w "Status: %{http_code}\n" http://localhost:5001/health || echo "FAILED"