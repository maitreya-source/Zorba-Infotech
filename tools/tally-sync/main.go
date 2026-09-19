package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// AppVersion follows semantic versioning (e.g. "3.0.0").
// NOTE: Always format version numbers strictly as X.Y.Z with no prefixes or suffixes (no "-delta-sync", etc.).
// Release zip archives must always follow the naming convention: zorba-website-tally-sync-v<X.Y.Z>.zip (e.g. zorba-website-tally-sync-v3.0.0.zip).
const AppVersion = "3.0.0"

type Config struct {
	TallyHost       string
	TallyCompany    string
	TallyUsername   string
	TallyPassword   string
	TallyTimeoutSec int
	CloudSyncURL    string
	CloudSyncKey    string
	IntervalHours   int
	LogFile         string
	Verbose         bool
	CacheFile       string
}

type TallyStockItem struct {
	TallyName      string  `json:"tallyName"`
	ClosingBalance float64 `json:"closingBalance"`
	UOM            string  `json:"uom,omitempty"`
	Rate           float64 `json:"rate,omitempty"`
	Value          float64 `json:"value,omitempty"`
	ParentGroup    string  `json:"parentGroup,omitempty"`
	Category       string  `json:"category,omitempty"`
	GUID           string  `json:"guid,omitempty"`
	PartNumber     string  `json:"partNumber,omitempty"`
	OpeningBalance float64 `json:"openingBalance,omitempty"`
	OpeningRate    float64 `json:"openingRate,omitempty"`
	OpeningValue   float64 `json:"openingValue,omitempty"`
	Description    string  `json:"description,omitempty"`
	HSNCode        string  `json:"hsnCode,omitempty"`
}

type DeltaSyncPayload struct {
	Source         string               `json:"source"`
	Timestamp      int64                `json:"timestamp"`
	Version        string               `json:"version"`
	Company        string               `json:"activeCompany,omitempty"`
	IsDelta        bool                 `json:"isDelta"`
	DryRun         bool                 `json:"dryRun,omitempty"`
	Target         string               `json:"target,omitempty"`
	TotalItems     int                  `json:"totalItems"`
	ChangedCount   int                  `json:"changedCount"`
	UnchangedCount int                  `json:"unchangedCount"`
	Items          []TallyStockItem     `json:"items"`
	Ledgers        []GenericTallyMaster `json:"ledgers,omitempty"`
}

type ItemHashCache map[string]string // GUID -> SHA256 Hash of mutable fields

type TallyCompanyInfo struct {
	Name         string `json:"name"`
	StartingFrom string `json:"startingFrom,omitempty"`
	BooksFrom    string `json:"booksFrom,omitempty"`
	StateName    string `json:"stateName,omitempty"`
	GUID         string `json:"guid,omitempty"`
}

type GenericTallyMaster struct {
Name        string `json:"name"`
Parent      string `json:"parent,omitempty"`
Type        string `json:"type,omitempty"`
Balance     string `json:"balance,omitempty"`
GUID        string `json:"guid,omitempty"`
ExtraDetail string `json:"extraDetail,omitempty"`
}

type FullDumpPayload struct {
Source      string                `json:"source"`
Timestamp   int64                 `json:"timestamp"`
Version     string                `json:"version"`
Company     string                `json:"activeCompany,omitempty"`
Companies   []TallyCompanyInfo    `json:"companies,omitempty"`
StockItems  []TallyStockItem      `json:"items"`
StockGroups []GenericTallyMaster  `json:"stockGroups,omitempty"`
Units       []GenericTallyMaster  `json:"units,omitempty"`
Godowns     []GenericTallyMaster  `json:"godowns,omitempty"`
Ledgers     []GenericTallyMaster  `json:"ledgers,omitempty"`
RawXmlDumps map[string]string     `json:"rawXmlDumps,omitempty"`
Summary     map[string]int        `json:"summary"`
}

type SyncResponse struct {
Success    bool              `json:"success"`
SnapshotId string            `json:"snapshotId,omitempty"`
Message    string            `json:"message"`
Error      string            `json:"error,omitempty"`
}

func defaultConfigFile() Config {
	return Config{
		TallyHost:       "http://localhost:9000",
		TallyCompany:    "",
		TallyUsername:   "",
		TallyPassword:   "",
		TallyTimeoutSec: 20,
		CloudSyncURL:    "https://zorba-tally-gateway-703650129045.asia-south1.run.app",
		CloudSyncKey:    "fS2DEpX7qMPvtd7mUEoQ8obRRrPZp4nARXDfkyoXWFN3hzkvtRh27Vs4Xzk6zz5mDWscr3rxteuoJbxb3tGdT1jiKPgyb7mbSrPe8pWVIUofFaSWkPCpfmJmNaaI5TlS",
		IntervalHours:   4,
		LogFile:         "zorba_sync.log",
		Verbose:         true,
	}
}

func LoadConfig() Config {
	cfg := defaultConfigFile()

	exePath, err := os.Executable()
	var configPath string
	if err == nil {
		configPath = filepath.Join(filepath.Dir(exePath), "config.ini")
	} else {
		configPath = "config.ini"
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		data, err = os.ReadFile("config.ini")
		if err != nil {
			return cfg
		}
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") || strings.HasPrefix(line, "[") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		switch strings.ToLower(key) {
		case "tallyhost", "host":
			cfg.TallyHost = val
		case "tallycompany", "company", "companyname":
			cfg.TallyCompany = val
		case "tallyusername", "username":
			cfg.TallyUsername = val
		case "tallypassword", "password":
			cfg.TallyPassword = val
		case "tallytimeoutsec", "timeout":
			if n, err := strconv.Atoi(val); err == nil && n > 0 {
				cfg.TallyTimeoutSec = n
			}
		case "cloudsyncurl", "syncurl", "url":
			cfg.CloudSyncURL = val
		case "cloudsynckey", "synckey", "key":
			cfg.CloudSyncKey = val
		case "intervalhours", "interval", "hours":
			if n, err := strconv.Atoi(val); err == nil && n > 0 {
				cfg.IntervalHours = n
			}
		case "logfile":
			cfg.LogFile = val
		case "verbose":
			cfg.Verbose = strings.ToLower(val) == "true" || val == "1"
		}
	}
	return cfg
}

func buildTallyCollectionRequest(collectionName, itemType, fetchFields, username, password, companyName string) string {
credXML := ""
if username != "" || password != "" {
credXML = fmt.Sprintf(`
    <TALLYCREDENTIALS>
      <USERNAME>%s</USERNAME>
      <PASSWORD>%s</PASSWORD>
    </TALLYCREDENTIALS>`, username, password)
}

companyXML := ""
if companyName != "" {
companyXML = fmt.Sprintf("\n        <SVCURRENTCOMPANY>%s</SVCURRENTCOMPANY>", companyName)
}

return fmt.Sprintf(`<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>%s
    <TYPE>Collection</TYPE>
    <ID>%s</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>%s
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="%s" ISINITIALIZE="Yes">
            <TYPE>%s</TYPE>
            <BELONGSTO>Yes</BELONGSTO>
            <FETCH>%s</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`, credXML, collectionName, companyXML, collectionName, itemType, fetchFields)
}

func executeTallyQuery(cfg Config, reqXML string) ([]byte, error) {
	// CRITICAL: Disable HTTP Keep-Alive so Go never holds a persistent TCP socket open
	// on Tally's single-threaded port 9000 (which otherwise blocks Tally Print & WhatsApp plugins).
	transport := &http.Transport{
		DisableKeepAlives:   true,
		MaxIdleConns:        1,
		MaxIdleConnsPerHost: 1,
		IdleConnTimeout:     1 * time.Second,
	}
	defer transport.CloseIdleConnections()

	client := &http.Client{
		Timeout:   time.Duration(cfg.TallyTimeoutSec) * time.Second,
		Transport: transport,
	}

	req, err := http.NewRequest("POST", cfg.TallyHost, bytes.NewBufferString(reqXML))
	if err != nil {
		return nil, fmt.Errorf("failed to build request: %w", err)
	}

	req.Close = true
	req.Header.Set("Connection", "close")
	req.Header.Set("Content-Type", "text/xml;charset=utf-8")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("connection to Tally failed (%s): %w", cfg.TallyHost, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return body, fmt.Errorf("Tally returned status %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

type XMLNode struct {
XMLName xml.Name
Attrs   []xml.Attr `xml:",any,attr"`
Content string     `xml:",chardata"`
	Nodes   []XMLNode  `xml:",any"`
}

func sanitizeTallyXML(xmlBytes []byte) []byte {
	// Remove invalid XML 1.0 control character references (e.g. &#4;, &#1;..&#31;) that TallyPrime emits
	s := string(xmlBytes)
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		if s[i] == '&' && i+2 < len(s) && s[i+1] == '#' {
			end := strings.IndexByte(s[i:], ';')
			if end > 2 && end <= 6 {
				numStr := s[i+2 : i+end]
				if code, err := strconv.Atoi(numStr); err == nil && code < 32 && code != 9 && code != 10 && code != 13 {
					i += end
					continue
				}
			}
		}
		b.WriteByte(s[i])
	}
	return []byte(b.String())
}

func parseGenericMasters(xmlBytes []byte, masterTag string) []GenericTallyMaster {
	var root XMLNode
	if err := xml.Unmarshal(sanitizeTallyXML(xmlBytes), &root); err != nil {
		return nil
	}

	var results []GenericTallyMaster
	var traverse func(node XMLNode)

	appendDetail := func(m *GenericTallyMaster, val string) {
		val = strings.TrimSpace(val)
		if val == "" || strings.EqualFold(val, m.Name) {
			return
		}
		if m.ExtraDetail != "" {
			m.ExtraDetail += " | " + val
		} else {
			m.ExtraDetail = val
		}
	}

	var extractFieldsRecursive func(n XMLNode, m *GenericTallyMaster)
	extractFieldsRecursive = func(n XMLNode, m *GenericTallyMaster) {
		for _, child := range n.Nodes {
			tag := strings.ToLower(child.XMLName.Local)
			val := strings.TrimSpace(child.Content)

			switch tag {
			case "name", "fldname":
				if val != "" {
					if m.Name == "" {
						m.Name = val
					} else {
						// Secondary <NAME> inside <LANGUAGENAME.LIST><NAME.LIST> is the Tally Alias
						// where Zorba stores customer mobile numbers and contact names!
						appendDetail(m, val)
					}
				}
			case "parent", "fldparent":
				if val != "" && m.Parent == "" {
					m.Parent = val
				}
			case "guid":
				if val != "" && m.GUID == "" {
					m.GUID = val
				}
			case "gstin", "partygstin":
				if val != "" {
					appendDetail(m, "GSTIN:"+val)
				}
			case "ledgerphone", "ledgermobile", "ledgercontact", "phone", "mobile", "address", "email", "narration", "pincode", "statename":
				if val != "" {
					appendDetail(m, val)
				}
			}

			// Recurse into nested lists such as <LANGUAGENAME.LIST>, <NAME.LIST>, <ADDRESS.LIST>
			if len(child.Nodes) > 0 {
				extractFieldsRecursive(child, m)
			}
		}
	}

	traverse = func(node XMLNode) {
		if strings.EqualFold(node.XMLName.Local, masterTag) || strings.EqualFold(node.XMLName.Local, "ROW") || strings.EqualFold(node.XMLName.Local, "LINE") {
			var m GenericTallyMaster
			m.Type = masterTag
			// 1. Check XML attributes on <LEDGER NAME="...">
			for _, attr := range node.Attrs {
				if strings.EqualFold(attr.Name.Local, "NAME") && m.Name == "" {
					m.Name = strings.TrimSpace(attr.Value)
				}
			}
			// 2. Recursively extract all fields & nested <LANGUAGENAME.LIST><NAME.LIST><NAME> aliases
			extractFieldsRecursive(node, &m)

			if m.Name != "" {
				results = append(results, m)
			}
			return
		}

		for _, child := range node.Nodes {
			traverse(child)
		}
	}

	traverse(root)
	return results
}

func parseCompanies(xmlBytes []byte) []TallyCompanyInfo {
var root XMLNode
if err := xml.Unmarshal(xmlBytes, &root); err != nil {
return nil
}

var results []TallyCompanyInfo
var traverse func(node XMLNode)

traverse = func(node XMLNode) {
if strings.EqualFold(node.XMLName.Local, "company") || strings.EqualFold(node.XMLName.Local, "ROW") {
var c TallyCompanyInfo
for _, child := range node.Nodes {
tag := strings.ToLower(child.XMLName.Local)
val := strings.TrimSpace(child.Content)
switch tag {
case "name", "fldname":
if c.Name == "" {
c.Name = val
}
case "startingfrom":
c.StartingFrom = val
case "booksfrom":
c.BooksFrom = val
case "statename":
c.StateName = val
case "guid":
c.GUID = val
}
}
if c.Name != "" {
results = append(results, c)
}
}

for _, child := range node.Nodes {
traverse(child)
}
}

traverse(root)
return results
}

func parseStockItems(xmlBytes []byte) []TallyStockItem {
var root XMLNode
if err := xml.Unmarshal(xmlBytes, &root); err != nil {
return nil
}

var items []TallyStockItem
var traverse func(node XMLNode)

traverse = func(node XMLNode) {
nameLower := strings.ToLower(node.XMLName.Local)
if nameLower == "stockitem" || nameLower == "line" || nameLower == "stock_summary_line" || nameLower == "row" {
var item TallyStockItem
for _, child := range node.Nodes {
tag := strings.ToLower(child.XMLName.Local)
val := strings.TrimSpace(child.Content)

switch tag {
case "name", "flditemname", "stockitemname", "itemname", "particulars":
if val != "" && item.TallyName == "" {
item.TallyName = val
}
case "closingbalance", "fldclosingbal", "quantity", "qty", "billedqty":
qty, uom := parseQuantityAndUOM(val)
item.ClosingBalance = qty
if item.UOM == "" && uom != "" {
item.UOM = uom
}
case "baseunits", "fldbaseunits", "uom", "unit":
if val != "" {
item.UOM = val
}
case "closingrate", "rate", "fldrate", "cost":
item.Rate = parseNumber(val)
case "closingvalue", "amount", "value", "fldamount":
item.Value = parseNumber(val)
case "parent", "fldparent", "stockgroup":
item.ParentGroup = val
case "category", "stockcategory":
item.Category = val
case "guid", "fldguid":
item.GUID = val
case "partno", "fldpartno", "itemcode":
item.PartNumber = val
case "openingbalance":
qty, _ := parseQuantityAndUOM(val)
item.OpeningBalance = qty
case "openingrate":
item.OpeningRate = parseNumber(val)
case "openingvalue":
item.OpeningValue = parseNumber(val)
case "description":
item.Description = val
case "hsncode":
item.HSNCode = val
}
}
if item.TallyName != "" {
items = append(items, item)
}
}

for _, child := range node.Nodes {
traverse(child)
}
}

traverse(root)
return items
}

func parseQuantityAndUOM(str string) (float64, string) {
str = strings.TrimSpace(str)
if str == "" {
return 0, ""
}
fields := strings.Fields(str)
if len(fields) == 0 {
return 0, ""
}
numStr := strings.ReplaceAll(fields[0], ",", "")
qty, err := strconv.ParseFloat(numStr, 64)
if err != nil {
qty = 0
}
uom := ""
if len(fields) > 1 {
uom = strings.Join(fields[1:], " ")
}
return qty, uom
}

func parseNumber(str string) float64 {
str = strings.TrimSpace(str)
if str == "" {
return 0
}
cleaned := strings.ReplaceAll(str, ",", "")
cleaned = strings.ReplaceAll(cleaned, "₹", "")
cleaned = strings.ReplaceAll(cleaned, "/-", "")
cleaned = strings.ReplaceAll(cleaned, "/Nag.", "")
cleaned = strings.ReplaceAll(cleaned, "/Mtr.", "")
fields := strings.Fields(cleaned)
if len(fields) == 0 {
return 0
}
num, err := strconv.ParseFloat(fields[0], 64)
if err != nil {
return 0
}
return num
}

func RunFullExploreAndDump(cfg Config) (*FullDumpPayload, error) {
payload := &FullDumpPayload{
Source:      "zorba_tally_windows_agent",
Timestamp:   time.Now().UnixMilli(),
Version:     AppVersion,
Company:     cfg.TallyCompany,
RawXmlDumps: make(map[string]string),
Summary:     make(map[string]int),
}

// 1. Explore Companies
fmt.Println("[1/6] Exploring Active Companies / Databases in Tally...")
compReq := buildTallyCollectionRequest("ZorbaCompanyList", "Company", "Name, StartingFrom, BooksFrom, StateName, Guid", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
if xmlBytes, err := executeTallyQuery(cfg, compReq); err == nil {
payload.RawXmlDumps["companies"] = string(xmlBytes)
payload.Companies = parseCompanies(xmlBytes)
payload.Summary["companies"] = len(payload.Companies)
fmt.Printf("      ✅ Found %d Companies in Tally.\n", len(payload.Companies))
for _, c := range payload.Companies {
fmt.Printf("        - Company: \"%s\" (Books from: %s)\n", c.Name, c.BooksFrom)
}
} else {
fmt.Printf("      ⚠️ Company query notice: %v\n", err)
}

// 2. Export All Stock Items (Full Master + Attributes)
fmt.Println("[2/6] Exporting Stock Items (Full Inventory Dump)...")
stockReq := buildTallyCollectionRequest("ZorbaStockItems", "StockItem", "NAME, PARENT, CATEGORY, BASEUNITS, CLOSINGBALANCE, CLOSINGRATE, CLOSINGVALUE, PARTNO, OPENINGBALANCE, OPENINGRATE, OPENINGVALUE, DESCRIPTION, HSNCODE, GUID", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
if xmlBytes, err := executeTallyQuery(cfg, stockReq); err == nil {
payload.RawXmlDumps["stockItems"] = string(xmlBytes)
payload.StockItems = parseStockItems(xmlBytes)
payload.Summary["stockItems"] = len(payload.StockItems)
fmt.Printf("      ✅ Found %d Stock Items (%d bytes XML).\n", len(payload.StockItems), len(xmlBytes))
} else {
fmt.Printf("      ❌ Stock items query error: %v\n", err)
}

// 3. Export Stock Groups / Categories
fmt.Println("[3/6] Exporting Stock Groups & Categories...")
groupReq := buildTallyCollectionRequest("ZorbaStockGroups", "StockGroup", "NAME, PARENT, GUID", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
if xmlBytes, err := executeTallyQuery(cfg, groupReq); err == nil {
payload.RawXmlDumps["stockGroups"] = string(xmlBytes)
payload.StockGroups = parseGenericMasters(xmlBytes, "StockGroup")
payload.Summary["stockGroups"] = len(payload.StockGroups)
fmt.Printf("      ✅ Found %d Stock Groups.\n", len(payload.StockGroups))
}

// 4. Export Units of Measurement
fmt.Println("[4/6] Exporting Units of Measure (UOM)...")
unitReq := buildTallyCollectionRequest("ZorbaUnits", "Unit", "NAME, ORIGINALNAME, GUID", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
if xmlBytes, err := executeTallyQuery(cfg, unitReq); err == nil {
payload.RawXmlDumps["units"] = string(xmlBytes)
payload.Units = parseGenericMasters(xmlBytes, "Unit")
payload.Summary["units"] = len(payload.Units)
fmt.Printf("      ✅ Found %d Units.\n", len(payload.Units))
}

// 5. Export Godowns / Warehouses
fmt.Println("[5/6] Exporting Godowns / Warehouses...")
godownReq := buildTallyCollectionRequest("ZorbaGodowns", "Godown", "NAME, PARENT, ADDRESS, PINCODE, GUID", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
if xmlBytes, err := executeTallyQuery(cfg, godownReq); err == nil {
payload.RawXmlDumps["godowns"] = string(xmlBytes)
payload.Godowns = parseGenericMasters(xmlBytes, "Godown")
payload.Summary["godowns"] = len(payload.Godowns)
fmt.Printf("      ✅ Found %d Godowns.\n", len(payload.Godowns))
}

// 6. Export Ledgers (Accounts / Suppliers / Customers)
fmt.Println("[6/6] Exporting Ledgers & Accounts...")
ledgerReq := buildTallyCollectionRequest("ZorbaLedgers", "Ledger", "NAME, PARENT, GSTIN, INCOMETAXNUMBER, LEDGERPHONE, LEDGERMOBILE, LEDGERCONTACT, EMAIL, ADDRESS, STATENAME, PINCODE, GUID, NARRATION", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
if xmlBytes, err := executeTallyQuery(cfg, ledgerReq); err == nil {
payload.RawXmlDumps["ledgers"] = string(xmlBytes)
payload.Ledgers = parseGenericMasters(xmlBytes, "Ledger")
payload.Summary["ledgers"] = len(payload.Ledgers)
fmt.Printf("      ✅ Found %d Ledgers.\n", len(payload.Ledgers))
}

return payload, nil
}

func PushDumpToCloud(cfg Config, dump *FullDumpPayload) (*SyncResponse, error) {
jsonData, err := json.Marshal(dump)
if err != nil {
return nil, fmt.Errorf("failed to marshal JSON payload: %w", err)
}

client := &http.Client{
Timeout: 60 * time.Second,
}

targetURL := cfg.CloudSyncURL
if !strings.Contains(targetURL, "/api/") && !strings.HasSuffix(targetURL, "/syncTallyStock") {
targetURL = strings.TrimRight(targetURL, "/") + "/api/tally/inspect"
}

req, err := http.NewRequest("POST", targetURL, bytes.NewBuffer(jsonData))
if err != nil {
return nil, fmt.Errorf("failed to create Cloud request: %w", err)
}

req.Header.Set("Content-Type", "application/json")
req.Header.Set("X-Zorba-Sync-Key", cfg.CloudSyncKey)
req.Header.Set("User-Agent", "ZorbaTallySync/"+AppVersion)

resp, err := client.Do(req)
if err != nil {
return nil, fmt.Errorf("cloud sync endpoint unreachable: %w", err)
}
defer resp.Body.Close()

bodyBytes, err := io.ReadAll(resp.Body)
if err != nil {
return nil, fmt.Errorf("failed to read cloud response: %w", err)
}

var syncResp SyncResponse
if err := json.Unmarshal(bodyBytes, &syncResp); err != nil {
if resp.StatusCode != http.StatusOK {
return nil, fmt.Errorf("cloud error (HTTP %d): %s", resp.StatusCode, string(bodyBytes))
}
return &SyncResponse{
Success: true,
Message: string(bodyBytes),
}, nil
}

return &syncResp, nil
}

func RunDiagnostics(cfg Config) {
fmt.Println("================================================================")
fmt.Println("             ZORBA TALLY LIVE SYNC - PRE-FLIGHT TEST            ")
fmt.Printf("                    Agent Version: %s\n", AppVersion)
fmt.Println("================================================================")
fmt.Println()

allPassed := true

fmt.Printf("[1/3] Checking Local Tally Server (%s)...\n", cfg.TallyHost)
compReq := buildTallyCollectionRequest("DiagCompany", "Company", "Name", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
xmlBytes, err := executeTallyQuery(cfg, compReq)
if err != nil {
allPassed = false
fmt.Printf("      ❌ FAILED: %v\n", err)
fmt.Println("      💡 Fix: Ensure TallyPrime is open on screen with your company loaded.")
} else {
fmt.Printf("      ✅ CONNECTED! Tally Server is active (%d bytes response).\n", len(xmlBytes))
}

diagURL := cfg.CloudSyncURL
if !strings.Contains(diagURL, "/health") && !strings.Contains(diagURL, "/api/") {
diagURL = strings.TrimRight(diagURL, "/") + "/health"
}
fmt.Printf("[2/3] Testing Cloud Gateway (%s)...\n", diagURL)
start := time.Now()
testClient := &http.Client{Timeout: 8 * time.Second}
req, _ := http.NewRequest("GET", diagURL, nil)
req.Header.Set("X-Zorba-Sync-Key", cfg.CloudSyncKey)
resp, err := testClient.Do(req)
latency := time.Since(start)

if err != nil {
allPassed = false
fmt.Printf("      ❌ FAILED: Cloud endpoint unreachable: %v\n", err)
} else {
resp.Body.Close()
fmt.Printf("      ✅ REACHABLE! Cloud Gateway latency: %v\n", latency)
}

fmt.Println("[3/3] Checking Company Mode...")
if cfg.TallyCompany != "" {
fmt.Printf("      Target Company: \"%s\"\n", cfg.TallyCompany)
} else {
fmt.Println("      Auto-detecting active screen company.")
}

fmt.Println()
fmt.Println("----------------------------------------------------------------")
if allPassed {
fmt.Println("🎉 STATUS: ALL CHECKS PASSED. Ready to run SyncStock.bat!")
} else {
fmt.Println("❌ STATUS: PRE-FLIGHT CHECK FAILED. Review errors above.")
}
fmt.Println("================================================================")
}

func computeItemHash(item TallyStockItem) string {
	raw := fmt.Sprintf("%s|%s|%.4f|%s|%.2f|%s|%s|%s|%s",
		item.GUID,
		item.TallyName,
		item.ClosingBalance,
		item.UOM,
		item.Rate,
		item.ParentGroup,
		item.Category,
		item.PartNumber,
		item.HSNCode,
	)
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

func getCacheFilePath(cfg Config) string {
	if cfg.CacheFile != "" {
		return cfg.CacheFile
	}
	exePath, err := os.Executable()
	if err == nil {
		return filepath.Join(filepath.Dir(exePath), "tally_hash_cache.json")
	}
	return "tally_hash_cache.json"
}

func loadHashCache(path string) ItemHashCache {
	cache := make(ItemHashCache)
	data, err := os.ReadFile(path)
	if err != nil {
		return cache
	}
	_ = json.Unmarshal(data, &cache)
	return cache
}

func saveHashCache(path string, cache ItemHashCache) error {
	data, err := json.MarshalIndent(cache, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func FilterStockDeltas(items []TallyStockItem, oldCache ItemHashCache) ([]TallyStockItem, ItemHashCache, int) {
	newCache := make(ItemHashCache, len(items))
	var changed []TallyStockItem
	unchangedCount := 0

	for _, item := range items {
		key := item.GUID
		if key == "" {
			key = item.TallyName
		}
		currentHash := computeItemHash(item)
		newCache[key] = currentHash

		oldHash, exists := oldCache[key]
		if !exists || oldHash != currentHash {
			changed = append(changed, item)
		} else {
			unchangedCount++
		}
	}

	return changed, newCache, unchangedCount
}

func PushDeltasToCloud(cfg Config, payload *DeltaSyncPayload) (*SyncResponse, error) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal JSON payload: %w", err)
	}

	client := &http.Client{
		Timeout: 60 * time.Second,
	}

	targetURL := cfg.CloudSyncURL
	if !strings.Contains(targetURL, "/api/") && !strings.HasSuffix(targetURL, "/syncTallyStock") {
		targetURL = strings.TrimRight(targetURL, "/") + "/api/tally/sync"
	}
	if payload.DryRun {
		if strings.Contains(targetURL, "?") {
			targetURL += "&dryRun=true"
		} else {
			targetURL += "?dryRun=true"
		}
	}

	req, err := http.NewRequest("POST", targetURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create Cloud request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Zorba-Sync-Key", cfg.CloudSyncKey)
	req.Header.Set("User-Agent", "ZorbaTallySync/"+AppVersion)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("cloud sync endpoint unreachable: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read cloud response: %w", err)
	}

	var syncResp SyncResponse
	if err := json.Unmarshal(bodyBytes, &syncResp); err != nil {
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("cloud error (HTTP %d): %s", resp.StatusCode, string(bodyBytes))
		}
		return &SyncResponse{
			Success: true,
			Message: string(bodyBytes),
		}, nil
	}

	return &syncResp, nil
}

func computeLedgerHash(l GenericTallyMaster) string {
	raw := fmt.Sprintf("L|%s|%s|%s|%s", l.GUID, l.Name, l.Parent, l.ExtraDetail)
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

func FilterLedgerDeltas(ledgers []GenericTallyMaster, oldCache ItemHashCache, mergedCache ItemHashCache) ([]GenericTallyMaster, int) {
	var changed []GenericTallyMaster
	unchangedCount := 0
	for _, l := range ledgers {
		key := "ledger:" + l.GUID
		if l.GUID == "" {
			key = "ledger:" + l.Name
		}
		currentHash := computeLedgerHash(l)
		mergedCache[key] = currentHash

		oldHash, exists := oldCache[key]
		if !exists || oldHash != currentHash {
			changed = append(changed, l)
		} else {
			unchangedCount++
		}
	}
	return changed, unchangedCount
}

func checkRemoteSyncTrigger(cfg Config) (bool, bool, string) {
	url := strings.TrimRight(cfg.CloudSyncURL, "/") + "/health?agent=1"
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false, false, ""
	}
	req.Header.Set("X-Zorba-Sync-Key", cfg.CloudSyncKey)
	resp, err := client.Do(req)
	if err != nil {
		return false, false, ""
	}
	defer resp.Body.Close()
	var data map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return false, false, ""
	}
	reqSync, _ := data["syncRequested"].(bool)
	forceFull, _ := data["forceFull"].(bool)
	scope, _ := data["syncScope"].(string)
	if scope == "" {
		scope = "all"
	}
	return reqSync, forceFull, scope
}

func PerformSync(cfg Config, forceFull bool, isDryRun bool, targetScope string) bool {
	if targetScope == "" {
		targetScope = "all"
	}

	fmt.Println("================================================================")
	scopeTitle := "INVENTORY & CUSTOMERS"
	if targetScope == "stock" {
		scopeTitle = "STOCK INVENTORY ONLY"
	} else if targetScope == "customers" {
		scopeTitle = "CUSTOMERS & DEBTORS ONLY"
	}

	if isDryRun {
		fmt.Printf("   ZORBA TALLY SYNC ENGINE [DRY-RUN: %s] - v%s    \n", scopeTitle, AppVersion)
	} else {
		fmt.Printf("   ZORBA TALLY SMART DELTA SYNC ENGINE [%s] - v%s  \n", scopeTitle, AppVersion)
	}
	fmt.Println("================================================================")
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	fmt.Printf("[%s] Exporting live data from local Tally (Scope: %s)...\n", timestamp, targetScope)

	var items []TallyStockItem
	var changedItems []TallyStockItem
	var totalItems int
	var unchangedCount int
	cachePath := getCacheFilePath(cfg)
	oldCache := loadHashCache(cachePath)
	newCache := make(ItemHashCache, len(oldCache)+1000)
	for k, v := range oldCache {
		newCache[k] = v
	}
	var stockQueryErr error
	var ledgerQueryErr error

	// 1. Export Stock Items (if target is stock or all)
	if targetScope != "customers" {
		stockReq := buildTallyCollectionRequest("ZorbaStockItems", "StockItem", "NAME, PARENT, CATEGORY, BASEUNITS, CLOSINGBALANCE, CLOSINGRATE, CLOSINGVALUE, PARTNO, OPENINGBALANCE, OPENINGRATE, OPENINGVALUE, DESCRIPTION, HSNCODE, GUID", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
		xmlBytes, err := executeTallyQuery(cfg, stockReq)
		if err != nil {
			stockQueryErr = err
			fmt.Printf("      ❌ FAILED querying Tally Stock Items: %v\n", err)
			if targetScope == "stock" {
				fmt.Println("      💡 Fix: Ensure Tally is open on screen, company is loaded, and Port 9000 is enabled.")
				return false
			}
		} else {
			items = parseStockItems(xmlBytes)
			totalItems = len(items)
			fmt.Printf("      Live Tally returned %d total stock items.\n", totalItems)

			if forceFull || len(oldCache) == 0 {
				fmt.Println("      Performing FULL stock snapshot inspection (--force mode or initial sync)...")
				changedItems = items
				for _, it := range items {
					k := it.GUID
					if k == "" {
						k = it.TallyName
					}
					newCache[k] = computeItemHash(it)
				}
				unchangedCount = 0
			} else {
				var stockCache ItemHashCache
				changedItems, stockCache, unchangedCount = FilterStockDeltas(items, oldCache)
				for k, v := range stockCache {
					newCache[k] = v
				}
				fmt.Printf("      Stock Delta Inspection: %d changed / new items, %d items unchanged.\n", len(changedItems), unchangedCount)
			}
		}
	}

	// 2. Export Ledgers (Customers / Sundry Debtors) (if target is customers or all)
	var ledgers []GenericTallyMaster
	var changedLedgers []GenericTallyMaster
	if targetScope != "stock" {
		ledgerReq := buildTallyCollectionRequest("ZorbaLedgers", "Ledger", "NAME, PARENT, GSTIN, PARTYGSTIN, INCOMETAXNUMBER, LEDGERPHONE, LEDGERMOBILE, LEDGERCONTACT, EMAIL, ADDRESS, STATENAME, PINCODE, GUID, NARRATION", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
		ledgerBytes, err := executeTallyQuery(cfg, ledgerReq)
		if err != nil {
			ledgerQueryErr = err
			fmt.Printf("      ❌ FAILED querying Tally Ledgers: %v\n", err)
			if targetScope == "customers" {
				fmt.Println("      💡 Fix: Ensure Tally is open on screen, company is loaded, and Port 9000 is enabled.")
				return false
			}
		} else {
			ledgers = parseGenericMasters(ledgerBytes, "Ledger")
			fmt.Printf("      Live Tally returned %d total Ledgers/Accounts.\n", len(ledgers))
			if forceFull {
				changedLedgers = ledgers
				for _, l := range ledgers {
					key := "ledger:" + l.GUID
					if l.GUID == "" {
						key = "ledger:" + l.Name
					}
					newCache[key] = computeLedgerHash(l)
				}
			} else {
				var ledgerUnchanged int
				changedLedgers, ledgerUnchanged = FilterLedgerDeltas(ledgers, oldCache, newCache)
				fmt.Printf("      Customer/Ledger Delta Inspection: %d changed / new ledgers (including phone aliases), %d unchanged.\n", len(changedLedgers), ledgerUnchanged)
			}
		}
	}

	// Abort if connectivity to Tally completely failed
	if stockQueryErr != nil && ledgerQueryErr != nil {
		fmt.Println()
		fmt.Println("❌ SYNC ABORTED: Could not connect to local Tally.")
		fmt.Println("💡 Waiting for TallyPrime to open on port 9000...")
		fmt.Println("================================================================")
		return false
	}

	if targetScope == "customers" && len(ledgers) == 0 {
		fmt.Println()
		fmt.Println("⚠️ NOTICE: 0 ledgers/customers were returned by Tally.")
		fmt.Println("================================================================")
		return false
	}

	if len(changedItems) == 0 && len(changedLedgers) == 0 {
		fmt.Println()
		fmt.Println("ZERO CHANGES DETECTED: All Stock Items & Customer Ledgers match Cloud state.")
		fmt.Println("Zero Firestore writes consumed ($0.00 cloud cost). Exiting cleanly.")
		fmt.Println("================================================================")
		return true
	}

	payload := &DeltaSyncPayload{
		Source:         "zorba_tally_windows_agent",
		Timestamp:      time.Now().UnixMilli(),
		Version:        AppVersion,
		Company:        cfg.TallyCompany,
		IsDelta:        !forceFull && len(oldCache) > 0,
		DryRun:         isDryRun,
		Target:         targetScope,
		TotalItems:     totalItems,
		ChangedCount:   len(changedItems),
		UnchangedCount: unchangedCount,
		Items:          changedItems,
		Ledgers:        changedLedgers,
	}

	if isDryRun {
		fmt.Printf("SIMULATING: Sending %d items / %d ledgers to Cloud for Dry-Run analysis (0 DB writes)...\n", len(changedItems), len(changedLedgers))
	} else {
		fmt.Printf("Uploading %d updated inventory items & %d updated customer ledgers to Zorba Cloud...\n", len(changedItems), len(changedLedgers))
	}

	resp, err := PushDeltasToCloud(cfg, payload)
	if err != nil {
		log.Printf("Cloud sync failed: %v\n", err)
		return false
	}

	// In live mode, save new cache upon successful cloud receipt
	if !isDryRun && len(newCache) > 0 {
		if err := saveHashCache(cachePath, newCache); err != nil {
			log.Printf("Warning saving hash cache: %v\n", err)
		} else {
			fmt.Printf("Updated local state cache: %s\n", cachePath)
		}
		fmt.Printf("SUCCESS: Cloud updated! (%s)\n", resp.Message)
	} else if isDryRun {
		fmt.Printf("DRY-RUN COMPLETED: %s\n", resp.Message)
		fmt.Println("No changes were written to your live database.")
	}
	fmt.Println("================================================================")
	return true
}

func main() {
	testFlag := flag.Bool("test", false, "Run pre-flight diagnostics")
	dryRunFlag := flag.Bool("dry-run", false, "Run simulation only (0 writes made to live database)")
	forceFlag := flag.Bool("force", false, "Force full re-sync of all 6,000+ items, ignoring cache")
	stockFlag := flag.Bool("stock", false, "Sync stock inventory items only")
	customerFlag := flag.Bool("customers", false, "Sync customers / Sundry Debtors ledgers only")
	allFlag := flag.Bool("all", false, "Sync both stock items and customers (Default)")
	targetFlag := flag.String("target", "", "Explicit target scope: 'stock', 'customers', or 'all'")
	daemonFlag := flag.Bool("daemon", false, "Run continuously in background daemon mode")
	hoursFlag := flag.Int("hours", 0, "Custom interval in hours")
	intervalFlag := flag.Int("interval", 0, "Custom interval in hours (alias for -hours)")
	minutesFlag := flag.Int("minutes", 0, "Custom interval in minutes (e.g. -minutes 15)")
	secondsFlag := flag.Int("seconds", 0, "Custom interval in seconds for rapid testing (e.g. -seconds 30)")
	exportFlag := flag.String("export-json", "", "Export full dump to local JSON file")
	flag.Parse()

	cfg := LoadConfig()

	// Determine target scope
	targetScope := "all"
	if *stockFlag {
		targetScope = "stock"
	} else if *customerFlag {
		targetScope = "customers"
	} else if *allFlag {
		targetScope = "all"
	} else if *targetFlag != "" {
		targetScope = strings.ToLower(strings.TrimSpace(*targetFlag))
	}

	// CLI flags override config.ini
	if *hoursFlag > 0 {
		cfg.IntervalHours = *hoursFlag
	} else if *intervalFlag > 0 {
		cfg.IntervalHours = *intervalFlag
	}

	if cfg.LogFile != "" {
		f, err := os.OpenFile(cfg.LogFile, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
		if err == nil {
			defer f.Close()
			mw := io.MultiWriter(os.Stdout, f)
			log.SetOutput(mw)
		}
	}

	if *testFlag {
		RunDiagnostics(cfg)
		return
	}

	if *exportFlag != "" {
		dump, err := RunFullExploreAndDump(cfg)
		if err != nil {
			log.Fatalf("Export error: %v", err)
		}
		data, _ := json.MarshalIndent(dump, "", "  ")
		if err := os.WriteFile(*exportFlag, data, 0644); err != nil {
			log.Fatalf("Write file error: %v", err)
		}
		fmt.Printf("Exported full dump to %s successfully.\n", *exportFlag)
		return
	}

	// If daemon mode is requested: enforce STRICT After-Hours Once-Per-Day policy
	// so Port 9000 is NEVER polled during business hours (09:00 - 22:00), preserving Tally Print & WhatsApp.
	if *daemonFlag || *hoursFlag > 0 || *intervalFlag > 0 || *minutesFlag > 0 || *secondsFlag > 0 {
		fmt.Printf("Zorba Tally Sync Agent v%s (After-Hours Once-Daily Mode).\n   Business Hours Guard ACTIVE (09:00 - 22:00): Zero port 9000 connections during working hours.\n   Will sync once daily after 22:00 (10:00 PM) or when manually triggered from Admin Dashboard.\n\n", AppVersion)

		var lastSyncedDate string
		watchTicker := time.NewTicker(60 * time.Second)
		defer watchTicker.Stop()

		checkAndRun := func() {
			now := time.Now()
			// 1. Check if Admin explicitly clicked "Trigger Live Sync" in Admin Dashboard (this only checks Cloud Run, NOT Tally port 9000!)
			if reqSync, reqForce, reqScope := checkRemoteSyncTrigger(cfg); reqSync {
				fmt.Printf("[Remote Trigger] Admin Dashboard requested immediate sync (force=%v, scope=%s)!\n", reqForce, reqScope)
				if PerformSync(cfg, reqForce, false, reqScope) {
					lastSyncedDate = now.Format("2006-01-02")
				}
				return
			}

			// 2. Business Hours Protection: Do NOT touch localhost:9000 between 9:00 AM and 10:00 PM!
			hour := now.Hour()
			isBusinessHours := hour >= 9 && hour < 22
			if isBusinessHours {
				return
			}

			// 3. Outside business hours (after 10:00 PM or before 9:00 AM): Run ONCE per calendar day
			todayStr := now.Format("2006-01-02")
			if lastSyncedDate != todayStr {
				if PerformSync(cfg, *forceFlag, *dryRunFlag, targetScope) {
					lastSyncedDate = todayStr
				}
			}
		}

		checkAndRun()
		for range watchTicker.C {
			checkAndRun()
		}
		return
	}

	// Default: Run one-shot smart delta sync
	PerformSync(cfg, *forceFlag, *dryRunFlag, targetScope)
}

