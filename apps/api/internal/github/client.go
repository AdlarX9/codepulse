package github

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Client handles GitHub App API interactions
type Client struct {
	AppID      string
	PrivateKey []byte
}

// NewClient creates a new GitHub client
func NewClient(appID string, privateKey []byte) *Client {
	return &Client{
		AppID:      appID,
		PrivateKey: privateKey,
	}
}

// VerifyWebhookSignature verifies the HMAC signature of a webhook payload
func VerifyWebhookSignature(payload []byte, signature string, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedMAC := mac.Sum(nil)
	expectedSignature := "sha256=" + hex.EncodeToString(expectedMAC)
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// GenerateJWT creates a JWT for GitHub App authentication
func (c *Client) GenerateJWT() (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"iat": now.Unix(),
		"exp": now.Add(10 * time.Minute).Unix(),
		"iss": c.AppID,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(c.PrivateKey)
	if err != nil {
		return "", fmt.Errorf("failed to parse private key: %w", err)
	}

	tokenString, err := token.SignedString(privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// GetInstallationToken gets an installation access token
func (c *Client) GetInstallationToken(installationID int64) (string, error) {
	jwtToken, err := c.GenerateJWT()
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("https://api.github.com/app/installations/%d/access_tokens", installationID)
	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+jwtToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to get installation token: %s", string(body))
	}

	var result struct {
		Token     string    `json:"token"`
		ExpiresAt time.Time `json:"expires_at"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Token, nil
}

// CheckRunRequest represents a GitHub Check Run request
type CheckRunRequest struct {
	Name        string                  `json:"name"`
	HeadSHA     string                  `json:"head_sha"`
	Status      string                  `json:"status"` // queued, in_progress, completed
	Conclusion  string                  `json:"conclusion,omitempty"` // success, failure, neutral, cancelled, skipped, timed_out, action_required
	StartedAt   *time.Time              `json:"started_at,omitempty"`
	CompletedAt *time.Time              `json:"completed_at,omitempty"`
	Output      *CheckRunOutput         `json:"output,omitempty"`
}

// CheckRunOutput represents the output section of a check run
type CheckRunOutput struct {
	Title   string `json:"title"`
	Summary string `json:"summary"`
	Text    string `json:"text,omitempty"`
}

// CreateCheckRun creates or updates a check run on GitHub
func (c *Client) CreateCheckRun(installationID int64, owner, repo string, checkRun *CheckRunRequest) error {
	token, err := c.GetInstallationToken(installationID)
	if err != nil {
		return fmt.Errorf("failed to get installation token: %w", err)
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/check-runs", owner, repo)
	
	body, err := json.Marshal(checkRun)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to create check run: %s", string(respBody))
	}

	return nil
}

// WebhookEvent represents common webhook event fields
type WebhookEvent struct {
	Action       string          `json:"action"`
	Installation *Installation   `json:"installation"`
	Repository   *Repository     `json:"repository"`
	Sender       *User           `json:"sender"`
}

// Installation represents a GitHub App installation
type Installation struct {
	ID      int64  `json:"id"`
	Account *User  `json:"account"`
}

// Repository represents a GitHub repository
type Repository struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	FullName      string `json:"full_name"`
	Private       bool   `json:"private"`
	Owner         *User  `json:"owner"`
	DefaultBranch string `json:"default_branch"`
}

// User represents a GitHub user
type User struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Type      string `json:"type"`
	AvatarURL string `json:"avatar_url"`
}

// PullRequestEvent represents a pull request webhook event
type PullRequestEvent struct {
	WebhookEvent
	PullRequest *PullRequest `json:"pull_request"`
	Number      int          `json:"number"`
}

// PullRequest represents a GitHub pull request
type PullRequest struct {
	ID     int64  `json:"id"`
	Number int    `json:"number"`
	State  string `json:"state"`
	Title  string `json:"title"`
	Head   *Ref   `json:"head"`
	Base   *Ref   `json:"base"`
}

// Ref represents a Git reference
type Ref struct {
	Ref  string      `json:"ref"`
	SHA  string      `json:"sha"`
	Repo *Repository `json:"repo"`
}

// ParseWebhookPayload parses a webhook payload into the appropriate event type
func ParseWebhookPayload(eventType string, payload []byte) (interface{}, error) {
	switch eventType {
	case "pull_request":
		var event PullRequestEvent
		if err := json.Unmarshal(payload, &event); err != nil {
			return nil, err
		}
		return &event, nil
	case "installation", "installation_repositories":
		var event WebhookEvent
		if err := json.Unmarshal(payload, &event); err != nil {
			return nil, err
		}
		return &event, nil
	default:
		return nil, fmt.Errorf("unsupported event type: %s", eventType)
	}
}

// GetCheckRunConclusion determines the check run conclusion from evaluation result
func GetCheckRunConclusion(passed bool, mode string) string {
	if passed {
		return "success"
	}
	if mode == "hard" {
		return "failure"
	}
	return "neutral" // soft mode, warn but don't block
}

// FormatInstallationID converts installation ID to int64
func FormatInstallationID(id interface{}) (int64, error) {
	switch v := id.(type) {
	case int64:
		return v, nil
	case int:
		return int64(v), nil
	case float64:
		return int64(v), nil
	case string:
		return strconv.ParseInt(v, 10, 64)
	default:
		return 0, fmt.Errorf("unsupported installation ID type: %T", id)
	}
}
