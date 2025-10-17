package slack

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Client handles Slack API interactions
type Client struct {
	Token string
}

// NewClient creates a new Slack client
func NewClient(token string) *Client {
	return &Client{Token: token}
}

// Message represents a Slack message
type Message struct {
	Channel     string       `json:"channel"`
	Text        string       `json:"text,omitempty"`
	Blocks      []Block      `json:"blocks,omitempty"`
	Attachments []Attachment `json:"attachments,omitempty"`
}

// Block represents a Slack block
type Block struct {
	Type string      `json:"type"`
	Text *TextObject `json:"text,omitempty"`
}

// TextObject represents text in a block
type TextObject struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Attachment represents a Slack attachment
type Attachment struct {
	Color  string  `json:"color,omitempty"`
	Title  string  `json:"title,omitempty"`
	Text   string  `json:"text,omitempty"`
	Fields []Field `json:"fields,omitempty"`
}

// Field represents a field in an attachment
type Field struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

// SendMessage sends a message to a Slack channel
func (c *Client) SendMessage(msg *Message) error {
	url := "https://slack.com/api/chat.postMessage"

	body, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+c.Token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var result struct {
		OK    bool   `json:"ok"`
		Error string `json:"error,omitempty"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}

	if !result.OK {
		return fmt.Errorf("slack error: %s", result.Error)
	}

	return nil
}

// FormatDigestMessage creates a formatted digest message
func FormatDigestMessage(channel string, stats map[string]interface{}) *Message {
	return &Message{
		Channel: channel,
		Blocks: []Block{
			{
				Type: "header",
				Text: &TextObject{
					Type: "plain_text",
					Text: "📊 CodePulse Weekly Digest",
				},
			},
			{
				Type: "section",
				Text: &TextObject{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*Period:* Last 7 days\n*Repositories:* %v\n*Scans:* %v",
						stats["repository_count"], stats["scan_count"]),
				},
			},
		},
		Attachments: []Attachment{
			{
				Color: "#36a64f",
				Title: "Quality Metrics",
				Fields: []Field{
					{
						Title: "Avg Comment Ratio",
						Value: fmt.Sprintf("%.2f%%", getFloat(stats, "avg_comment_ratio")*100),
						Short: true,
					},
					{
						Title: "Avg Doc Coverage",
						Value: fmt.Sprintf("%.2f%%", getFloat(stats, "avg_doc_coverage")*100),
						Short: true,
					},
					{
						Title: "Total Code Lines",
						Value: fmt.Sprintf("%v", stats["total_code"]),
						Short: true,
					},
					{
						Title: "Total Comment Lines",
						Value: fmt.Sprintf("%v", stats["total_comment"]),
						Short: true,
					},
				},
			},
		},
	}
}

// getFloat safely extracts float from interface
func getFloat(m map[string]interface{}, key string) float64 {
	if val, ok := m[key].(float64); ok {
		return val
	}
	return 0.0
}

// FormatAlertMessage creates a formatted alert message
func FormatAlertMessage(channel, title, message, severity string) *Message {
	color := "#36a64f" // green
	if severity == "warning" {
		color = "#ff9900" // orange
	} else if severity == "error" {
		color = "#ff0000" // red
	}

	return &Message{
		Channel: channel,
		Attachments: []Attachment{
			{
				Color: color,
				Title: title,
				Text:  message,
			},
		},
	}
}

// OAuthResponse represents Slack OAuth response
type OAuthResponse struct {
	OK          bool   `json:"ok"`
	AccessToken string `json:"access_token"`
	TeamID      string `json:"team_id"`
	TeamName    string `json:"team_name"`
	Error       string `json:"error,omitempty"`
}

// ExchangeOAuthCode exchanges an OAuth code for an access token
func ExchangeOAuthCode(clientID, clientSecret, code, redirectURI string) (*OAuthResponse, error) {
	url := fmt.Sprintf("https://slack.com/api/oauth.v2.access?client_id=%s&client_secret=%s&code=%s&redirect_uri=%s",
		clientID, clientSecret, code, redirectURI)

	resp, err := http.Post(url, "application/x-www-form-urlencoded", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result OAuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if !result.OK {
		return nil, fmt.Errorf("slack oauth error: %s", result.Error)
	}

	return &result, nil
}
