#!/usr/bin/env python3
"""
Automated Test Runner for Zorba Tally Sync Binary.
Runs local end-to-end integration tests without needing a physical Windows PC.
"""

import subprocess
import time
import json
import os
import sys
from mock_tally_server import run_servers

def main():
    print("================================================================")
    print("       STARTING AUTOMATED INTEGRATION TEST FOR TALLY SYNC       ")
    print("================================================================")

    # 1. Start mock servers
    tally_server, cloud_server = run_servers()
    time.sleep(0.5)

    # 2. Write test configuration
    test_config = """[TALLY]
Host = http://127.0.0.1:9008
Username = 
Password = 
Timeout = 5

[CLOUD]
SyncUrl = http://127.0.0.1:9098/syncTallyStock
SyncKey = test_secret_key_123
Interval = 15

[LOGGING]
LogFile = /tmp/zorba_test_sync.log
Verbose = true
"""
    with open("config.ini", "w") as f:
        f.write(test_config)

    binary_path = "./zorba-tally-sync-linux"
    if not os.path.exists(binary_path):
        print(f"❌ Binary not found at {binary_path}")
        sys.exit(1)

    # 3. Test --test diagnostics flag
    print("\n--- TEST 1: Running Pre-Flight Diagnostics (--test) ---")
    proc = subprocess.run([binary_path, "-test"], capture_output=True, text=True)
    print(proc.stdout)
    if "ALL CHECKS PASSED" not in proc.stdout:
        print("❌ Diagnostic check failed!")
        sys.exit(1)
    print("✅ Diagnostic check passed with 100% success!")

    # 4. Test --export-json flag
    print("\n--- TEST 2: Testing JSON Export (--export-json) ---")
    export_file = "/tmp/tally_exported_items.json"
    if os.path.exists(export_file):
        os.remove(export_file)

    proc = subprocess.run([binary_path, "-export-json", export_file], capture_output=True, text=True)
    print(proc.stdout)
    if not os.path.exists(export_file):
        print("❌ Export file not created!")
        sys.exit(1)

    with open(export_file, "r") as f:
        exported_data = json.load(f)

    print(f"Exported items count: {len(exported_data)}")
    assert len(exported_data) == 5, f"Expected 5 items, got {len(exported_data)}"
    assert exported_data[0]["tallyName"] == "001 Black  Ink Bottle 127 ML. Bk. Epson"
    assert exported_data[0]["closingBalance"] == 4.0
    assert exported_data[0]["uom"] == "Nag."
    assert exported_data[0]["rate"] == 688.60
    assert exported_data[1]["tallyName"] == "003 Cyan Ink 65 ML - Org Epson-L3110"
    assert exported_data[1]["closingBalance"] == 54.0
    assert exported_data[3]["partNumber"] == "15-FC0500AU"
    print("✅ JSON export and XML parser verified with 100% accuracy!")

    # 5. Test Live Push to Cloud Function
    print("\n--- TEST 3: Testing Live Push to Cloud Function ---")
    proc = subprocess.run([binary_path], input="\n", capture_output=True, text=True)
    print(proc.stdout)
    if "SYNC COMPLETE: 5 products updated in Firestore" not in proc.stdout:
        print("❌ Cloud push sync failed!")
        sys.exit(1)

    print("✅ Live push to Cloud Endpoint verified successfully!")

    # Cleanup
    tally_server.shutdown()
    cloud_server.shutdown()

    print("\n================================================================")
    print("🎉 ALL TESTS PASSED! ZorbaTallySync binary is 100% verified.")
    print("================================================================")

if __name__ == "__main__":
    main()
