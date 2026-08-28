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

const AppVersion = "2.0.0-delta-sync"

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
client := &http.Client{
Timeout: time.Duration(cfg.TallyTimeoutSec) * time.Second,
}

req, err := http.NewRequest("POST", cfg.TallyHost, bytes.NewBufferString(reqXML))
if err != nil {
return nil, fmt.Errorf("failed to build request: %w", err)
}

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

func parseGenericMasters(xmlBytes []byte, masterTag string) []GenericTallyMaster {
var root XMLNode
if err := xml.Unmarshal(xmlBytes, &root); err != nil {
return nil
}

var results []GenericTallyMaster
var traverse func(node XMLNode)

traverse = func(node XMLNode) {
if strings.EqualFold(node.XMLName.Local, masterTag) || strings.EqualFold(node.XMLName.Local, "ROW") || strings.EqualFold(node.XMLName.Local, "LINE") {
var m GenericTallyMaster
m.Type = masterTag
for _, child := range node.Nodes {
tag := strings.ToLower(child.XMLName.Local)
val := strings.TrimSpace(child.Content)
if val == "" {
continue
}
switch tag {
case "name", "fldname":
if m.Name == "" {
m.Name = val
}
case "parent", "fldparent":
m.Parent = val
case "closingbalance":
m.Balance = val
case "guid":
m.GUID = val
case "gstin", "partygstin":
if m.ExtraDetail != "" {
m.ExtraDetail += " " + val
} else {
m.ExtraDetail = val
}
case "ledgerphone", "ledgermobile", "ledgercontact", "phone", "mobile", "address", "email", "narration", "pincode", "statename":
if m.ExtraDetail != "" {
m.ExtraDetail += " " + val
} else {
m.ExtraDetail = val
}
}
}
if m.Name != "" {
results = append(results, m)
}
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
ledgerReq := buildTallyCollectionRequest("ZorbaLedgers", "Ledger", "NAME, PARENT, CLOSINGBALANCE, OPENINGBALANCE, GSTIN, INCOMETAXNUMBER, LEDGERPHONE, LEDGERMOBILE, LEDGERCONTACT, EMAIL, ADDRESS, STATENAME, PINCODE, GUID, NARRATION", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
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

func PerformSync(cfg Config, forceFull bool, isDryRun bool, targetScope string) {
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
	var newCache ItemHashCache
	var totalItems int
	var unchangedCount int
	cachePath := getCacheFilePath(cfg)
	oldCache := loadHashCache(cachePath)

	// 1. Export Stock Items (if target is stock or all)
	if targetScope != "customers" {
		stockReq := buildTallyCollectionRequest("ZorbaStockItems", "StockItem", "NAME, PARENT, CATEGORY, BASEUNITS, CLOSINGBALANCE, CLOSINGRATE, CLOSINGVALUE, PARTNO, OPENINGBALANCE, OPENINGRATE, OPENINGVALUE, DESCRIPTION, HSNCODE, GUID", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
		xmlBytes, err := executeTallyQuery(cfg, stockReq)
		if err != nil {
			log.Printf("Failed to query Tally Stock Items: %v\n", err)
			if targetScope == "stock" {
				return
			}
		} else {
			items = parseStockItems(xmlBytes)
			totalItems = len(items)
			fmt.Printf("      Live Tally returned %d total stock items.\n", totalItems)

			if forceFull || len(oldCache) == 0 {
				fmt.Println("      Performing FULL database snapshot inspection (--force mode or initial sync)...")
				changedItems = items
				newCache = make(ItemHashCache, len(items))
				for _, it := range items {
					k := it.GUID
					if k == "" {
						k = it.TallyName
					}
					newCache[k] = computeItemHash(it)
				}
				unchangedCount = 0
			} else {
				changedItems, newCache, unchangedCount = FilterStockDeltas(items, oldCache)
				fmt.Printf("      Delta Hash Inspection: %d changed / new items, %d items unchanged.\n", len(changedItems), unchangedCount)
			}
		}
	}

	// 2. Export Ledgers (Customers / Sundry Debtors) (if target is customers or all)
	var ledgers []GenericTallyMaster
	if targetScope != "stock" {
		ledgerReq := buildTallyCollectionRequest("ZorbaLedgers", "Ledger", "NAME, PARENT, CLOSINGBALANCE, OPENINGBALANCE, GSTIN, INCOMETAXNUMBER, LEDGERPHONE, LEDGERMOBILE, LEDGERCONTACT, EMAIL, ADDRESS, STATENAME, PINCODE, GUID, NARRATION", cfg.TallyUsername, cfg.TallyPassword, cfg.TallyCompany)
		if ledgerBytes, err := executeTallyQuery(cfg, ledgerReq); err == nil {
			ledgers = parseGenericMasters(ledgerBytes, "Ledger")
			fmt.Printf("      Live Tally returned %d total Ledgers/Accounts.\n", len(ledgers))
		} else {
			fmt.Printf("      Notice reading ledgers: %v\n", err)
		}
	}

	if len(changedItems) == 0 && len(ledgers) == 0 {
		fmt.Println()
		fmt.Println("ZERO CHANGES DETECTED: All selected items match Cloud state.")
		fmt.Println("Zero Firestore writes consumed ($0.00 cloud cost). Exiting cleanly.")
		fmt.Println("================================================================")
		return
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
		Ledgers:        ledgers,
	}

	if isDryRun {
		fmt.Printf("SIMULATING: Sending %d items / ledgers to Cloud for Dry-Run analysis (0 DB writes)...\n", len(changedItems)+len(ledgers))
	} else {
		fmt.Printf("Uploading %d updated inventory items & %d customers to Zorba Cloud...\n", len(changedItems), len(ledgers))
	}

	resp, err := PushDeltasToCloud(cfg, payload)
	if err != nil {
		log.Printf("Cloud sync failed: %v\n", err)
		return
	}

	// In live mode, save new cache upon successful cloud receipt if stock was updated
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
}

func main() {
	testFlag := flag.Bool("test", false, "Run pre-flight diagnostics")
	dryRunFlag := flag.Bool("dry-run", false, "Run simulation only (0 writes made to live database)")
	forceFlag := flag.Bool("force", false, "Force full re-sync of all 6,000+ items, ignoring cache")
	stockFlag := flag.Bool("stock", false, "Sync stock inventory items only")
	customerFlag := flag.Bool("customers", false, "Sync customers / Sundry Debtors ledgers only")
	allFlag := flag.Bool("all", false, "Sync both stock items and customers (Default)")
	targetFlag := flag.String("target", "", "Explicit target scope: 'stock', 'customers', or 'all'")
	daemonFlag := flag.Bool("daemon", false, "Run continuously in background daemon mode (Default: Every 4 Hours)")
	hoursFlag := flag.Int("hours", 0, "Custom interval in hours (Default: 4 hours)")
	intervalFlag := flag.Int("interval", 0, "Custom interval in hours (alias for -hours)")
	minutesFlag := flag.Int("minutes", 0, "Custom interval in minutes (e.g. -minutes 30)")
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

	// If daemon mode is requested
	if *daemonFlag || *hoursFlag > 0 || *intervalFlag > 0 || *minutesFlag > 0 || *secondsFlag > 0 {
		var syncDuration time.Duration
		if *secondsFlag > 0 {
			syncDuration = time.Duration(*secondsFlag) * time.Second
			fmt.Printf("Zorba Tally Smart Sync Agent v%s started in background daemon mode.\n   Frequency: Every %d seconds (Target: %s)\n\n", AppVersion, *secondsFlag, targetScope)
		} else if *minutesFlag > 0 {
			syncDuration = time.Duration(*minutesFlag) * time.Minute
			fmt.Printf("Zorba Tally Smart Sync Agent v%s started in background daemon mode.\n   Frequency: Every %d minutes (Target: %s)\n\n", AppVersion, *minutesFlag, targetScope)
		} else {
			syncDuration = time.Duration(cfg.IntervalHours) * time.Hour
			fmt.Printf("Zorba Tally Smart Sync Agent v%s started in background daemon mode.\n   Frequency: Every %d hours (Target: %s)\n\n", AppVersion, cfg.IntervalHours, targetScope)
		}

		// Initial sync on launch
		PerformSync(cfg, *forceFlag, *dryRunFlag, targetScope)

		ticker := time.NewTicker(syncDuration)
		defer ticker.Stop()
		for range ticker.C {
			PerformSync(cfg, false, false, targetScope)
		}
		return
	}

	// Default: Run one-shot smart delta sync
	PerformSync(cfg, *forceFlag, *dryRunFlag, targetScope)
}

