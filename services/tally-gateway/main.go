package main

import (
"context"
"encoding/json"
"fmt"
"io"
"log"
"net/http"
"os"
"regexp"
"strings"
"sync"
"time"

"cloud.google.com/go/firestore"
"google.golang.org/api/iterator"
)

const (
ServiceName = "zorba-tally-gateway"
Version     = "1.3.0"
DefaultKey  = "fS2DEpX7qMPvtd7mUEoQ8obRRrPZp4nARXDfkyoXWFN3hzkvtRh27Vs4Xzk6zz5mDWscr3rxteuoJbxb3tGdT1jiKPgyb7mbSrPe8pWVIUofFaSWkPCpfmJmNaaI5TlS"
)

type InspectionSnapshot struct {
ID            string                 `json:"id"`
ReceivedAt    string                 `json:"receivedAt"`
Timestamp     int64                  `json:"timestamp"`
ContentType   string                 `json:"contentType"`
ContentLength int                    `json:"contentLength"`
SourceIP      string                 `json:"sourceIP"`
UserAgent     string                 `json:"userAgent"`
RawData       string                 `json:"rawData,omitempty"`
ParsedFormat  string                 `json:"parsedFormat"`
ItemCount     int                    `json:"itemCount"`
SamplePreview []map[string]any       `json:"samplePreview"`
ParsedData    any                    `json:"parsedData,omitempty"`
Metadata      map[string]any         `json:"metadata"`
}

type SnapshotSummary struct {
ID            string           `json:"id"`
ReceivedAt    string           `json:"receivedAt"`
Timestamp     int64            `json:"timestamp"`
ContentType   string           `json:"contentType"`
ContentLength int              `json:"contentLength"`
SourceIP      string           `json:"sourceIP"`
UserAgent     string           `json:"userAgent"`
ParsedFormat  string           `json:"parsedFormat"`
ItemCount     int              `json:"itemCount"`
SamplePreview []map[string]any `json:"samplePreview"`
Summary       any              `json:"summary,omitempty"`
ActiveCompany string           `json:"activeCompany,omitempty"`
}

var (
snapshotMutex sync.RWMutex
snapshots     []InspectionSnapshot
maxSnapshots  = 50
firestoreClient *firestore.Client
expectedSyncKey string
)

func init() {
expectedSyncKey = os.Getenv("ZORBA_SYNC_KEY")
if expectedSyncKey == "" {
expectedSyncKey = DefaultKey
}

ctx := context.Background()
projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
if projectID == "" {
projectID = "zorba-infotech-web"
}

var err error
firestoreClient, err = firestore.NewClient(ctx, projectID)
if err != nil {
log.Printf("[Firestore] Warning: could not initialize Firestore client: %v", err)
} else {
log.Printf("[Firestore] Connected to project: %s", projectID)
}
}

func flexibleAnalyze(rawBody string, contentType string) (string, int, []map[string]any, any) {
	trimmed := strings.TrimSpace(rawBody)
	var samples []map[string]any

	// 1. Try JSON
	var genericObj map[string]any
	if err := json.Unmarshal([]byte(trimmed), &genericObj); err == nil {
		// If payload is FullDumpPayload
		if summary, ok := genericObj["summary"].(map[string]any); ok {
			for k, v := range summary {
				samples = append(samples, map[string]any{"table": k, "count": v})
			}
			return "json_full_database_dump", len(samples), samples, genericObj
		}

		if items, ok := genericObj["items"].([]any); ok {
			for i, it := range items {
				if i >= 10 {
					break
				}
				if m, ok := it.(map[string]any); ok {
					samples = append(samples, m)
				}
			}
			return "json_items", len(items), samples, genericObj
		}

		// Generic Object
		for k, v := range genericObj {
			if len(samples) >= 10 {
				break
			}
			if k != "rawXmlDumps" && k != "rawTallyXml" {
				samples = append(samples, map[string]any{"key": k, "value": v})
			}
		}
		return "json_object", len(genericObj), samples, genericObj
	}

	var genericArr []any
	if err := json.Unmarshal([]byte(trimmed), &genericArr); err == nil {
		for i, it := range genericArr {
			if i >= 10 {
				break
			}
			if m, ok := it.(map[string]any); ok {
				samples = append(samples, m)
			} else {
				samples = append(samples, map[string]any{"entry": it})
			}
		}
		return "json_array", len(genericArr), samples, genericArr
	}

// 2. Try XML
if strings.HasPrefix(trimmed, "<") || strings.Contains(trimmed, "<ENVELOPE>") {
itemCount := strings.Count(trimmed, "<STOCKITEM>") + strings.Count(trimmed, "<ROW>") + strings.Count(trimmed, "<LINE>")
if itemCount == 0 {
itemCount = 1
}
previewSnippet := trimmed
if len(previewSnippet) > 1000 {
previewSnippet = previewSnippet[:1000] + "..."
}
samples = append(samples, map[string]any{
"type":    "xml_snippet",
"preview": previewSnippet,
})
return "xml_tally", itemCount, samples, trimmed
}

// 3. Fallback CSV / text
lines := strings.Split(trimmed, "\n")
for i, l := range lines {
if i >= 10 {
break
}
samples = append(samples, map[string]any{
"line": i + 1,
"text": strings.TrimSpace(l),
})
}
return "text_csv", len(lines), samples, trimmed
}

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
return func(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Zorba-Sync-Key")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

if r.Method == http.MethodOptions {
w.WriteHeader(http.StatusOK)
return
}

key := r.Header.Get("X-Zorba-Sync-Key")
if key == "" {
authHeader := r.Header.Get("Authorization")
key = strings.TrimPrefix(authHeader, "Bearer ")
}
if key == "" {
key = r.URL.Query().Get("key")
}

if key != expectedSyncKey {
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusUnauthorized)
json.NewEncoder(w).Encode(map[string]any{
"error":   "Unauthorized: Invalid or missing X-Zorba-Sync-Key",
"status":  401,
"service": ServiceName,
})
return
}

next(w, r)
}
}

type BrandRuleEntry struct {
	Canonical string   `json:"canonical"`
	Patterns  []string `json:"patterns"`
}

type CategoryRuleEntry struct {
	CategoryID       string   `json:"categoryId"`
	CategoryName     string   `json:"categoryName"`
	Keywords         []string `json:"keywords"`
	NegativeKeywords []string `json:"negativeKeywords"`
}

type SyncRuleConfig struct {
	UpdatedAt          int64               `json:"updatedAt"`
	ScrapKeywords      []string            `json:"scrapKeywords"`
	ExactJunkNames     []string            `json:"exactJunkNames"`
	TallyGroupMappings map[string]string   `json:"tallyGroupMappings"`
	BrandRules         []BrandRuleEntry    `json:"brandRules"`
	CategoryRules      []CategoryRuleEntry `json:"categoryRules"`
}

var (
	rulesMutex sync.RWMutex
	cachedRuleConfig *SyncRuleConfig
	lastRulesFetch time.Time
)

func getDefaultRuleConfig() *SyncRuleConfig {
	return &SyncRuleConfig{
		UpdatedAt: time.Now().UnixMilli(),
		ScrapKeywords: []string{
			"scrap", "old ", "old item", "second hand", "old printer", "old ram", "old cabinet",
			"old ups", "old led", "old motherboard", "old power supply", "old broadband",
			"old ont", "old adapter", "old battery", "old laminator", "old note book",
			"service repair", "repair charge", "installation charge", "labour charge",
			"courier charge", "freight", "maintenance charge", "service charge", "sms pack",
			"demo item", "demo", "sample", "testing", "replacement", "for replacement",
			"gst sales", "gst purchase", "gst sale",
		},
		ExactJunkNames: []string{
			"gst purchase @ 18% item", "gst purchase @ 12 % item", "gst purchase @ 28 % item",
			"gst purchase @ 5%", "gst sales @ 28 %", "gst sales @28% with quantity",
			"gst sales & services @ 12%", "gst sales & services @ 18%", "gst sales peripherals- 84716060",
			"gst sales patch cord cable", "gst sales 120 gm powder universal - 37079090",
			"gst sales printer ink tank - 84433100", "gst sales lamination machine", "old items",
			"b b b b 2", "f f f f 6", "g g g g 7", "o o o o  15", "wwww  23", "zzzz  26",
		},
		TallyGroupMappings: map[string]string{
			"printers": "printer", "printer": "printer", "printing consumables": "toner-cartridge",
			"toners": "toner-cartridge", "cartridges": "toner-cartridge", "laptops": "laptop",
			"laptop": "laptop", "desktops": "desktop-pc", "desktop pc": "desktop-pc",
			"cctv": "cctv-security", "cctv cameras": "cctv-security", "security cameras": "cctv-security",
			"networking": "router-networking", "routers": "router-networking", "switches": "router-networking",
			"monitors": "monitor-display", "led monitors": "monitor-display", "ups": "ups-inverter",
			"inverters": "ups-inverter", "scanners": "scanner-billing", "pos": "scanner-billing",
			"biometric": "biometric-attendance", "biometrics": "biometric-attendance",
			"processors": "processor", "cpu": "processor", "accessories": "accessories",
		},
		BrandRules: []BrandRuleEntry{
			{Canonical: "HP", Patterns: []string{"hp", "hewlett", "laser tank", "smart tank", "deskjet", "laserjet"}},
			{Canonical: "Epson", Patterns: []string{"epson", "ecotank", "eco tank"}},
			{Canonical: "Canon", Patterns: []string{"canon", "pixma", "imageclass", "lbp"}},
			{Canonical: "Samsung", Patterns: []string{"samsung"}},
			{Canonical: "Dell", Patterns: []string{"dell", "vostro", "inspiron", "latitude", "optiplex"}},
			{Canonical: "Lenovo", Patterns: []string{"lenovo", "thinkpad", "ideapad", "thinkcentre"}},
			{Canonical: "Acer", Patterns: []string{"acer", "aspire", "travelmate", "nitro"}},
			{Canonical: "ASUS", Patterns: []string{"asus", "zenbook", "vivobook", "tuf", "rog"}},
			{Canonical: "Apple", Patterns: []string{"apple", "macbook", "ipad", "iphone"}},
			{Canonical: "Gigabyte", Patterns: []string{"gigabyte", "gigabye"}},
			{Canonical: "MSI", Patterns: []string{"msi"}},
			{Canonical: "ASRock", Patterns: []string{"asrock"}},
			{Canonical: "Intel", Patterns: []string{"intel", "core i3", "core i5", "core i7", "core i9", "pentium", "celeron"}},
			{Canonical: "AMD", Patterns: []string{"amd", "ryzen", "radeon"}},
			{Canonical: "Western Digital", Patterns: []string{"western digital", "wd", "sn570", "sn580", "sn770", "purple surveillance", "red nas"}},
			{Canonical: "Seagate", Patterns: []string{"seagate", "barracuda", "skyhawk", "ironwolf"}},
			{Canonical: "SanDisk", Patterns: []string{"sandisk"}},
			{Canonical: "Crucial", Patterns: []string{"crucial", "micron"}},
			{Canonical: "Kingston", Patterns: []string{"kingston", "fury"}},
			{Canonical: "ADATA", Patterns: []string{"adata"}},
			{Canonical: "Brother", Patterns: []string{"brother"}},
			{Canonical: "Ricoh", Patterns: []string{"ricoh"}},
			{Canonical: "TVS", Patterns: []string{"tvs", "tvs electronics"}},
			{Canonical: "WeP", Patterns: []string{"wep"}},
			{Canonical: "Hikvision", Patterns: []string{"hikvision", "ezviz"}},
			{Canonical: "CP Plus", Patterns: []string{"cp plus", "cpplus"}},
			{Canonical: "Dahua", Patterns: []string{"dahua"}},
			{Canonical: "Trueview", Patterns: []string{"trueview"}},
			{Canonical: "TP-Link", Patterns: []string{"tp-link", "tplink", "t-link"}},
			{Canonical: "D-Link", Patterns: []string{"d-link", "dlink"}},
			{Canonical: "Tenda", Patterns: []string{"tenda"}},
			{Canonical: "Digisol", Patterns: []string{"digisol"}},
			{Canonical: "Logitech", Patterns: []string{"logitech"}},
			{Canonical: "Zebronics", Patterns: []string{"zebronics", "zeb"}},
			{Canonical: "Portronics", Patterns: []string{"portronics"}},
			{Canonical: "Lapcare", Patterns: []string{"lapcare", "lapstar"}},
			{Canonical: "Frontech", Patterns: []string{"frontech"}},
			{Canonical: "iBall", Patterns: []string{"iball"}},
			{Canonical: "Quantum", Patterns: []string{"quantum", "qhmpl"}},
			{Canonical: "FINGERS", Patterns: []string{"fingers"}},
			{Canonical: "Formujet", Patterns: []string{"formujet", "indigo"}},
			{Canonical: "ProDot", Patterns: []string{"prodot", "pro dot"}},
			{Canonical: "Mantra", Patterns: []string{"mantra", "mfs100", "mfs500"}},
			{Canonical: "Morpho", Patterns: []string{"morpho"}},
			{Canonical: "Quick Heal", Patterns: []string{"quick heal", "quickheal"}},
			{Canonical: "Microtek", Patterns: []string{"microtek"}},
			{Canonical: "Luminous", Patterns: []string{"luminous"}},
		},
		CategoryRules: []CategoryRuleEntry{
			{
				CategoryID: "processor", CategoryName: "Processor",
				Keywords: []string{"processor", "cpu", "core i3", "core i5", "core i7", "core i9", "ryzen", "pentium gold", "celeron", "athlon", "12100", "12400", "13100", "13400", "14100", "14400", "5600g", "8500g", "5700g", "3200g"},
				NegativeKeywords: []string{"fan", "cooler", "paste", "heatsink", "cable", "motherboard", "cabinet", "all in one", "desktop"},
			},
			{
				CategoryID: "printer", CategoryName: "Printer",
				Keywords: []string{"printer", "all in one printer", "ecotank", "smart tank", "laserjet", "deskjet", "lbp", "l3210", "l8180", "l3110", "l3310", "l4360", "l6490", "l8050", "l11050", "l130", "1008a", "1008w", "1188a", "1188w", "1020 plus", "1020w", "1005 printer", "dot matrix", "passbook", "dcp-", "hl-", "m126", "mf271", "p1108"},
				NegativeKeywords: []string{"ink", "toner", "cartridge", "powder", "drum", "blade", "cable", "roller", "adapter"},
			},
			{
				CategoryID: "toner-cartridge", CategoryName: "Toner / Cartridge",
				Keywords: []string{"ink", "toner", "tonner", "cartridge", "cartdge", "ribbon", "refill", "opc drum", "wiper blade", "doctor blade", "toner powder", "t003", "t001", "003", "001", "005", "057", "052", "12a", "88a", "cyan", "magenta", "yellow", "black ink", "ink bottle", "waste box"},
				NegativeKeywords: []string{"printer", "adapter", "cable", "toolkit"},
			},
			{
				CategoryID: "laptop", CategoryName: "Laptop",
				Keywords: []string{"laptop", "notebook", "macbook", "thinkpad", "ideapad", "vivobook", "zenbook", "inspiron", "vostro", "latitude", "aspire", "victus", "pavilion", "omen", "legion", "loq", "15-fc", "15-fd", "15-eq", "15-du", "15s-", "14-ep"},
				NegativeKeywords: []string{"bag", "cover", "sleeve", "skin", "adapter", "battery", "keyboard", "screen guard"},
			},
			{
				CategoryID: "desktop-pc", CategoryName: "Desktop & PC",
				Keywords: []string{"motherboard", "h610", "b550", "h81", "h110", "b760", "a520", "b450", "q270", "h55", "h61", "g41", "all in one pc", "desktop pc", "branded pc", "gaming cabinet", "pc cabinet", "ram", "ddr3", "ddr4", "ddr5", "sata hdd", "hard disk", "internal ssd", "nvme ssd", "graphic card", "gtx", "rtx", "gt 710", "gt 730"},
				NegativeKeywords: []string{"bag", "cover", "screws", "converter", "cable", "external"},
			},
			{
				CategoryID: "cctv-security", CategoryName: "CCTV & Security",
				Keywords: []string{"cctv", "camera", "dvr", "nvr", "dome camera", "bullet camera", "ptz", "4g camera", "wifi camera", "solar camera", "hikvision", "cp plus", "trueview", "hi focus", "ezviz", "prama"},
				NegativeKeywords: []string{"cable", "bnc", "connector", "adapter", "dc pin", "stand"},
			},
			{
				CategoryID: "router-networking", CategoryName: "Router & Networking",
				Keywords: []string{"router", "poe switch", "gigabit switch", "access point", "mesh wifi", "ont", "gpon", "epon", "media converter", "patch panel", "server rack", "network rack", "modem", "broadband"},
				NegativeKeywords: []string{"cat6 cable", "patch cord", "rj45", "tool"},
			},
			{
				CategoryID: "monitor-display", CategoryName: "Monitor & Display",
				Keywords: []string{"led monitor", "tft monitor", "desktop monitor", "interactive panel", "projector screen", "projection screen", "projector", "touch display", "ips monitor"},
				NegativeKeywords: []string{"cable", "stand", "mount", "remote"},
			},
			{
				CategoryID: "ups-inverter", CategoryName: "UPS & Inverter",
				Keywords: []string{"ups", "inverter", "microtek legend", "amaron ups", "luminous ups", "mini ups", "mls1255", "u1205", "zeb-u735"},
				NegativeKeywords: []string{"battery only", "cable", "repair"},
			},
			{
				CategoryID: "scanner-billing", CategoryName: "Scanner & Billing",
				Keywords: []string{"barcode scanner", "2d scanner", "pos terminal", "thermal receipt", "bill printer", "currency counting", "currency counter", "cash drawer", "barcode printer", "barcode sticker", "direct thermal", "thermal roll", "billing roll"},
				NegativeKeywords: []string{"cable", "adapter"},
			},
			{
				CategoryID: "biometric-attendance", CategoryName: "Biometric & Attendance",
				Keywords: []string{"biometric", "attendance", "fingerprint", "face recognition", "access control", "morpho", "mantra", "mfs100", "mfs500", "mfs 110", "bioface", "secugen", "startek", "iris scanner"},
				NegativeKeywords: []string{"cable", "stand"},
			},
			{
				CategoryID: "accessories", CategoryName: "Accessories",
				Keywords: []string{"cable", "cord", "adapter", "charger", "mouse", "keyboard", "pad", "headphone", "speaker", "webcam", "toolkit", "case", "sleeve", "caddy", "paste", "power bank", "roller", "gear", "fuser", "blade", "hinge", "battery"},
				NegativeKeywords: []string{},
			},
		},
	}
}

func getActiveRules(ctx context.Context) *SyncRuleConfig {
	rulesMutex.RLock()
	if cachedRuleConfig != nil && time.Since(lastRulesFetch) < 5*time.Minute {
		defer rulesMutex.RUnlock()
		return cachedRuleConfig
	}
	rulesMutex.RUnlock()

	// Refresh from Firestore
	rulesMutex.Lock()
	defer rulesMutex.Unlock()

	if firestoreClient != nil {
		docRef := firestoreClient.Collection("settings").Doc("tally_rules")
		snap, err := docRef.Get(ctx)
		if err == nil && snap.Exists() {
			var config SyncRuleConfig
			if err := snap.DataTo(&config); err == nil && len(config.CategoryRules) > 0 {
				cachedRuleConfig = &config
				lastRulesFetch = time.Now()
				return cachedRuleConfig
			}
		}
	}

	if cachedRuleConfig == nil {
		cachedRuleConfig = getDefaultRuleConfig()
		lastRulesFetch = time.Now()
	}
	return cachedRuleConfig
}

func isNonProductLedger(ctx context.Context, name, parent string) bool {
	rules := getActiveRules(ctx)
	text := strings.ToLower(strings.TrimSpace(name + " " + parent))
	lowerName := strings.ToLower(strings.TrimSpace(name))
	lowerParent := strings.ToLower(strings.TrimSpace(parent))

	for _, junk := range rules.ExactJunkNames {
		if lowerName == strings.ToLower(junk) || lowerParent == strings.ToLower(junk) {
			return true
		}
	}

	for _, kw := range rules.ScrapKeywords {
		if strings.Contains(text, strings.ToLower(kw)) {
			return true
		}
	}
	return false
}

func inferBrandAndCategory(ctx context.Context, name, parent string) (brand string, catID string, catName string) {
	rules := getActiveRules(ctx)
	text := strings.ToLower(strings.TrimSpace(name + " " + parent))
	lowerParent := strings.ToLower(strings.TrimSpace(parent))

	// 1. Detect Brand
	brand = "General"
	for _, b := range rules.BrandRules {
		for _, pat := range b.Patterns {
			if strings.Contains(text, strings.ToLower(pat)) {
				brand = b.Canonical
				break
			}
		}
		if brand != "General" {
			break
		}
	}

	// 2. Check Tally StockGroup direct mapping
	if lowerParent != "" {
		if targetCatID, exists := rules.TallyGroupMappings[lowerParent]; exists {
			for _, cr := range rules.CategoryRules {
				if cr.CategoryID == targetCatID {
					return brand, targetCatID, cr.CategoryName
				}
			}
			return brand, targetCatID, "General"
		}
	}

	// 3. Category keyword scoring
	bestCatID := "accessories"
	bestCatName := "Accessories"
	highestScore := 0

	for _, cat := range rules.CategoryRules {
		if cat.CategoryID == "accessories" {
			continue
		}

		// Negative keywords check
		blocked := false
		for _, neg := range cat.NegativeKeywords {
			if strings.Contains(text, strings.ToLower(neg)) {
				blocked = true
				break
			}
		}
		if blocked {
			continue
		}

		score := 0
		for _, kw := range cat.Keywords {
			lkw := strings.ToLower(kw)
			if strings.Contains(text, lkw) {
				score += len(lkw) * 2
			}
		}

		if score > highestScore {
			highestScore = score
			bestCatID = cat.CategoryID
			bestCatName = cat.CategoryName
		}
	}

	return brand, bestCatID, bestCatName
}

var (
	phoneRegex          = regexp.MustCompile(`(?:(?:\+?91[\-\s]?)|(?:\b0))?([6-9]\d{9})\b`)
	leadingCodeRegex    = regexp.MustCompile(`^\d+\s+`)
	mobilePrefixRegex   = regexp.MustCompile(`(?i)\b(mo|mob|mobile|ph|phone|contact)[\s\:\-\.]*`)
	trailingPunctRegex  = regexp.MustCompile(`[\-,\s/]+$`)
	leadingPunctRegex   = regexp.MustCompile(`^\s*[\-,\s/]+`)
	multiSpaceRegex     = regexp.MustCompile(`\s+`)
	groupCodeRegex      = regexp.MustCompile(`^\d+\s*[\-\.]\s*`)
	spacedNorthRegex    = regexp.MustCompile(`(?i)\bN\s*O\s*R\s*T\s*H\b`)
	spacedEastRegex     = regexp.MustCompile(`(?i)\bE\s*A\s*S\s*T\b`)
	spacedSouthRegex    = regexp.MustCompile(`(?i)\bS\s*O\s*U\s*T\s*H\b`)
	spacedWestRegex     = regexp.MustCompile(`(?i)\bW\s*E\s*S\s*T\b`)
	dirPrefixRegex      = regexp.MustCompile(`(?i)^(North|East|South|West)\s*[\-\:]\s*`)
	debtorsCodeRegex    = regexp.MustCompile(`(?i)\s*debtors\s*[\-\:]\s*code[\-\s\d]*`)
	debtorsWordRegex    = regexp.MustCompile(`(?i)\s*debtors\b`)
	plusSpacingRegex    = regexp.MustCompile(`\s*\+\s*`)
	commaSpaceRegex     = regexp.MustCompile(`\s*,\s*`)
	dashSpaceRegex      = regexp.MustCompile(`\s*-\s*`)
)

func toTitleCaseString(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) > 0 {
			lower := strings.ToLower(w)
			words[i] = strings.ToUpper(lower[:1]) + lower[1:]
		}
	}
	return strings.Join(words, " ")
}

func extractIndianPhoneNumbers(text string) []string {
	if text == "" {
		return nil
	}
	matches := phoneRegex.FindAllStringSubmatch(text, -1)
	seen := make(map[string]bool)
	var phones []string
	for _, m := range matches {
		if len(m) >= 2 {
			digits := m[1]
			if len(digits) == 10 {
				formatted := "91" + digits
				if !seen[formatted] {
					seen[formatted] = true
					phones = append(phones, formatted)
				}
			}
		}
	}
	return phones
}

func cleanTallyCustomerName(rawName string) string {
	name := phoneRegex.ReplaceAllString(rawName, "")
	name = leadingCodeRegex.ReplaceAllString(name, "")
	name = mobilePrefixRegex.ReplaceAllString(name, "")
	name = commaSpaceRegex.ReplaceAllString(name, ", ")
	name = dashSpaceRegex.ReplaceAllString(name, " - ")
	name = trailingPunctRegex.ReplaceAllString(name, "")
	name = leadingPunctRegex.ReplaceAllString(name, "")
	name = multiSpaceRegex.ReplaceAllString(name, " ")
	return toTitleCaseString(name)
}

func normalizeTallyGroupAndAddress(parentGroup string) (string, string) {
	raw := strings.TrimSpace(parentGroup)
	if raw == "" || strings.EqualFold(raw, "sundry debtors") {
		return "Sundry Debtors", ""
	}

	prefix := ""
	rest := raw
	if loc := groupCodeRegex.FindStringIndex(raw); loc != nil && loc[0] == 0 {
		matched := raw[loc[0]:loc[1]]
		prefix = multiSpaceRegex.ReplaceAllString(matched, "")
		if !strings.HasSuffix(prefix, "-") {
			prefix += "-"
		}
		rest = raw[loc[1]:]
	}

	g := spacedNorthRegex.ReplaceAllString(rest, "North")
	g = spacedEastRegex.ReplaceAllString(g, "East")
	g = spacedSouthRegex.ReplaceAllString(g, "South")
	g = spacedWestRegex.ReplaceAllString(g, "West")
	g = dirPrefixRegex.ReplaceAllString(g, "")
	g = debtorsCodeRegex.ReplaceAllString(g, "")
	g = debtorsWordRegex.ReplaceAllString(g, "")
	g = plusSpacingRegex.ReplaceAllString(g, " + ")
	g = trailingPunctRegex.ReplaceAllString(g, "")
	g = leadingPunctRegex.ReplaceAllString(g, "")
	g = multiSpaceRegex.ReplaceAllString(g, " ")

	cleanRest := toTitleCaseString(strings.TrimSpace(g))
	normalizedGroup := cleanRest
	if prefix != "" {
		normalizedGroup = prefix + cleanRest
	}
	address := cleanRest

	return normalizedGroup, address
}

func extractCityFromCustomer(rawName, parentGroup string) string {
	combined := strings.ToLower(rawName + " " + parentGroup)
	city := "Neemuch"
	knownCities := []struct{ key, name string }{
		{"neemuch", "Neemuch"},
		{"jawad", "Jawad"},
		{"mandsaur", "Mandsaur"},
		{"manasa", "Manasa"},
		{"singoli", "Singoli"},
		{"rampura", "Rampura"},
		{"ratlam", "Ratlam"},
		{"nayagaon", "Nayagaon"},
		{"suvakheda", "Suvakheda"},
		{"khor", "Khor"},
		{"bharbhadiya", "Bharbhadiya"},
		{"indore", "Indore"},
		{"bhopal", "Bhopal"},
	}
	for _, kc := range knownCities {
		if strings.Contains(combined, kc.key) {
			city = kc.name
			break
		}
	}
	return city
}

func cleanGSTINNumber(raw string) string {
	raw = strings.TrimSpace(strings.ToUpper(raw))
	if len(raw) == 15 {
		return raw
	}
	return ""
}

func inferCategory(ctx context.Context, name, parent string) (string, string) {
	_, catID, catName := inferBrandAndCategory(ctx, name, parent)
	return catID, catName
}

func processStockAndCustomerSync(ctx context.Context, parsedData any, timestamp int64, isDryRun bool, targetScope string, sourceIP string, userAgent string, company string) (map[string]any, error) {
	if targetScope == "" {
	}

	result := map[string]any{
		"isDryRun":               isDryRun,
		"syncScope":              targetScope,
		"timestamp":              timestamp,
		"dateFormatted":          time.UnixMilli(timestamp).Format("02 Jan 2006, 03:04 PM"),
		"createdProductsCount":   0,
		"updatedProductsCount":   0,
		"createdCustomersCount":  0,
		"scrapItemsIgnoredCount": 0,
		"createdProducts":        []map[string]any{},
		"updatedProducts":        []map[string]any{},
		"createdCustomers":       []map[string]any{},
		"scrapItems":             []map[string]any{},
		"errors":                 []string{},
	}

	if firestoreClient == nil {
		return result, fmt.Errorf("firestore client is not initialized")
	}

	var items []map[string]any
	var ledgers []map[string]any

	if m, ok := parsedData.(map[string]any); ok {
		if t, ok := m["target"].(string); ok && t != "" {
			targetScope = t
		} else if t, ok := m["syncScope"].(string); ok && t != "" {
			targetScope = t
		}

		if targetScope != "customers" {
			if rawItems, exists := m["items"].([]any); exists {
				for _, it := range rawItems {
					if itemMap, ok := it.(map[string]any); ok {
						items = append(items, itemMap)
					}
				}
			} else if rawItems, exists := m["changedItems"].([]any); exists {
				for _, it := range rawItems {
					if itemMap, ok := it.(map[string]any); ok {
						items = append(items, itemMap)
					}
				}
			}
		}

		if targetScope != "stock" {
			if rawLedgers, exists := m["ledgers"].([]any); exists {
				for _, l := range rawLedgers {
					if lMap, ok := l.(map[string]any); ok {
						ledgers = append(ledgers, lMap)
					}
				}
			}
		}
	} else if arr, ok := parsedData.([]any); ok {
		if targetScope != "customers" {
			for _, it := range arr {
				if itemMap, ok := it.(map[string]any); ok {
					items = append(items, itemMap)
				}
			}
		}
	}

	createdProducts := []map[string]any{}
	updatedProducts := []map[string]any{}
	scrapItems := []map[string]any{}
	createdCustomers := []map[string]any{}

	// 1. Process Stock Items
	if len(items) > 0 {
		// Collect doc refs to check existence
		docRefs := make([]*firestore.DocumentRef, 0, len(items))
		itemByDocRef := make(map[string]map[string]any)

		for _, it := range items {
			guid, _ := it["guid"].(string)
			if guid == "" {
				guid, _ = it["id"].(string)
			}
			if guid == "" {
				continue
			}
			ref := firestoreClient.Collection("products").Doc(guid)
			docRefs = append(docRefs, ref)
			itemByDocRef[guid] = it
		}

		// Check existing docs in Firestore (batch get up to 500)
		existingSnapshots := make(map[string]*firestore.DocumentSnapshot)
		const getBatchSize = 400
		for i := 0; i < len(docRefs); i += getBatchSize {
			end := i + getBatchSize
			if end > len(docRefs) {
				end = len(docRefs)
			}
			snaps, err := firestoreClient.GetAll(ctx, docRefs[i:end])
			if err == nil {
				for _, snap := range snaps {
					if snap.Exists() {
						existingSnapshots[snap.Ref.ID] = snap
					}
				}
			}
		}

		const batchLimit = 400
		for i := 0; i < len(items); i += batchLimit {
			end := i + batchLimit
			if end > len(items) {
				end = len(items)
			}
			chunk := items[i:end]
			var batch *firestore.WriteBatch
			if !isDryRun {
				batch = firestoreClient.Batch()
			}

			for _, it := range chunk {
				guid, _ := it["guid"].(string)
				if guid == "" {
					guid, _ = it["id"].(string)
				}
				if guid == "" {
					continue
				}

				stockCount := 0.0
				switch v := it["closingBalance"].(type) {
				case float64:
					stockCount = v
				case int:
					stockCount = float64(v)
				case int64:
					stockCount = float64(v)
				}

				uom, _ := it["uom"].(string)
				if uom == "" {
					uom = "Nag."
				}

				name, _ := it["name"].(string)
				parent, _ := it["parent"].(string)
				partNumber, _ := it["partNumber"].(string)
				hsn, _ := it["hsn"].(string)

				rate := 0.0
				switch rv := it["rate"].(type) {
				case float64:
					rate = rv
				case int:
					rate = float64(rv)
				case int64:
					rate = float64(rv)
				}

				brand, catID, catName := inferBrandAndCategory(ctx, name, parent)
				isNonProd := isNonProductLedger(ctx, name, parent)

				if isNonProd {
					scrapItems = append(scrapItems, map[string]any{
						"name":   name,
						"parent": parent,
						"reason": "Internal accounting / scrap / non-product entry",
					})
				}

				existingSnap, exists := existingSnapshots[guid]
				if exists {
					oldData := existingSnap.Data()
					oldStock := 0.0
					if s, ok := oldData["stockCount"].(float64); ok {
						oldStock = s
					}
					oldPrice := 0.0
					if p, ok := oldData["price"].(float64); ok {
						oldPrice = p
					}

					updatedProducts = append(updatedProducts, map[string]any{
						"guid":      guid,
						"name":      name,
						"brand":     brand,
						"oldStock":  oldStock,
						"newStock":  stockCount,
						"oldPrice":  oldPrice,
						"newPrice":  rate,
						"uom":       uom,
						"category":  catName,
					})
				} else {
					createdProducts = append(createdProducts, map[string]any{
						"guid":       guid,
						"name":       name,
						"brand":      brand,
						"category":   catName,
						"categoryId": catID,
						"stock":      stockCount,
						"rate":       rate,
						"uom":        uom,
						"isScrap":    isNonProd,
					})
				}

				if !isDryRun && batch != nil {
					docRef := firestoreClient.Collection("products").Doc(guid)
					dataToUpdate := map[string]any{
						"stockCount": stockCount,
						"inStock":    stockCount > 0,
						"uom":        uom,
						"updatedAt":  timestamp,
					}

					if name != "" {
						dataToUpdate["id"] = guid
						dataToUpdate["tallyGuid"] = guid
						dataToUpdate["name"] = name
						dataToUpdate["model"] = name
						dataToUpdate["tallyName"] = name
						dataToUpdate["parentGroup"] = parent
						dataToUpdate["brand"] = brand
						dataToUpdate["categoryId"] = catID
						dataToUpdate["category"] = catName
						dataToUpdate["showOnWebsite"] = !isNonProd
						dataToUpdate["showPriceOnWebsite"] = rate > 0
						if isNonProd {
							dataToUpdate["isScrap"] = true
						}
						if hsn != "" {
							dataToUpdate["hsnCode"] = hsn
						}
						if partNumber != "" {
							dataToUpdate["partNumber"] = partNumber
						}
						if rate > 0 {
							dataToUpdate["price"] = rate
						}
					}

					batch.Set(docRef, dataToUpdate, firestore.MergeAll)
				}
			}

			if !isDryRun && batch != nil {
				if _, err := batch.Commit(ctx); err != nil {
					log.Printf("[Firestore Live Sync] Error committing batch: %v", err)
				}
			}
		}
	}

	// 2. Process Customers / Sundry Debtors
	if len(ledgers) > 0 {
		var customerBatch *firestore.WriteBatch
		if !isDryRun {
			customerBatch = firestoreClient.Batch()
		}

		for _, l := range ledgers {
			parent, _ := l["parent"].(string)
			lowerParent := strings.ToLower(parent)

			// Exclude fixed assets, bank, cash, expenses, capital, supplier creditors
			if strings.Contains(lowerParent, "fixed asset") || strings.Contains(lowerParent, "bank") || strings.Contains(lowerParent, "cash") || strings.Contains(lowerParent, "creditor") || strings.Contains(lowerParent, "expense") || strings.Contains(lowerParent, "capital") || strings.Contains(lowerParent, "indirect") || strings.Contains(lowerParent, "direct") {
				continue
			}

			// Include debtors / customers / regional geographic groups
			isCustomerGroup := strings.Contains(lowerParent, "debtor") || strings.Contains(lowerParent, "customer") ||
				strings.Contains(lowerParent, "north") || strings.Contains(lowerParent, "south") ||
				strings.Contains(lowerParent, "east") || strings.Contains(lowerParent, "west") ||
				strings.Contains(lowerParent, "neemuch") || strings.Contains(lowerParent, "jawad") ||
				strings.Contains(lowerParent, "mandsaur") || strings.Contains(lowerParent, "manasa") ||
				strings.Contains(lowerParent, "singoli") || strings.Contains(lowerParent, "rampura") ||
				strings.Contains(lowerParent, "ratlam")

			if isCustomerGroup {
				guid, _ := l["guid"].(string)
				name, _ := l["name"].(string)
				rawGSTIN, _ := l["gstin"].(string)
				extraDetail, _ := l["extraDetail"].(string)
				if guid == "" || name == "" {
					continue
				}

				// Extract all phone numbers from name, extraDetail, narration
				combinedText := fmt.Sprintf("%s %s", name, extraDetail)
				phones := extractIndianPhoneNumbers(combinedText)
				primaryPhone := ""
				var additionalPhones []string
				if len(phones) > 0 {
					primaryPhone = phones[0]
					if len(phones) > 1 {
						additionalPhones = phones[1:]
					}
				}

				cleanName := cleanTallyCustomerName(name)
				if cleanName == "" {
					cleanName = toTitleCaseString(name)
				}
				normalizedGroup, address := normalizeTallyGroupAndAddress(parent)
				city := extractCityFromCustomer(name, parent)
				gstin := cleanGSTINNumber(rawGSTIN)

				var noteParts []string
				if parent != "" {
					noteParts = append(noteParts, fmt.Sprintf("Tally Group: %s", parent))
				}
				if gstin != "" {
					noteParts = append(noteParts, fmt.Sprintf("GSTIN: %s", gstin))
				}
				notes := strings.Join(noteParts, " | ")

				custInfo := map[string]any{
					"guid":             guid,
					"name":             cleanName,
					"rawName":          name,
					"parent":           parent,
					"group":            normalizedGroup,
					"phone":            primaryPhone,
					"additionalPhones": additionalPhones,
					"city":             city,
					"address":          address,
					"gstin":            gstin,
					"notes":            notes,
				}
				createdCustomers = append(createdCustomers, custInfo)

				if !isDryRun && customerBatch != nil {
					custRef := firestoreClient.Collection("customers").Doc(guid)
					custData := map[string]any{
						"id":          guid,
						"tallyGuid":   guid,
						"name":        cleanName,
						"companyName": cleanName,
						"phone":       primaryPhone,
						"city":        city,
						"group":       normalizedGroup,
						"notes":       notes,
						"createdAt":   timestamp,
						"updatedAt":   timestamp,
					}
					if address != "" {
						custData["address"] = address
					}
					if len(additionalPhones) > 0 {
						custData["additionalPhones"] = additionalPhones
					}
					if gstin != "" {
						custData["gstin"] = gstin
					}

					customerBatch.Set(custRef, custData, firestore.MergeAll)
				}
			}
		}

		if !isDryRun && customerBatch != nil {
			if _, err := customerBatch.Commit(ctx); err != nil {
				log.Printf("[Firestore Customer Sync] Error committing customer batch: %v", err)
			}
		}
	}

	runID := fmt.Sprintf("run_%s_%d", time.UnixMilli(timestamp).Format("20060102_150405"), timestamp%1000)
	status := "success"
	if len(scrapItems) > 0 && len(createdProducts) == 0 && len(updatedProducts) == 0 {
		status = "warning"
	}

	result["id"] = runID
	result["runId"] = runID
	result["status"] = status
	result["company"] = company
	result["sourceIP"] = sourceIP
	result["userAgent"] = userAgent
	result["totalItemsScanned"] = len(items)
	result["changedItemsCount"] = len(items)
	result["createdProductsCount"] = len(createdProducts)
	result["updatedProductsCount"] = len(updatedProducts)
	result["createdCustomersCount"] = len(createdCustomers)
	result["scrapItemsIgnoredCount"] = len(scrapItems)
	result["createdProducts"] = createdProducts
	result["updatedProducts"] = updatedProducts
	result["createdCustomers"] = createdCustomers
	result["scrapItems"] = scrapItems

	// Save to tally_sync_runs collection in Firestore for the Admin UI
	runDoc := map[string]any{
		"id":                     runID,
		"timestamp":              timestamp,
		"dateFormatted":          result["dateFormatted"],
		"mode":                   map[bool]string{true: "dry_run", false: "live"}[isDryRun],
		"syncScope":              targetScope,
		"status":                 status,
		"source":                 "zorba_tally_windows_agent",
		"company":                company,
		"sourceIP":               sourceIP,
		"totalItemsScanned":      len(items),
		"changedItemsCount":      len(items),
		"createdProductsCount":   len(createdProducts),
		"updatedProductsCount":   len(updatedProducts),
		"createdCustomersCount":  len(createdCustomers),
		"scrapItemsIgnoredCount": len(scrapItems),
		"createdProducts":        createdProducts,
		"updatedProducts":        updatedProducts,
		"createdCustomers":       createdCustomers,
		"scrapItems":             scrapItems,
	}

	go func() {
		saveCtx, saveCancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer saveCancel()
		_, _ = firestoreClient.Collection("tally_sync_runs").Doc(runID).Set(saveCtx, runDoc)
	}()

	return result, nil
}

func handleInspect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed. Use POST.", http.StatusMethodNotAllowed)
		return
	}

	// 64MB body limit
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024*1024)
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body: "+err.Error(), http.StatusBadRequest)
		return
	}

	rawBody := string(bodyBytes)
	contentType := r.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}

	isDryRun := r.URL.Query().Get("dryRun") == "true" || r.URL.Query().Get("dry_run") == "true"
	targetScope := r.URL.Query().Get("target")
	if targetScope == "" {
		targetScope = r.URL.Query().Get("scope")
	}

	format, itemCount, samples, parsedData := flexibleAnalyze(rawBody, contentType)

	if m, ok := parsedData.(map[string]any); ok {
		if dr, ok := m["dryRun"].(bool); ok && dr {
			isDryRun = true
		} else if dr, ok := m["isDryRun"].(bool); ok && dr {
			isDryRun = true
		}
		if t, ok := m["target"].(string); ok && t != "" && targetScope == "" {
			targetScope = t
		} else if t, ok := m["syncScope"].(string); ok && t != "" && targetScope == "" {
			targetScope = t
		}
	}

	if targetScope == "" {
		targetScope = "all"
	}

	now := time.Now().UTC()
	snapID := fmt.Sprintf("snap_%s_%06d", now.Format("20060102_150405"), now.Nanosecond()/1000)

	var company string
	if m, ok := parsedData.(map[string]any); ok {
		if comp, exists := m["company"].(string); exists {
			company = comp
		} else if comp, exists := m["activeCompany"].(string); exists {
			company = comp
		}
	}

	syncResult, syncErr := processStockAndCustomerSync(r.Context(), parsedData, now.UnixMilli(), isDryRun, targetScope, r.RemoteAddr, r.Header.Get("User-Agent"), company)
	if syncErr != nil {
		log.Printf("[Sync Processor] Notice: %v", syncErr)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{
		"success":       true,
		"snapshotId":    snapID,
		"isDryRun":      isDryRun,
		"receivedBytes": len(bodyBytes),
		"parsedFormat":  format,
		"detectedItems": itemCount,
		"syncReport":    syncResult,
		"samplePreview": samples,
		"message": map[bool]string{
			true:  "Dry-run simulation completed successfully. 0 writes made to live database.",
			false: "Stock deltas and customers synced directly to live collections.",
		}[isDryRun],
	})
}

func handleGetSyncRuns(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if firestoreClient == nil {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]any{})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	limit := 30
	iter := firestoreClient.Collection("tally_sync_runs").OrderBy("timestamp", firestore.Desc).Limit(limit).Documents(ctx)
	var runs []map[string]any
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		data := doc.Data()
		data["id"] = doc.Ref.ID
		runs = append(runs, data)
	}

	json.NewEncoder(w).Encode(runs)
}

func handleGetSnapshots(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Content-Type", "application/json")

snapshotMutex.RLock()
defer snapshotMutex.RUnlock()

var list []SnapshotSummary
for _, s := range snapshots {
var activeComp string
var summary any
if m, ok := s.ParsedData.(map[string]any); ok {
if a, exists := m["activeCompany"].(string); exists {
activeComp = a
}
if sm, exists := m["summary"]; exists {
summary = sm
}
}

list = append(list, SnapshotSummary{
ID:            s.ID,
ReceivedAt:    s.ReceivedAt,
Timestamp:     s.Timestamp,
ContentType:   s.ContentType,
ContentLength: s.ContentLength,
SourceIP:      s.SourceIP,
UserAgent:     s.UserAgent,
ParsedFormat:  s.ParsedFormat,
ItemCount:     s.ItemCount,
SamplePreview: s.SamplePreview,
Summary:       summary,
ActiveCompany: activeComp,
})
}

json.NewEncoder(w).Encode(list)
}

func handlePreviewLatest(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Content-Type", "application/json")

snapshotMutex.RLock()
defer snapshotMutex.RUnlock()

if len(snapshots) == 0 {
w.WriteHeader(http.StatusNotFound)
json.NewEncoder(w).Encode(map[string]any{
"error": "No snapshots received yet",
})
return
}

latest := snapshots[0]
// Send summary preview without massive rawXmlDumps string to avoid 20MB response overhead
responseObj := map[string]any{
"id":            latest.ID,
"receivedAt":    latest.ReceivedAt,
"timestamp":     latest.Timestamp,
"contentType":   latest.ContentType,
"contentLength": latest.ContentLength,
"sourceIP":      latest.SourceIP,
"userAgent":     latest.UserAgent,
"parsedFormat":  latest.ParsedFormat,
"itemCount":     latest.ItemCount,
"samplePreview": latest.SamplePreview,
}

if m, ok := latest.ParsedData.(map[string]any); ok {
responseObj["activeCompany"] = m["activeCompany"]
responseObj["summary"] = m["summary"]
responseObj["companies"] = m["companies"]
if items, ok := m["items"].([]any); ok {
limit := 25
if len(items) < limit {
limit = len(items)
}
responseObj["sampleItems"] = items[:limit]
responseObj["totalItemsCount"] = len(items)
}
if groups, ok := m["stockGroups"].([]any); ok {
responseObj["stockGroups"] = groups
}
if units, ok := m["units"].([]any); ok {
responseObj["units"] = units
}
if godowns, ok := m["godowns"].([]any); ok {
responseObj["godowns"] = godowns
}
if ledgers, ok := m["ledgers"].([]any); ok {
limit := 25
if len(ledgers) < limit {
limit = len(ledgers)
}
responseObj["sampleLedgers"] = ledgers[:limit]
responseObj["totalLedgersCount"] = len(ledgers)
}
}

json.NewEncoder(w).Encode(responseObj)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusOK)

snapshotMutex.RLock()
count := len(snapshots)
snapshotMutex.RUnlock()

json.NewEncoder(w).Encode(map[string]any{
"status":    "healthy",
"service":   ServiceName,
"version":   Version,
"timestamp": time.Now().UTC().Format(time.RFC3339),
"snapshots": count,
"mode":      "INSPECTION_GATEWAY (Live DB untouched)",
})
}

func loadRecentSnapshotsFromFirestore() {
if firestoreClient == nil {
return
}
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

iter := firestoreClient.Collection("tally_inspection_snapshots").
OrderBy("timestamp", firestore.Desc).
Limit(10).
Documents(ctx)

var loaded []InspectionSnapshot
for {
doc, err := iter.Next()
if err == iterator.Done {
break
}
if err != nil {
log.Printf("[Firestore] Notice on reading docs: %v", err)
break
}
data := doc.Data()
snap := InspectionSnapshot{
ID:           doc.Ref.ID,
ReceivedAt:   fmt.Sprintf("%v", data["receivedAt"]),
ParsedFormat: fmt.Sprintf("%v", data["parsedFormat"]),
}
if cl, ok := data["contentLength"].(int64); ok {
snap.ContentLength = int(cl)
}
loaded = append(loaded, snap)
}

if len(loaded) > 0 {
snapshotMutex.Lock()
snapshots = append(snapshots, loaded...)
snapshotMutex.Unlock()
log.Printf("[Firestore] Pre-loaded %d historical inspection snapshots into memory.", len(loaded))
}
}

func main() {
port := os.Getenv("PORT")
if port == "" {
port = "8080"
}

go loadRecentSnapshotsFromFirestore()

mux := http.NewServeMux()
mux.HandleFunc("/health", handleHealth)
mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
if r.URL.Path == "/" || r.URL.Path == "" {
handleHealth(w, r)
return
}
if r.URL.Path == "/api/tally/inspect" || r.URL.Path == "/api/tally/ingest" || r.URL.Path == "/api/tally/sync" || r.URL.Path == "/syncTallyStock" {
AuthMiddleware(handleInspect)(w, r)
return
}
if strings.HasPrefix(r.URL.Path, "/api/tally/runs") {
AuthMiddleware(handleGetSyncRuns)(w, r)
return
}
if strings.HasPrefix(r.URL.Path, "/api/tally/snapshots") {
AuthMiddleware(handleGetSnapshots)(w, r)
return
}
if r.URL.Path == "/api/tally/preview-latest" {
AuthMiddleware(handlePreviewLatest)(w, r)
return
}
http.NotFound(w, r)
})

log.Printf("[%s v%s] Starting Cloud Run Tally Gateway on port :%s", ServiceName, Version, port)
if err := http.ListenAndServe(":"+port, mux); err != nil {
log.Fatalf("Server failed to start: %v", err)
}
}
