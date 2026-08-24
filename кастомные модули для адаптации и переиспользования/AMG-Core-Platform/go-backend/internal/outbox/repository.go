package outbox

import (
	"context"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OutboxRepositoryImpl implements the OutboxRepository interface
type OutboxRepositoryImpl struct {
	db     *gorm.DB
	logger logger.Logger
}

// NewOutboxRepository creates a new outbox repository
func NewOutboxRepository(db *gorm.DB, logger logger.Logger) *OutboxRepositoryImpl {
	return &OutboxRepositoryImpl{
		db:     db,
		logger: logger,
	}
}

// CreateEvent creates a new outbox event
func (r *OutboxRepositoryImpl) CreateEvent(ctx context.Context, event *OutboxEvent) error {
	r.logger.Infof("Creating outbox event: %s", event.ID)

	if err := r.db.WithContext(ctx).Create(event).Error; err != nil {
		r.logger.Errorf("Failed to create outbox event: %v", err)
		return err
	}

	r.logger.Infof("Outbox event created successfully: %s", event.ID)
	return nil
}

// UpdateEvent updates an existing outbox event
func (r *OutboxRepositoryImpl) UpdateEvent(ctx context.Context, event *OutboxEvent) error {
	r.logger.Infof("Updating outbox event: %s", event.ID)

	event.UpdatedAt = time.Now()
	if err := r.db.WithContext(ctx).Save(event).Error; err != nil {
		r.logger.Errorf("Failed to update outbox event: %v", err)
		return err
	}

	r.logger.Infof("Outbox event updated successfully: %s", event.ID)
	return nil
}

// GetPendingEvents retrieves pending events for processing
func (r *OutboxRepositoryImpl) GetPendingEvents(ctx context.Context, limit int) ([]*OutboxEvent, error) {
	r.logger.Infof("Getting pending outbox events (limit: %d)", limit)

	var events []*OutboxEvent
	if err := r.db.WithContext(ctx).
		Where("status = ?", EventStatusPending).
		Order("created_at ASC").
		Limit(limit).
		Find(&events).Error; err != nil {
		r.logger.Errorf("Failed to get pending outbox events: %v", err)
		return nil, err
	}

	return events, nil
}

// GetEventByID retrieves an outbox event by ID
func (r *OutboxRepositoryImpl) GetEventByID(ctx context.Context, eventID uuid.UUID) (*OutboxEvent, error) {
	r.logger.Infof("Getting outbox event: %s", eventID)

	var event OutboxEvent
	if err := r.db.WithContext(ctx).Where("id = ?", eventID).First(&event).Error; err != nil {
		r.logger.Errorf("Failed to get outbox event: %v", err)
		return nil, err
	}

	return &event, nil
}

// DeleteEvent deletes an outbox event
func (r *OutboxRepositoryImpl) DeleteEvent(ctx context.Context, eventID uuid.UUID) error {
	r.logger.Infof("Deleting outbox event: %s", eventID)

	if err := r.db.WithContext(ctx).Where("id = ?", eventID).Delete(&OutboxEvent{}).Error; err != nil {
		r.logger.Errorf("Failed to delete outbox event: %v", err)
		return err
	}

	r.logger.Infof("Outbox event deleted successfully: %s", eventID)
	return nil
}

// GetFailedEvents retrieves failed events for retry
func (r *OutboxRepositoryImpl) GetFailedEvents(ctx context.Context, limit int) ([]*OutboxEvent, error) {
	r.logger.Infof("Getting failed outbox events (limit: %d)", limit)

	var events []*OutboxEvent
	if err := r.db.WithContext(ctx).
		Where("status = ? AND retry_count < max_retries", EventStatusFailed).
		Order("created_at ASC").
		Limit(limit).
		Find(&events).Error; err != nil {
		r.logger.Errorf("Failed to get failed outbox events: %v", err)
		return nil, err
	}

	return events, nil
}

// GetEventsByStatus retrieves events by status
func (r *OutboxRepositoryImpl) GetEventsByStatus(ctx context.Context, status EventStatus, limit int) ([]*OutboxEvent, error) {
	r.logger.Infof("Getting outbox events by status: %s (limit: %d)", status, limit)

	var events []*OutboxEvent
	if err := r.db.WithContext(ctx).
		Where("status = ?", status).
		Order("created_at ASC").
		Limit(limit).
		Find(&events).Error; err != nil {
		r.logger.Errorf("Failed to get outbox events by status: %v", err)
		return nil, err
	}

	return events, nil
}

// InboxRepositoryImpl implements the InboxRepository interface
type InboxRepositoryImpl struct {
	db     *gorm.DB
	logger logger.Logger
}

// NewInboxRepository creates a new inbox repository
func NewInboxRepository(db *gorm.DB, logger logger.Logger) *InboxRepositoryImpl {
	return &InboxRepositoryImpl{
		db:     db,
		logger: logger,
	}
}

// CreateEvent creates a new inbox event
func (r *InboxRepositoryImpl) CreateEvent(ctx context.Context, event *InboxEvent) error {
	r.logger.Infof("Creating inbox event: %s", event.ID)

	if err := r.db.WithContext(ctx).Create(event).Error; err != nil {
		r.logger.Errorf("Failed to create inbox event: %v", err)
		return err
	}

	r.logger.Infof("Inbox event created successfully: %s", event.ID)
	return nil
}

// UpdateEvent updates an existing inbox event
func (r *InboxRepositoryImpl) UpdateEvent(ctx context.Context, event *InboxEvent) error {
	r.logger.Infof("Updating inbox event: %s", event.ID)

	event.UpdatedAt = time.Now()
	if err := r.db.WithContext(ctx).Save(event).Error; err != nil {
		r.logger.Errorf("Failed to update inbox event: %v", err)
		return err
	}

	r.logger.Infof("Inbox event updated successfully: %s", event.ID)
	return nil
}

// GetPendingEvents retrieves pending events for processing
func (r *InboxRepositoryImpl) GetPendingEvents(ctx context.Context, limit int) ([]*InboxEvent, error) {
	r.logger.Infof("Getting pending inbox events (limit: %d)", limit)

	var events []*InboxEvent
	if err := r.db.WithContext(ctx).
		Where("status = ?", EventStatusPending).
		Order("created_at ASC").
		Limit(limit).
		Find(&events).Error; err != nil {
		r.logger.Errorf("Failed to get pending inbox events: %v", err)
		return nil, err
	}

	return events, nil
}

// GetEventByID retrieves an inbox event by ID
func (r *InboxRepositoryImpl) GetEventByID(ctx context.Context, eventID uuid.UUID) (*InboxEvent, error) {
	r.logger.Infof("Getting inbox event: %s", eventID)

	var event InboxEvent
	if err := r.db.WithContext(ctx).Where("id = ?", eventID).First(&event).Error; err != nil {
		r.logger.Errorf("Failed to get inbox event: %v", err)
		return nil, err
	}

	return &event, nil
}

// DeleteEvent deletes an inbox event
func (r *InboxRepositoryImpl) DeleteEvent(ctx context.Context, eventID uuid.UUID) error {
	r.logger.Infof("Deleting inbox event: %s", eventID)

	if err := r.db.WithContext(ctx).Where("id = ?", eventID).Delete(&InboxEvent{}).Error; err != nil {
		r.logger.Errorf("Failed to delete inbox event: %v", err)
		return err
	}

	r.logger.Infof("Inbox event deleted successfully: %s", eventID)
	return nil
}

// GetEventsByStatus retrieves events by status
func (r *InboxRepositoryImpl) GetEventsByStatus(ctx context.Context, status EventStatus, limit int) ([]*InboxEvent, error) {
	r.logger.Infof("Getting inbox events by status: %s (limit: %d)", status, limit)

	var events []*InboxEvent
	if err := r.db.WithContext(ctx).
		Where("status = ?", status).
		Order("created_at ASC").
		Limit(limit).
		Find(&events).Error; err != nil {
		r.logger.Errorf("Failed to get inbox events by status: %v", err)
		return nil, err
	}

	return events, nil
}
