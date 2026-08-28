#!/usr/bin/env python3
"""
Mock Tally XML Server & Mock Cloud Endpoint for Automated Testing.
Simulates TallyPrime/Tally.ERP 9 XML HTTP server on port 9008.
"""

import http.server
import socketserver
import threading
import json
import time

MOCK_STOCK_XML = """<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Stock Summary</ID>
  </HEADER>
  <BODY>
    <DATA>
      <COLLECTION>
        <STOCKITEM>
          <FLDITEMNAME>001 Black  Ink Bottle 127 ML. Bk. Epson</FLDITEMNAME>
          <FLDCLOSINGBAL>4 Nag.</FLDCLOSINGBAL>
          <FLDBASEUNITS>Nag.</FLDBASEUNITS>
          <FLDRATE>688.60</FLDRATE>
          <FLDAMOUNT>2754.41</FLDAMOUNT>
          <FLDPARENT>Inks &amp; Toners</FLDPARENT>
          <FLDGUID>e001-epson-bk-127</FLDGUID>
          <FLDPARTNO>001-BK</FLDPARTNO>
        </STOCKITEM>
        <STOCKITEM>
          <FLDITEMNAME>003 Cyan Ink 65 ML - Org Epson-L3110</FLDITEMNAME>
          <FLDCLOSINGBAL>54 Nag.</FLDCLOSINGBAL>
          <FLDBASEUNITS>Nag.</FLDBASEUNITS>
          <FLDRATE>354.82</FLDRATE>
          <FLDAMOUNT>19160.23</FLDAMOUNT>
          <FLDPARENT>Inks &amp; Toners</FLDPARENT>
          <FLDGUID>e003-epson-c-65</FLDGUID>
          <FLDPARTNO>003-CYAN</FLDPARTNO>
        </STOCKITEM>
        <STOCKITEM>
          <FLDITEMNAME>057 Tonner Cartridge for Caonn  MF443 By Formujet</FLDITEMNAME>
          <FLDCLOSINGBAL>1 Nag.</FLDCLOSINGBAL>
          <FLDBASEUNITS>Nag.</FLDBASEUNITS>
          <FLDRATE>620.00</FLDRATE>
          <FLDAMOUNT>620.00</FLDAMOUNT>
          <FLDPARENT>Toner Cartridges</FLDPARENT>
          <FLDGUID>crg-057-mf443</FLDGUID>
          <FLDPARTNO>CRG-057</FLDPARTNO>
        </STOCKITEM>
        <STOCKITEM>
          <FLDITEMNAME>15-FC0500AU Laptop RYZEN3-8GB-512GB-15.6 Full HD - H P</FLDITEMNAME>
          <FLDCLOSINGBAL>1 Nag.</FLDCLOSINGBAL>
          <FLDBASEUNITS>Nag.</FLDBASEUNITS>
          <FLDRATE>43220.34</FLDRATE>
          <FLDAMOUNT>43220.34</FLDAMOUNT>
          <FLDPARENT>Laptops</FLDPARENT>
          <FLDGUID>hp-15-fc0500au-guid</FLDGUID>
          <FLDPARTNO>15-FC0500AU</FLDPARTNO>
        </STOCKITEM>
        <STOCKITEM>
          <FLDITEMNAME>1 Tb Sata Survilliance / SkyHawk BLUE Seagate</FLDITEMNAME>
          <FLDCLOSINGBAL>5 Nag.</FLDCLOSINGBAL>
          <FLDBASEUNITS>Nag.</FLDBASEUNITS>
          <FLDRATE>4575.12</FLDRATE>
          <FLDAMOUNT>22875.60</FLDAMOUNT>
          <FLDPARENT>Hard Disks &amp; Storage</FLDPARENT>
          <FLDGUID>seagate-1tb-skyhawk</FLDGUID>
          <FLDPARTNO>ST1000VX005</FLDPARTNO>
        </STOCKITEM>
      </COLLECTION>
    </DATA>
  </BODY>
</ENVELOPE>"""

socketserver.TCPServer.allow_reuse_address = True

class MockTallyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default server logs for cleaner test output

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        # Respond with valid Tally Stock Summary XML
        self.send_response(200)
        self.send_header('Content-Type', 'text/xml;charset=utf-8')
        self.end_headers()
        self.wfile.write(MOCK_STOCK_XML.encode('utf-8'))

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"Tally XML Server Active")

class MockCloudHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        sync_key = self.headers.get('X-Zorba-Sync-Key', '')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ready", "authorized": sync_key != ""}).encode('utf-8'))

    def do_POST(self):
        sync_key = self.headers.get('X-Zorba-Sync-Key', '')
        if not sync_key:
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Unauthorized"}).encode('utf-8'))
            return

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        payload = json.loads(post_data)
        items = payload.get('items', [])

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        resp = {
            "success": True,
            "updated": len(items),
            "skipped": 0,
            "message": f"Successfully updated {len(items)} items in Firestore."
        }
        self.wfile.write(json.dumps(resp).encode('utf-8'))

def run_servers():
    tally_server = socketserver.TCPServer(("127.0.0.1", 9008), MockTallyHandler)
    cloud_server = socketserver.TCPServer(("127.0.0.1", 9098), MockCloudHandler)

    t1 = threading.Thread(target=tally_server.serve_forever, daemon=True)
    t2 = threading.Thread(target=cloud_server.serve_forever, daemon=True)

    t1.start()
    t2.start()
    print("Mock Tally Server running on http://127.0.0.1:9008")
    print("Mock Cloud Function running on http://127.0.0.1:9098/syncTallyStock")

    return tally_server, cloud_server

if __name__ == "__main__":
    tally, cloud = run_servers()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        tally.shutdown()
        cloud.shutdown()
