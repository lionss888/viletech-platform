package data_access

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"amg-integration-bus/internal/domain"

	"github.com/lib/pq"
)

// IntegrationRepository implements data access for integrations
type IntegrationRepository struct {
	db *sql.DB
}

// NewIntegrationRepository creates a new integration repository
func NewIntegrationRepository(db *sql.DB) IntegrationRepository {
	return IntegrationRepository{db: db}
}

// Create creates a new integration
func (r IntegrationRepository) Create(ctx context.Context, integration *domain.Integration) error {
	query := `
		INSERT INTO integrations (
			id, name, type, status, version, description, 
			config, credentials, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	configJSON, _ := json.Marshal(integration.Config)
	credentialsJSON, _ := json.Marshal(integration.Credentials)
	metadataJSON, _ := json.Marshal(integration.Metadata)

	_, err := r.db.ExecContext(ctx, query,
		integration.ID,
		integration.Name,
		integration.Type,
		integration.Status,
		integration.Version,
		integration.Description,
		configJSON,
		credentialsJSON,
		metadataJSON,
		integration.CreatedAt,
		integration.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create integration: %w", err)
	}

	return nil
}

// GetByID retrieves an integration by ID
func (r IntegrationRepository) GetByID(ctx context.Context, id string) (*domain.Integration, error) {
	query := `
		SELECT id, name, type, status, version, description,
			   config, credentials, metadata, created_at, updated_at, last_sync
		FROM integrations
		WHERE id = $1
	`

	row := r.db.QueryRowContext(ctx, query, id)
	return r.scanIntegration(row)
}

// GetAll retrieves all integrations with optional filters
func (r IntegrationRepository) GetAll(ctx context.Context, filters map[string]interface{}) ([]*domain.Integration, error) {
	query := `
		SELECT id, name, type, status, version, description,
			   config, credentials, metadata, created_at, updated_at, last_sync
		FROM integrations
	`
	
	args := []interface{}{}
	argIndex := 1

	// Build WHERE clause from filters
	if len(filters) > 0 {
		whereClauses := []string{}
		
		if status, ok := filters["status"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argIndex))
			args = append(args, status)
			argIndex++
		}
		
		if integrationType, ok := filters["type"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("type = $%d", argIndex))
			args = append(args, integrationType)
			argIndex++
		}
		
		if name, ok := filters["name"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("name ILIKE $%d", argIndex))
			args = append(args, "%"+name.(string)+"%")
			argIndex++
		}

		if len(whereClauses) > 0 {
			query += " WHERE " + strings.Join(whereClauses, " AND ")
		}
	}

	// Add ordering
	query += " ORDER BY created_at DESC"

	// Add pagination if specified
	if limit, ok := filters["limit"]; ok {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, limit)
		argIndex++
	}

	if offset, ok := filters["offset"]; ok {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, offset)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query integrations: %w", err)
	}
	defer rows.Close()

	var integrations []*domain.Integration
	for rows.Next() {
		integration, err := r.scanIntegration(rows)
		if err != nil {
			return nil, err
		}
		integrations = append(integrations, integration)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating integrations: %w", err)
	}

	return integrations, nil
}

// Update updates an integration
func (r IntegrationRepository) Update(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	setClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	for key, value := range updates {
		switch key {
		case "name", "type", "status", "version", "description":
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
			args = append(args, value)
			argIndex++
		case "config", "credentials", "metadata":
			jsonValue, _ := json.Marshal(value)
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
			args = append(args, jsonValue)
			argIndex++
		case "last_sync":
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
			args = append(args, value)
			argIndex++
		}
	}

	if len(setClauses) == 0 {
		return nil
	}

	query := fmt.Sprintf("UPDATE integrations SET %s WHERE id = $%d", 
		strings.Join(setClauses, ", "), argIndex)
	args = append(args, id)

	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update integration: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("integration with id %s not found", id)
	}

	return nil
}

// Delete deletes an integration
func (r IntegrationRepository) Delete(ctx context.Context, id string) error {
	query := "DELETE FROM integrations WHERE id = $1"

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete integration: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("integration with id %s not found", id)
	}

	return nil
}

// Count returns the total number of integrations matching the filters
func (r IntegrationRepository) Count(ctx context.Context, filters map[string]interface{}) (int64, error) {
	query := "SELECT COUNT(*) FROM integrations"
	args := []interface{}{}
	argIndex := 1

	// Build WHERE clause from filters
	if len(filters) > 0 {
		whereClauses := []string{}
		
		if status, ok := filters["status"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argIndex))
			args = append(args, status)
			argIndex++
		}
		
		if integrationType, ok := filters["type"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("type = $%d", argIndex))
			args = append(args, integrationType)
			argIndex++
		}
		
		if name, ok := filters["name"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("name ILIKE $%d", argIndex))
			args = append(args, "%"+name.(string)+"%")
			argIndex++
		}

		if len(whereClauses) > 0 {
			query += " WHERE " + strings.Join(whereClauses, " AND ")
		}
	}

	var count int64
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count integrations: %w", err)
	}

	return count, nil
}

// scanIntegration scans a database row into an Integration struct
func (r IntegrationRepository) scanIntegration(scanner interface{}) (*domain.Integration, error) {
	var integration domain.Integration
	var configJSON, credentialsJSON, metadataJSON []byte
	var lastSync pq.NullTime

	var err error
	switch s := scanner.(type) {
	case *sql.Row:
		err = s.Scan(
			&integration.ID,
			&integration.Name,
			&integration.Type,
			&integration.Status,
			&integration.Version,
			&integration.Description,
			&configJSON,
			&credentialsJSON,
			&metadataJSON,
			&integration.CreatedAt,
			&integration.UpdatedAt,
			&lastSync,
		)
	case interface{ Scan(...interface{}) error }:
		err = s.Scan(
			&integration.ID,
			&integration.Name,
			&integration.Type,
			&integration.Status,
			&integration.Version,
			&integration.Description,
			&configJSON,
			&credentialsJSON,
			&metadataJSON,
			&integration.CreatedAt,
			&integration.UpdatedAt,
			&lastSync,
		)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("integration not found")
		}
		return nil, fmt.Errorf("failed to scan integration: %w", err)
	}

	// Parse JSON fields
	if len(configJSON) > 0 {
		if err := json.Unmarshal(configJSON, &integration.Config); err != nil {
			return nil, fmt.Errorf("failed to unmarshal config: %w", err)
		}
	}

	if len(credentialsJSON) > 0 {
		if err := json.Unmarshal(credentialsJSON, &integration.Credentials); err != nil {
			return nil, fmt.Errorf("failed to unmarshal credentials: %w", err)
		}
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &integration.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	// Handle nullable last_sync
	if lastSync.Valid {
		integration.LastSync = &lastSync.Time
	}

	return &integration, nil
}
