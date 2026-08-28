# Zorba Infotech — Tally Smart Sync Windows Engine (v3.0.0)

This folder contains the standalone, zero-dependency Windows synchronization client that connects directly to Tally Prime / Tally ERP 9 via XML HTTP and synchronizes live stock inventory, new product SKUs, and customer accounts with Google Cloud and the Zorba Admin Panel.

---

## 📦 Package Contents

| File | Description |
| :--- | :--- |
| **`ZorbaTallySync.exe`** | Standalone 64-bit Windows executable. Zero external dependencies (no Python or Node required). |
| **`config.ini`** | Configuration file for Tally host, credentials, and Cloud Run gateway endpoint. |
| **`1_FixDefender_Unblock.bat`** | **Step 1:** One-time script to unblock internet quarantine flags and whitelist the sync folder in Windows Defender. |
| **`2_EnableAutoStartup.bat`** | **Step 2:** Configures silent background sync every 4 hours automatically when Windows boots up (zero console popup). |
| **`3_DisableAutoStartup.bat`** | Disables auto-startup and stops any active background sync process. |
| **`Sync_Stock_Live.bat`** | 1-Click manual sync for **Stock Inventory** only (updates quantities, prices, and new SKUs). |
| **`Sync_Customers_Live.bat`** | 1-Click manual sync for **Customers & Sundry Debtors** only. |
| **`Sync_All_Live.bat`** | 1-Click manual sync for **Both Stock & Customers**. |
| **`DryRun_Stock.bat`** | Simulation preview for stock inventory (0 database writes, test mode). |
| **`DryRun_Customers.bat`** | Simulation preview for customers (0 database writes, test mode). |
| **`DryRun_All.bat`** | Simulation preview for both stock & customers (0 database writes). |
| **`Test_Connection.bat`** | Diagnostics test for Tally localhost:9000 & Google Cloud connectivity. |

---

## 🚀 Quick Setup on the Shop Computer (2 Steps)

### Step 1: Fix Defender & Unblock (One-Time)
1. Copy this `tally-sync` folder to your shop computer (e.g. `C:\ZorbaTallySync` or on Desktop).
2. Right-click **`1_FixDefender_Unblock.bat`** and select **Run as administrator**.
   * *This unblocks Windows SmartScreen and adds the folder to Defender exceptions so Windows will never complain or block the program again.*

### Step 2: Enable Automatic Startup Sync
1. Double-click **`2_EnableAutoStartup.bat`**.
   * *This installs a silent background runner that launches on Windows boot and syncs every 4 hours with 0 console windows.*

---

## 🔄 Available Sync Modes

### A. Automatic Silent Background Sync
* Runs in the background every 4 hours.
* Uses **Smart Delta Hashing**: If 0 items have changed in Tally, it sends 0 requests to Firestore ($0.00 cloud cost).

### B. Manual 1-Click Sync
* **Stock only:** Double-click `Sync_Stock_Live.bat`
* **Customers only:** Double-click `Sync_Customers_Live.bat`
* **Full sync (Both):** Double-click `Sync_All_Live.bat`

### C. Dry-Run Simulation (Zero Database Writes)
* Test what products would be created or updated without modifying live data:
  * Double-click `DryRun_All.bat`
  * Check the results in the Admin Dashboard: `https://zorbainfotech.in/admin/tally-sync`

---

## ⚙️ Configuration (`config.ini`)

```ini
[TALLY]
# Tally XML HTTP server address (Default port in Tally is 9000)
Host = http://localhost:9000

# Company security credentials (leave blank if company has no password)
Username = 
Password = 

# Connection timeout in seconds
Timeout = 20

[CLOUD]
# Google Cloud Run Gateway Endpoint
SyncUrl = https://zorba-tally-gateway-703650129045.asia-south1.run.app

# Sync Secret Key
SyncKey = fS2DEpX7qMPvtd7mUEoQ8obRRrPZp4nARXDfkyoXWFN3hzkvtRh27Vs4Xzk6zz5mDWscr3rxteuoJbxb3tGdT1jiKPgyb7mbSrPe8pWVIUofFaSWkPCpfmJmNaaI5TlS

# Default interval in hours for background daemon
IntervalHours = 4

[LOGGING]
LogFile = zorba_sync.log
Verbose = true
```

---

## 📦 Release Packaging & Distribution Instructions

When distributing the sync tool package via email or cloud archive:
1. **Version Naming Rule:**
   - In code (`main.go`), `AppVersion` is always strict semantic versioning `X.Y.Z` (e.g. `3.0.0`) with **no prefixes** (`v`) and **no suffixes/tags** (`-delta-sync`).
2. **Zip Archive Naming Rule:**
   - Distribution zip archives **must always** be named:
     ```
     zorba-website-tally-sync-v<X.Y.Z>.zip
     ```
     *(Example for v3.0.0: `zorba-website-tally-sync-v3.0.0.zip`)*
3. **Build & Package Command:**
   ```bash
   cd tools/tally-sync
   GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o ZorbaTallySync.exe .
   zip -r ../../zorba-website-tally-sync-v3.0.0.zip . -x ".*" -x "*.go" -x "go.mod" -x "go.sum" -x "mock_*" -x "test_*" -x "ZorbaTallySync"
   ```

---

## 🔒 Security & Free Tier Guarantees
* **100% Free Tier Compliant:** Cloud Run scales to 0 instances when idle ($0.00/month).
* **Zero Inbound Ports:** The client only makes outbound HTTPS requests to Google Cloud; no router port forwarding needed.
* **Smart Delta Hashing:** Only modified items consume Firestore writes.
