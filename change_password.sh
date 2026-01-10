#!/bin/bash

# Script to change password for user Kartiknain@dmhca.in
# Usage: ./change_password.sh <new_password> <admin_token>

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <new_password> <admin_token>"
    echo "Example: $0 'NewPassword123!' 'your_admin_jwt_token'"
    exit 1
fi

NEW_PASSWORD="$1"
ADMIN_TOKEN="$2"
USER_ID="9318d277-ca77-4e7e-84ea-feda42704fe6"

# API endpoint (update this to your backend URL)
API_URL="${API_URL:-https://dmhca-worksheet.onrender.com}"

echo "Changing password for user Kartiknain@dmhca.in..."

curl -X PUT "$API_URL/api/users/$USER_ID/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"newPassword\": \"$NEW_PASSWORD\"
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo "Password change request completed."