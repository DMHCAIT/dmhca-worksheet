#!/bin/bash

# Test admin password change functionality
echo "🧪 Testing Admin Password Change Functionality"
echo "=============================================="

USER_ID="9318d277-ca77-4e7e-84ea-feda42704fe6"
NEW_PASSWORD="NewPassword123!"

# You need to replace YOUR_ADMIN_TOKEN with a real admin JWT token
ADMIN_TOKEN="YOUR_ADMIN_TOKEN"

echo "📝 Testing password change for user: $USER_ID"
echo "🔑 New password: $NEW_PASSWORD"
echo ""

if [ "$ADMIN_TOKEN" = "YOUR_ADMIN_TOKEN" ]; then
    echo "❌ Please replace YOUR_ADMIN_TOKEN with your actual admin JWT token"
    echo "💡 You can get your admin token by logging in as admin and checking:"
    echo "   - Browser localStorage: localStorage.getItem('authToken')"
    echo "   - Or from network tab after login"
    exit 1
fi

echo "🌐 Making API request..."
curl -X PUT "https://dmhca-worksheet.onrender.com/api/users/${USER_ID}/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"newPassword\": \"$NEW_PASSWORD\"}" \
  -v

echo ""
echo "✅ Test completed. Check the response above for success/error details."