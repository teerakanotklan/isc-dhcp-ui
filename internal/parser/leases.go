package parser

import (
	"bufio"
	"os"
	"regexp"
	"strings"

	"dhcp-ui/internal/models"
)

var (
	leaseStartRegex    = regexp.MustCompile(`^lease\s+([0-9\.]+)\s+\{`)
	hardwareRegex      = regexp.MustCompile(`hardware\s+ethernet\s+([0-9a-fA-F:]+);`)
	clientHostRegex    = regexp.MustCompile(`client-hostname\s+"([^"]+)";`)
	bindingStateRegex  = regexp.MustCompile(`binding\s+state\s+([a-zA-Z\-]+);`)
	startsRegex        = regexp.MustCompile(`starts\s+[0-9]+\s+([0-9\/]+)\s+([0-9:]+);`)
	endsRegex          = regexp.MustCompile(`ends\s+[0-9]+\s+([0-9\/]+)\s+([0-9:]+);`)
	
	failoverBlockRegex = regexp.MustCompile(`^failover\s+peer\s+"([^"]+)"\s+state\s+\{`)
	myStateRegex       = regexp.MustCompile(`my\s+state\s+([a-zA-Z\-]+)(?:\s+at\s+[0-9]+\s+([0-9\/\s:]+))?;`)
	partnerStateRegex  = regexp.MustCompile(`partner\s+state\s+([a-zA-Z\-]+)(?:\s+at\s+[0-9]+\s+([0-9\/\s:]+))?;`)
)

// ParseLeasesFile อ่านและแยกวิเคราะห์ไฟล์ /var/lib/dhcp/dhcpd.leases
func ParseLeasesFile(path string) ([]models.LeaseRecord, models.FailoverStatus, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, models.FailoverStatus{MyState: "unknown", PartnerState: "unknown"}, err
	}
	defer file.Close()

	leasesMap := make(map[string]models.LeaseRecord)
	failoverStatus := models.FailoverStatus{
		MyState:      "unknown",
		PartnerState: "unknown",
	}

	scanner := bufio.NewScanner(file)
	var currentLease *models.LeaseRecord
	inFailoverBlock := false

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Failover block check
		if m := failoverBlockRegex.FindStringSubmatch(line); len(m) > 1 {
			inFailoverBlock = true
			failoverStatus.PeerName = m[1]
			continue
		}

		if inFailoverBlock {
			if strings.HasPrefix(line, "}") {
				inFailoverBlock = false
				continue
			}
			if m := myStateRegex.FindStringSubmatch(line); len(m) > 1 {
				failoverStatus.MyState = m[1]
				if len(m) > 2 && m[2] != "" {
					failoverStatus.LastStateChange = strings.TrimSpace(m[2])
				}
			}
			if m := partnerStateRegex.FindStringSubmatch(line); len(m) > 1 {
				failoverStatus.PartnerState = m[1]
			}
			continue
		}

		// Lease block check
		if m := leaseStartRegex.FindStringSubmatch(line); len(m) > 1 {
			currentLease = &models.LeaseRecord{
				IPAddress:    m[1],
				BindingState: "free",
			}
			continue
		}

		if currentLease != nil {
			if strings.HasPrefix(line, "}") {
				// บันทึกเฉพาะ lease ที่อัปเดตล่าสุดของ IP นั้นๆ
				if currentLease.BindingState == "active" || currentLease.MACAddress != "" {
					leasesMap[currentLease.IPAddress] = *currentLease
				}
				currentLease = nil
				continue
			}

			if m := hardwareRegex.FindStringSubmatch(line); len(m) > 1 {
				currentLease.MACAddress = strings.ToUpper(m[1])
			}
			if m := clientHostRegex.FindStringSubmatch(line); len(m) > 1 {
				currentLease.Hostname = m[1]
			}
			if m := bindingStateRegex.FindStringSubmatch(line); len(m) > 1 {
				currentLease.BindingState = m[1]
			}
			if m := startsRegex.FindStringSubmatch(line); len(m) > 2 {
				currentLease.Starts = m[1] + " " + m[2]
			}
			if m := endsRegex.FindStringSubmatch(line); len(m) > 2 {
				currentLease.Ends = m[1] + " " + m[2]
			}
		}
	}

	var results []models.LeaseRecord
	for _, l := range leasesMap {
		results = append(results, l)
	}

	return results, failoverStatus, scanner.Err()
}
