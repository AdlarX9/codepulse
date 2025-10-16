package models

import (
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID        string         `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email     string         `json:"email" gorm:"uniqueIndex;not null"`
	Password  string         `json:"password" gorm:"not null"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Profile  *Profile  `json:"profile,omitempty" gorm:"foreignKey:UserID"`
	Projects []Project `json:"projects,omitempty" gorm:"foreignKey:UserID"`
}

// Profile represents user profile information
type Profile struct {
	UserID      string    `json:"user_id" gorm:"type:uuid;primaryKey"`
	Handle      string    `json:"handle" gorm:"uniqueIndex;not null"`
	DisplayName *string   `json:"display_name"`
	AvatarURL   *string   `json:"avatar_url"`
	Bio         *string   `json:"bio"`
	Links       *JSONMap  `json:"links" gorm:"type:jsonb"`
	Visibility  string    `json:"visibility" gorm:"type:varchar(10);default:'private';check:visibility IN ('private','public')"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relations
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// Project represents a code project
type Project struct {
	ID             string         `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID         string         `json:"user_id" gorm:"type:uuid;not null"`
	ProjectKeyHash *string        `json:"project_key_hash" gorm:"index"`
	Name           *string        `json:"name"`
	Visibility     string         `json:"visibility" gorm:"type:varchar(10);default:'private';check:visibility IN ('private','public')"`
	Settings       *JSONMap       `json:"settings" gorm:"type:jsonb"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	User        *User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Scans       []Scan       `json:"scans,omitempty" gorm:"foreignKey:ProjectID"`
	GitHubLinks []GitHubLink `json:"github_links,omitempty" gorm:"foreignKey:ProjectID"`
}

// Scan represents a code scan result
type Scan struct {
	ID            string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID        string    `json:"user_id" gorm:"type:uuid;not null"`
	ProjectID     string    `json:"project_id" gorm:"type:uuid;not null"`
	Total         int       `json:"total" gorm:"not null"`
	Code          int       `json:"code" gorm:"not null"`
	Comment       int       `json:"comment" gorm:"not null"`
	Blank         int       `json:"blank" gorm:"not null"`
	CommentRatio  float64   `json:"comment_ratio" gorm:"not null"`
	CoreCodeLines int       `json:"core_code_lines" gorm:"default:0"`
	InfoLines     int       `json:"info_lines" gorm:"default:0"`
	DeviceID      *string   `json:"device_id"`
	VersionTag    *string   `json:"version_tag"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relations
	User      *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Project   *Project   `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
	ScanLangs []ScanLang `json:"scan_langs,omitempty" gorm:"foreignKey:ScanID"`
}

// ScanLang represents programming language statistics for a scan
type ScanLang struct {
	ScanID   string `json:"scan_id" gorm:"type:uuid;not null;primaryKey"`
	Language string `json:"language" gorm:"not null;primaryKey"`
	Files    int    `json:"files" gorm:"not null"`
	Total    int    `json:"total" gorm:"not null"`
	Code     int    `json:"code" gorm:"not null"`
	Comment  int    `json:"comment" gorm:"not null"`
	Blank    int    `json:"blank" gorm:"not null"`

	// Relations
	Scan *Scan `json:"scan,omitempty" gorm:"foreignKey:ScanID"`
}

// GitHubLink represents a link between a project and a GitHub repository
type GitHubLink struct {
	ID             string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID         string    `json:"user_id" gorm:"type:uuid;not null"`
	ProjectID      string    `json:"project_id" gorm:"type:uuid;not null"`
	RepoFullName   string    `json:"repo_full_name" gorm:"not null"`
	InstallationID *int      `json:"installation_id"`
	RepoData       *JSONMap  `json:"repo_data" gorm:"type:jsonb"`
	LatestRelease  *JSONMap  `json:"latest_release" gorm:"type:jsonb"`
	LastCommit     *JSONMap  `json:"last_commit" gorm:"type:jsonb"`
	StarsCount     *int      `json:"stars_count"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// Relations
	User    *User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Project *Project `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
}

// Download represents download statistics
type Download struct {
	ID        string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Platform  string    `json:"platform" gorm:"not null"`
	Version   string    `json:"version" gorm:"not null"`
	Country   *string   `json:"country"`
	Region    *string   `json:"region"`
	City      *string   `json:"city"`
	Referrer  *string   `json:"referrer"`
	UserAgent *string   `json:"user_agent"`
	IPHash    *string   `json:"ip_hash"`
	CreatedAt time.Time `json:"created_at"`
}

// JSONTime represents a time that can be marshaled to/from JSON
type JSONTime struct {
	time.Time
}

// MarshalJSON implements json.Marshaler
func (t JSONTime) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf(`"%s"`, t.Format("2006-01-02T15:04:05Z07:00"))), nil
}

// UnmarshalJSON implements json.Unmarshaler
func (t *JSONTime) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	parsed, err := time.Parse("2006-01-02T15:04:05Z07:00", s)
	if err != nil {
		return err
	}
	t.Time = parsed
	return nil
}

// JSONMap is a custom type for JSON data
type JSONMap map[string]interface{}

// Session represents user sessions for JWT tokens
type Session struct {
	ID        string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    string    `json:"user_id" gorm:"type:uuid;not null"`
	Token     string    `json:"token" gorm:"not null;uniqueIndex"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`

	// Relations
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// DeviceLoginSession supports desktop device-code login flow
type DeviceLoginSession struct {
	ID        string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Code      string    `json:"code" gorm:"uniqueIndex;not null"`
	UserID    *string   `json:"user_id" gorm:"type:uuid"`
	Token     *string   `json:"token"`
	Completed bool      `json:"completed" gorm:"default:false"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}
