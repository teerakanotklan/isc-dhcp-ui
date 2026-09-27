package syncer

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type SyncerClient struct {
	client *http.Client
}

func NewSyncerClient() *SyncerClient {
	return &SyncerClient{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

type AgentDeployRequest struct {
	ConfigContent string `json:"config_content"`
}

type AgentResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Output  string `json:"output,omitempty"`
}

// ValidateRemote ส่ง config ไปทดสอบ dry-run บน Agent
func (s *SyncerClient) ValidateRemote(targetURL, token, configContent string) (bool, string, error) {
	reqBody, _ := json.Marshal(AgentDeployRequest{ConfigContent: configContent})
	req, err := http.NewRequest("POST", targetURL+"/api/validate", bytes.NewBuffer(reqBody))
	if err != nil {
		return false, "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := s.client.Do(req)
	if err != nil {
		return false, "", fmt.Errorf("remote connection failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var res AgentResponse
	_ = json.Unmarshal(body, &res)

	if resp.StatusCode != http.StatusOK || !res.Success {
		return false, res.Output, fmt.Errorf("syntax validation failed on remote node: %s", res.Message)
	}
	return true, res.Output, nil
}

// DeployRemote ส่ง config ไปเขียนทับและ reload บน Agent
func (s *SyncerClient) DeployRemote(targetURL, token, configContent string) (string, error) {
	reqBody, _ := json.Marshal(AgentDeployRequest{ConfigContent: configContent})
	req, err := http.NewRequest("POST", targetURL+"/api/deploy", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("remote deploy failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var res AgentResponse
	_ = json.Unmarshal(body, &res)

	if resp.StatusCode != http.StatusOK || !res.Success {
		return res.Output, fmt.Errorf("deploy failed on remote node: %s", res.Message)
	}
	return res.Message, nil
}

// GetRemoteStatus ตรวจสอบสถานะของ Agent ปลายทาง
func (s *SyncerClient) GetRemoteStatus(targetURL, token string) (bool, string, error) {
	req, err := http.NewRequest("GET", targetURL+"/api/status", nil)
	if err != nil {
		return false, "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := s.client.Do(req)
	if err != nil {
		return false, "offline", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var res map[string]interface{}
	_ = json.Unmarshal(body, &res)

	active, _ := res["service_active"].(bool)
	statusStr := "inactive"
	if active {
		statusStr = "active"
	}
	return active, statusStr, nil
}
