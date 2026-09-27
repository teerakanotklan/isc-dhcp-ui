package service

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

const (
	DefaultConfigPath = "/etc/dhcp/dhcpd.conf"
	ServiceName       = "isc-dhcp-server"
)

// ValidateConfigSyntax ทดสอบความถูกต้องของคอนฟิกด้วย dhcpd -t
func ValidateConfigSyntax(content string) (bool, string, error) {
	tmpFile, err := os.CreateTemp("/etc/dhcp", ".dhcpd_test_*.conf")
	if err != nil {
		return false, "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	_ = os.Chmod(tmpFile.Name(), 0644)

	if _, err := tmpFile.WriteString(content); err != nil {
		return false, "", fmt.Errorf("failed to write temp file: %w", err)
	}
	tmpFile.Close()

	cmd := exec.Command("dhcpd", "-t", "-cf", tmpFile.Name())
	out, err := cmd.CombinedOutput()
	outputStr := string(out)

	if err != nil {
		return false, outputStr, nil
	}
	return true, outputStr, nil
}

// DeployConfig บันทึกไฟล์และ Reload isc-dhcp-server
func DeployConfig(content string, configPath string) (string, error) {
	if configPath == "" {
		configPath = DefaultConfigPath
	}

	// 1. Dry run syntax check
	valid, out, err := ValidateConfigSyntax(content)
	if err != nil {
		return out, fmt.Errorf("dry-run error: %w", err)
	}
	if !valid {
		return out, fmt.Errorf("syntax validation failed:\n%s", out)
	}

	// 2. Backup existing config if exists
	if _, err := os.Stat(configPath); err == nil {
		backupPath := fmt.Sprintf("%s.bak.%s", configPath, time.Now().Format("20060102_150405"))
		if err := copyFile(configPath, backupPath); err != nil {
			return "", fmt.Errorf("failed to backup existing config: %w", err)
		}
	}

	// 3. Write new config
	if err := os.WriteFile(configPath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("failed to write config to %s: %w", configPath, err)
	}

	// 4. Reload or Restart service
	// ตรวจสอบว่า service รันอยู่หรือไม่
	isActive := CheckServiceActive()
	var reloadCmd *exec.Cmd
	if isActive {
		reloadCmd = exec.Command("systemctl", "restart", ServiceName)
	} else {
		reloadCmd = exec.Command("systemctl", "restart", ServiceName)
	}
	
	reloadOut, reloadErr := reloadCmd.CombinedOutput()
	if reloadErr != nil {
		return string(reloadOut), fmt.Errorf("failed to restart %s: %w (%s)", ServiceName, reloadErr, string(reloadOut))
	}

	return "Config deployed and service restarted successfully", nil
}

// CheckServiceActive ตรวจสอบว่า service รันอยู่หรือไม่
func CheckServiceActive() bool {
	cmd := exec.Command("systemctl", "is-active", ServiceName)
	out, err := cmd.Output()
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(out)) == "active"
}

// GetServiceStatus ดึงสถานะแบบละเอียดของ service
func GetServiceStatus() string {
	cmd := exec.Command("systemctl", "status", ServiceName, "--no-pager")
	out, _ := cmd.CombinedOutput()
	return string(out)
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
