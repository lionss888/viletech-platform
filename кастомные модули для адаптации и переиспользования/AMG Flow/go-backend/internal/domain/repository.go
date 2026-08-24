package domain

import (
	"context"

	"github.com/google/uuid"
)

// UserRepository интерфейс для работы с пользователями
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, limit, offset int) ([]*User, error)
}

// SessionRepository интерфейс для работы с сессиями
type SessionRepository interface {
	Create(ctx context.Context, session *Session) error
	GetByID(ctx context.Context, id uuid.UUID) (*Session, error)
	GetBySessionID(ctx context.Context, sessionID string) (*Session, error)
	Update(ctx context.Context, session *Session) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*Session, error)
	EndSession(ctx context.Context, sessionID string) error
}

// ConversationRepository интерфейс для работы с разговорами
type ConversationRepository interface {
	Create(ctx context.Context, conversation *Conversation) error
	GetByID(ctx context.Context, id uuid.UUID) (*Conversation, error)
	GetBySessionID(ctx context.Context, sessionID uuid.UUID, limit, offset int) ([]*Conversation, error)
	Update(ctx context.Context, conversation *Conversation) error
	Delete(ctx context.Context, id uuid.UUID) error
	EndConversation(ctx context.Context, id uuid.UUID) error
}

// MessageRepository интерфейс для работы с сообщениями
type MessageRepository interface {
	Create(ctx context.Context, message *Message) error
	GetByID(ctx context.Context, id uuid.UUID) (*Message, error)
	GetByConversationID(ctx context.Context, conversationID uuid.UUID, limit, offset int) ([]*Message, error)
	Update(ctx context.Context, message *Message) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetConversationHistory(ctx context.Context, conversationID uuid.UUID, limit int) ([]*Message, error)
}

// ModelRepository интерфейс для работы с моделями
type ModelRepository interface {
	Create(ctx context.Context, model *Model) error
	GetByID(ctx context.Context, id uuid.UUID) (*Model, error)
	GetByName(ctx context.Context, name string) (*Model, error)
	Update(ctx context.Context, model *Model) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, limit, offset int) ([]*Model, error)
	ListActive(ctx context.Context) ([]*Model, error)
}

// WorkflowRepository интерфейс для работы с рабочими процессами
type WorkflowRepository interface {
	Create(ctx context.Context, workflow *Workflow) error
	GetByID(ctx context.Context, id uuid.UUID) (*Workflow, error)
	GetByName(ctx context.Context, name string) (*Workflow, error)
	Update(ctx context.Context, workflow *Workflow) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, limit, offset int) ([]*Workflow, error)
	ListActive(ctx context.Context) ([]*Workflow, error)
}

// UIComponentRepository интерфейс для работы с UI компонентами
type UIComponentRepository interface {
	Create(ctx context.Context, component *UIComponent) error
	GetByID(ctx context.Context, id uuid.UUID) (*UIComponent, error)
	GetByName(ctx context.Context, name string) (*UIComponent, error)
	Update(ctx context.Context, component *UIComponent) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, limit, offset int) ([]*UIComponent, error)
	ListActive(ctx context.Context) ([]*UIComponent, error)
}

// UIFormRepository интерфейс для работы с UI формами
type UIFormRepository interface {
	Create(ctx context.Context, form *UIForm) error
	GetByID(ctx context.Context, id uuid.UUID) (*UIForm, error)
	GetByName(ctx context.Context, name string) (*UIForm, error)
	Update(ctx context.Context, form *UIForm) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, limit, offset int) ([]*UIForm, error)
	ListActive(ctx context.Context) ([]*UIForm, error)
}

// UITabRepository интерфейс для работы с UI вкладками
type UITabRepository interface {
	Create(ctx context.Context, tab *UITab) error
	GetByID(ctx context.Context, id uuid.UUID) (*UITab, error)
	GetByName(ctx context.Context, name string) (*UITab, error)
	Update(ctx context.Context, tab *UITab) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, limit, offset int) ([]*UITab, error)
	ListActive(ctx context.Context) ([]*UITab, error)
}
