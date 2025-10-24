package models

import (
	"database/sql/driver"
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

	// Premium & Gamification
	PremiumUntil     *time.Time `json:"premium_until"`
	CurrentStreak    int        `json:"current_streak" gorm:"default:0"`
	LongestStreak    int        `json:"longest_streak" gorm:"default:0"`
	LastActivityDate *time.Time `json:"last_activity_date"`
	TotalCommitScans int        `json:"total_commit_scans" gorm:"default:0"`
	Badges           *JSONMap   `json:"badges" gorm:"type:jsonb"`

	// Relations
	Profile    *Profile    `json:"profile,omitempty" gorm:"foreignKey:UserID"`
	Projects   []Project   `json:"projects,omitempty" gorm:"foreignKey:UserID"`
	Challenges []Challenge `json:"challenges,omitempty" gorm:"foreignKey:UserID"`
}

// Invite represents a collaboration invite to a project
type Invite struct {
	ID            string         `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ProjectID     string         `json:"project_id" gorm:"type:uuid;not null;index"`
	InviterUserID string         `json:"inviter_user_id" gorm:"type:uuid;not null;index"`
	InviteeUserID *string        `json:"invitee_user_id" gorm:"type:uuid;index"`
	Email         *string        `json:"email"`
	GitUsername   *string        `json:"git_username"`
	Role          string         `json:"role" gorm:"type:varchar(20);default:'collaborator';check:role IN ('admin','collaborator')"`
	Token         string         `json:"token" gorm:"uniqueIndex;not null"`
	Status        string         `json:"status" gorm:"type:varchar(20);default:'pending';check:status IN ('pending','accepted','revoked','expired')"`
	ExpiresAt     *time.Time     `json:"expires_at"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Project *Project `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
	Inviter *User    `json:"inviter,omitempty" gorm:"foreignKey:InviterUserID"`
	Invitee *User    `json:"invitee,omitempty" gorm:"foreignKey:InviteeUserID"`
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

// Project represents a code project, and agg stats for public display
type Project struct {
	ID             string         `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID         string         `json:"user_id" gorm:"type:uuid;not null"`
	ProjectKeyHash *string        `json:"project_key_hash" gorm:"index"`
	Name           *string        `json:"name"`
	Description    *string        `json:"description"`
	Visibility     string         `json:"visibility" gorm:"type:varchar(10);default:'private';check:visibility IN ('private','public')"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`

	// Git Integration
	GitRepoURL    *string    `json:"git_repo_url"`
	GitProvider   *string    `json:"git_provider" gorm:"type:varchar(20)"` // github, gitlab, local
	LastCommitSHA *string    `json:"last_commit_sha"`
	LastSyncedAt  *time.Time `json:"last_synced_at"`

	// Gamification
	CurrentStreak int `json:"current_streak" gorm:"default:0"`
	LongestStreak int `json:"longest_streak" gorm:"default:0"`

	// Relations
	User          *User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	GitHubLinks   []GitHubLink   `json:"github_links,omitempty" gorm:"foreignKey:ProjectID"`
	Challenges    []Challenge    `json:"challenges,omitempty" gorm:"foreignKey:ProjectID"`
}

// Challenge represents a gamification challenge
type Challenge struct {
	ID          string     `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID      string     `json:"user_id" gorm:"type:uuid;not null;index"`
	ProjectID   *string    `json:"project_id" gorm:"type:uuid;index"` // Null for user-level challenges
	Type        string     `json:"type" gorm:"not null"`              // weekly_commits, reduce_debt, throughput_boost
	Title       string     `json:"title" gorm:"not null"`
	Description *string    `json:"description"`
	Target      *JSONMap   `json:"target" gorm:"type:jsonb;not null"` // Challenge-specific target
	Progress    *JSONMap   `json:"progress" gorm:"type:jsonb"`        // Current progress
	Status      string     `json:"status" gorm:"type:varchar(20);default:'active';check:status IN ('active','completed','failed','expired')"`
	StartsAt    time.Time  `json:"starts_at"`
	EndsAt      time.Time  `json:"ends_at"`
	CompletedAt *time.Time `json:"completed_at"`
	Reward      *string    `json:"reward"` // Badge name or points
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Relations
	User    *User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Project *Project `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
}

// GitHubLink represents a link between a project and a GitHub repository
type GitHubLink struct {
	ID             string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID         string    `json:"user_id" gorm:"type:uuid;not null"`
	ProjectID      string    `json:"project_id" gorm:"type:uuid;not null"`
	RepoFullName   string    `json:"repo_full_name" gorm:"not null"`
	InstallationID *int      `json:"installation_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// Relations
	User    *User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Project *Project `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
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

// Value implements driver.Valuer so GORM can write JSONMap to the DB
func (m JSONMap) Value() (driver.Value, error) {
	if m == nil {
		return nil, nil
	}
	b, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	// Return []byte so postgres driver treats it as JSONB
	return b, nil
}

// Scan implements sql.Scanner so GORM can read JSONB into JSONMap
func (m *JSONMap) Scan(value interface{}) error {
	if m == nil {
		return fmt.Errorf("JSONMap: Scan on nil pointer")
	}
	if value == nil {
		*m = nil
		return nil
	}
	switch v := value.(type) {
	case []byte:
		var tmp map[string]interface{}
		if len(v) == 0 {
			*m = JSONMap{}
			return nil
		}
		if err := json.Unmarshal(v, &tmp); err != nil {
			return err
		}
		*m = JSONMap(tmp)
		return nil
	case string:
		var tmp map[string]interface{}
		if v == "" {
			*m = JSONMap{}
			return nil
		}
		if err := json.Unmarshal([]byte(v), &tmp); err != nil {
			return err
		}
		*m = JSONMap(tmp)
		return nil
	default:
		return fmt.Errorf("JSONMap: unsupported Scan type %T", value)
	}
}

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
