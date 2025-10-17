package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"time"
)

type Client struct {
	serverToken string
	baseURL     string
	httpClient  *http.Client
}

func NewClient(serverToken string) *Client {
	return &Client{
		serverToken: serverToken,
		baseURL:     "https://api.postmarkapp.com",
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type EmailRequest struct {
	From     string
	To       string
	Subject  string
	HTMLBody string
	TextBody string
	Tag      string
}

type PostmarkEmail struct {
	From     string `json:"From"`
	To       string `json:"To"`
	Subject  string `json:"Subject"`
	HTMLBody string `json:"HtmlBody"`
	TextBody string `json:"TextBody"`
	Tag      string `json:"Tag,omitempty"`
}

func (c *Client) SendEmail(req EmailRequest) error {
	email := PostmarkEmail{
		From:     req.From,
		To:       req.To,
		Subject:  req.Subject,
		HTMLBody: req.HTMLBody,
		TextBody: req.TextBody,
		Tag:      req.Tag,
	}

	body, err := json.Marshal(email)
	if err != nil {
		return fmt.Errorf("failed to marshal email: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.baseURL+"/email", bytes.NewBuffer(body))
	if err != nil{
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Postmark-Server-Token", c.serverToken)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		return fmt.Errorf("postmark error: %v", result)
	}

	return nil
}

func (c *Client) SendTemplateEmail(to, subject, templateName string, data interface{}) error {
	tmpl, err := template.ParseFiles(fmt.Sprintf("internal/email/templates/%s.html", templateName))
	if err != nil {
		return fmt.Errorf("failed to parse template: %w", err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	return c.SendEmail(EmailRequest{
		From:     "CodePulse <noreply@codepulse.dev>",
		To:       to,
		Subject:  subject,
		HTMLBody: buf.String(),
		Tag:      templateName,
	})
}
