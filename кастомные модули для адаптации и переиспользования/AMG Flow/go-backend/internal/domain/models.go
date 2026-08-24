package domain

import (
	"time"

	"github.com/google/uuid"
)

// User представляет пользователя системы
type User struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Email     string    `json:"email" gorm:"uniqueIndex;not null"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Session представляет пользовательскую сессию
type Session struct {
	ID        uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID    *uuid.UUID `json:"user_id" gorm:"type:uuid;index"`
	SessionID string     `json:"session_id" gorm:"uniqueIndex;not null"`
	IPAddress string     `json:"ip_address"`
	UserAgent string     `json:"user_agent"`
	IsActive  bool       `json:"is_active" gorm:"default:true"`
	StartedAt time.Time  `json:"started_at"`
	EndedAt   *time.Time `json:"ended_at"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	// Связи
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// Conversation представляет разговор
type Conversation struct {
	ID        uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SessionID uuid.UUID  `json:"session_id" gorm:"type:uuid;not null;index"`
	Title     string     `json:"title"`
	IsActive  bool       `json:"is_active" gorm:"default:true"`
	StartedAt time.Time  `json:"started_at"`
	EndedAt   *time.Time `json:"ended_at"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	// Связи
	Session  *Session  `json:"session,omitempty" gorm:"foreignKey:SessionID"`
	Messages []Message `json:"messages,omitempty" gorm:"foreignKey:ConversationID"`
}

// Message представляет сообщение в разговоре
type Message struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	ConversationID uuid.UUID `json:"conversation_id" gorm:"type:uuid;not null;index"`
	Role           string    `json:"role" gorm:"not null"` // user, assistant, system
	Content        string    `json:"content" gorm:"type:text;not null"`
	Metadata       string    `json:"metadata" gorm:"type:jsonb"`
	CreatedAt      time.Time `json:"created_at"`

	// Связи
	Conversation *Conversation `json:"conversation,omitempty" gorm:"foreignKey:ConversationID"`
}

// Model представляет AI модель
type Model struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null"`
	DisplayName string    `json:"display_name"`
	Description string    `json:"description"`
	ModelType   string    `json:"model_type" gorm:"default:'chat'"` // chat, completion, embedding
	Provider    string    `json:"provider" gorm:"default:'ollama'"` // ollama, openai, etc
	Config      string    `json:"config" gorm:"type:jsonb"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Workflow представляет рабочий процесс
type Workflow struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null"`
	Description string    `json:"description"`
	Definition  string    `json:"definition" gorm:"type:jsonb"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UIComponent представляет компонент UI для BDUI
type UIComponent struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name      string    `json:"name" gorm:"uniqueIndex;not null"`
	Type      string    `json:"type" gorm:"not null"` // form, table, chart, etc.
	Schema    string    `json:"schema" gorm:"type:jsonb;not null"`
	IsActive  bool      `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UIForm представляет форму для BDUI
type UIForm struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Schema      string    `json:"schema" gorm:"type:jsonb;not null"`
	Validation  string    `json:"validation" gorm:"type:jsonb"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UITab представляет вкладку для BDUI
type UITab struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	ComponentID uuid.UUID `json:"component_id" gorm:"type:uuid;not null"`
	Order       int       `json:"order"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Связи
	Component *UIComponent `json:"component,omitempty" gorm:"foreignKey:ComponentID"`
}
