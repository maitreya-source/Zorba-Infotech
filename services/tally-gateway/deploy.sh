#!/bin/bash
set -e

# ==============================================================================
#                 DEPLOY TALLY GATEWAY TO GOOGLE CLOUD RUN
# ==============================================================================

SERVICE_NAME="zorba-tally-gateway"
REGION="asia-south1"  # Mumbai Region for lowest latency to India
PROJECT_ID="zorba-infotech-web"

echo "================================================================"
echo "      DEPLOYING ZORBA TALLY GATEWAY TO GOOGLE CLOUD RUN         "
echo "================================================================"
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region:  $REGION"
echo "----------------------------------------------------------------"

gcloud run deploy "$SERVICE_NAME" \
    --project "$PROJECT_ID" \
    --source . \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 2 \
    --memory 256Mi \
    --cpu 1 \
    --concurrency 80 \
    --timeout 60s \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=zorba-infotech-web,ZORBA_SYNC_KEY=fS2DEpX7qMPvtd7mUEoQ8obRRrPZp4nARXDfkyoXWFN3hzkvtRh27Vs4Xzk6zz5mDWscr3rxteuoJbxb3tGdT1jiKPgyb7mbSrPe8pWVIUofFaSWkPCpfmJmNaaI5TlS"

echo ""
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "Service URL:"
gcloud run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --format="value(status.url)"
