# Zorba Infotech — Tally Gateway Service (Google Cloud Run)

A high-performance, ultra-lightweight microservice designed for Google Cloud Run to receive, inspect, and analyze live Tally ERP/TallyPrime stock data.

---

## 🌟 Key Features

1. **Safe Inspection Mode (`POST /api/tally/inspect`)**:
   - Ingests and parses live Tally dumps without writing to or modifying live Firestore products.
   - Automatically decomposes compound item strings into Clean Name, Brand, Model, Category, Units, and Valuation.
   - Identifies negative quantities, zero-stock items, and category distribution.
2. **Snapshot History (`GET /api/tally/snapshots`)**:
   - Stores the latest 20 inspection runs in memory with analytical summaries.
3. **Formatted Preview Table (`GET /api/tally/preview-latest`)**:
   - Returns the latest structured breakdown for review in the Admin Portal or CLI.
4. **Cloud Run Optimized**:
   - Multi-stage distroless container (< 15 MB image).
   - Near-instant cold starts (< 50 ms).
   - Zero-idle cost ($0.00 when idle).

---

## 🚀 Deployment

### Option 1: Using the 1-Click Deploy Script
```bash
./deploy.sh
```

### Option 2: Using gcloud CLI
```bash
gcloud run deploy zorba-tally-gateway \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="ZORBA_SYNC_KEY=zorba_live_sync_key_99730"
```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Liveness & Readiness probe | No |
| `POST` | `/api/tally/inspect` | Ingest Tally data in Inspection Mode | `X-Zorba-Sync-Key` |
| `GET` | `/api/tally/snapshots` | List recent inspection snapshots | `X-Zorba-Sync-Key` |
| `GET` | `/api/tally/preview-latest` | View full decomposed items of latest snapshot | `X-Zorba-Sync-Key` |
