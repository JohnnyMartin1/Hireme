#!/bin/bash

# Test script for profile reminders cron job
# Replace these values with your actual domain and secret

DOMAIN="YOUR-DOMAIN.vercel.app"  # Replace with your actual Vercel domain
SECRET="YOUR_CRON_SECRET"         # Replace with your actual CRON_SECRET from Vercel

echo "Testing cron endpoint..."
echo "Domain: $DOMAIN"
echo ""

curl -X GET "https://$DOMAIN/api/cron/profile-reminders" \
  -H "Authorization: Bearer $SECRET" \
  -w "\n\nHTTP Status: %{http_code}\n"
