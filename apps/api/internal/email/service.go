package email

import (
	"fmt"
	"codepulse-api/internal/database"
	"codepulse-api/internal/models"
)

type Service struct {
	client *Client
	db     *database.Database
}

func NewService(postmarkToken string, db *database.Database) *Service {
	return &Service{
		client: NewClient(postmarkToken),
		db:     db,
	}
}

// WeeklyDigestData contains data for weekly digest email
type WeeklyDigestData struct {
	OrgName         string
	TotalCode       string
	CodeChange      float64
	CommentRatio    string
	CommentChange   float64
	Repositories    []RepoActivity
	PolicyPassed    int
	PolicyFailed    int
	PolicyTotal     int
	DashboardURL    string
	UnsubscribeURL  string
}

type RepoActivity struct {
	Name          string
	Commits       int
	PRs           int
	CommentRatio  string
}

// SendWeeklyDigest sends a weekly digest email to an organization
func (s *Service) SendWeeklyDigest(orgID string, data WeeklyDigestData) error {
	// Get all members of the organization
	var memberships []models.Membership
	if err := s.db.DB.Where("org_id = ?", orgID).Preload("User").Find(&memberships).Error; err != nil {
		return fmt.Errorf("failed to get members: %w", err)
	}

	// Send to each member
	for _, membership := range memberships {
		if membership.User == nil || membership.User.Email == "" {
			continue
		}

		if err := s.client.SendTemplateEmail(
			membership.User.Email,
			fmt.Sprintf("📊 Weekly Quality Digest - %s", data.OrgName),
			"weekly-digest",
			data,
		); err != nil {
			// Log error but continue sending to other members
			fmt.Printf("Failed to send digest to %s: %v\n", membership.User.Email, err)
		}
	}

	return nil
}

// PolicyViolationData contains data for policy violation email
type PolicyViolationData struct {
	PolicyName      string
	RepoName        string
	Branch          string
	CommitSHA       string
	ViolationType   string
	Failures        []string
	PRNumber        *int
	BlocksMerge     bool
	RepoURL         string
	PRURL           string
	OrgSettingsURL  string
}

// SendPolicyViolation sends a policy violation alert
func (s *Service) SendPolicyViolation(orgID string, data PolicyViolationData) error {
	// Get org admins and owners
	var memberships []models.Membership
	if err := s.db.DB.Where("org_id = ? AND role IN (?)", orgID, []string{"owner", "admin"}).
		Preload("User").Find(&memberships).Error; err != nil {
		return fmt.Errorf("failed to get admins: %w", err)
	}

	// Send to each admin
	for _, membership := range memberships {
		if membership.User == nil || membership.User.Email == "" {
			continue
		}

		if err := s.client.SendTemplateEmail(
			membership.User.Email,
			fmt.Sprintf("⚠️ Policy Violation: %s", data.PolicyName),
			"policy-violation",
			data,
		); err != nil {
			fmt.Printf("Failed to send violation alert to %s: %v\n", membership.User.Email, err)
		}
	}

	return nil
}

// InvitationData contains data for team invitation email
type InvitationData struct {
	InviterName string
	OrgName     string
	Role        string
	AcceptURL   string
}

// SendInvitation sends a team invitation email
func (s *Service) SendInvitation(toEmail string, data InvitationData) error {
	return s.client.SendTemplateEmail(
		toEmail,
		fmt.Sprintf("You're invited to join %s on CodePulse", data.OrgName),
		"invitation",
		data,
	)
}

// WelcomeData contains data for welcome email
type WelcomeData struct {
	UserName      string
	DashboardURL  string
	DocsURL       string
}

// SendWelcome sends a welcome email to new users
func (s *Service) SendWelcome(toEmail string, data WelcomeData) error {
	emailData := struct {
		UserName     string
		DashboardURL string
		DocsURL      string
	}{
		UserName:     data.UserName,
		DashboardURL: data.DashboardURL,
		DocsURL:      data.DocsURL,
	}

	return s.client.SendEmail(EmailRequest{
		From:     "CodePulse <welcome@codepulse.dev>",
		To:       toEmail,
		Subject:  "Welcome to CodePulse! 🎉",
		HTMLBody: fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3B82F6 0%%, #2563EB 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #3B82F6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to CodePulse!</h1>
    </div>
    <div class="content">
        <p>Hi %s,</p>
        <p>Thanks for signing up! We're excited to help you improve your code quality.</p>
        <h3>Get Started:</h3>
        <ul>
            <li>Create your first organization</li>
            <li>Connect your GitHub repositories</li>
            <li>Set up quality policies</li>
            <li>Start tracking metrics</li>
        </ul>
        <center>
            <a href="%s" class="button">Go to Dashboard</a>
        </center>
        <p>Need help? Check out our <a href="%s">documentation</a>.</p>
    </div>
</body>
</html>
		`, emailData.UserName, emailData.DashboardURL, emailData.DocsURL),
		Tag: "welcome",
	})
}
