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

// OperationRepository implements data access for integration operations
type OperationRepository struct {
	db *sql.DB
}

// NewOperationRepository creates a new operation repository
func NewOperationRepository(db *sql.DB) OperationRepository {
	return OperationRepository{db: db}
}

// Create creates a new operation
func (r OperationRepository) Create(ctx context.Context, operation *domain.IntegrationOperation) error {
	query := `
		INSERT INTO integration_operations (
			id, integration_id, action, params, result, status, 
			error, duration, created_at, completed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	paramsJSON, _ := json.Marshal(operation.Params)
	resultJSON, _ := json.Marshal(operation.Result)

	_, err := r.db.ExecContext(ctx, query,
		operation.ID,
		operation.IntegrationID,
		operation.Action,
		paramsJSON,
		resultJSON,
		operation.Status,
		operation.Error,
		operation.Duration,
		operation.CreatedAt,
		operation.CompletedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create operation: %w", err)
	}

	return nil
}

// GetByID retrieves an operation by ID
func (r OperationRepository) GetByID(ctx context.Context, id string) (*domain.IntegrationOperation, error) {
	query := `
		SELECT id, integration_id, action, params, result, status,
			   error, duration, created_at, completed_at
		FROM integration_operations
		WHERE id = $1
	`

	row := r.db.QueryRowContext(ctx, query, id)
	return r.scanOperation(row)
}

// GetAll retrieves all operations with optional filters
func (r OperationRepository) GetAll(ctx context.Context, filters map[string]interface{}) ([]*domain.IntegrationOperation, error) {
	query := `
		SELECT id, integration_id, action, params, result, status,
			   error, duration, created_at, completed_at
		FROM integration_operations
	`
	
	args := []interface{}{}
	argIndex := 1

	// Build WHERE clause from filters
	if len(filters) > 0 {
		whereClauses := []string{}
		
		if integrationID, ok := filters["integration_id"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("integration_id = $%d", argIndex))
			args = append(args, integrationID)
			argIndex++
		}
		
		if action, ok := filters["action"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("action = $%d", argIndex))
			args = append(args, action)
			argIndex++
		}
		
		if status, ok := filters["status"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argIndex))
			args = append(args, status)
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
		return nil, fmt.Errorf("failed to query operations: %w", err)
	}
	defer rows.Close()

	var operations []*domain.IntegrationOperation
	for rows.Next() {
		operation, err := r.scanOperation(rows)
		if err != nil {
			return nil, err
		}
		operations = append(operations, operation)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating operations: %w", err)
	}

	return operations, nil
}

// Update updates an operation
func (r OperationRepository) Update(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	setClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	for key, value := range updates {
		switch key {
		case "action", "status", "error", "duration":
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
			args = append(args, value)
			argIndex++
		case "params", "result":
			jsonValue, _ := json.Marshal(value)
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
			args = append(args, jsonValue)
			argIndex++
		case "completed_at":
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIndex))
			args = append(args, value)
			argIndex++
		}
	}

	if len(setClauses) == 0 {
		return nil
	}

	query := fmt.Sprintf("UPDATE integration_operations SET %s WHERE id = $%d", 
		strings.Join(setClauses, ", "), argIndex)
	args = append(args, id)

	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update operation: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("operation with id %s not found", id)
	}

	return nil
}

// Delete deletes an operation
func (r OperationRepository) Delete(ctx context.Context, id string) error {
	query := "DELETE FROM integration_operations WHERE id = $1"

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete operation: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("operation with id %s not found", id)
	}

	return nil
}

// GetStats retrieves operation statistics
func (r OperationRepository) GetStats(ctx context.Context, integrationID string) (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(*) as total_operations,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_operations,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_operations,
			COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_operations,
			AVG(CASE WHEN duration > 0 THEN duration END) as avg_duration_ms
		FROM integration_operations
		WHERE integration_id = $1
	`

	row := r.db.QueryRowContext(ctx, query, integrationID)
	
	var total, successful, failed, pending int64
	var avgDuration sql.NullFloat64
	
	err := row.Scan(&total, &successful, &failed, &pending, &avgDuration)
	if err != nil {
		return nil, fmt.Errorf("failed to get operation stats: %w", err)
	}

	stats := map[string]interface{}{
		"total_operations":      total,
		"successful_operations": successful,
		"failed_operations":     failed,
		"pending_operations":    pending,
		"success_rate":          float64(successful) / float64(total) * 100,
		"failure_rate":          float64(failed) / float64(total) * 100,
	}

	if avgDuration.Valid {
		stats["avg_duration_ms"] = avgDuration.Float64
	}

	return stats, nil
}

// GetRecentOperations retrieves recent operations for an integration
func (r OperationRepository) GetRecentOperations(ctx context.Context, integrationID string, limit int) ([]*domain.IntegrationOperation, error) {
	query := `
		SELECT id, integration_id, action, params, result, status,
			   error, duration, created_at, completed_at
		FROM integration_operations
		WHERE integration_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, integrationID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query recent operations: %w", err)
	}
	defer rows.Close()

	var operations []*domain.IntegrationOperation
	for rows.Next() {
		operation, err := r.scanOperation(rows)
		if err != nil {
			return nil, err
		}
		operations = append(operations, operation)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating recent operations: %w", err)
	}

	return operations, nil
}

// scanOperation scans a database row into an IntegrationOperation struct
func (r OperationRepository) scanOperation(scanner interface{}) (*domain.IntegrationOperation, error) {
	var operation domain.IntegrationOperation
	var paramsJSON, resultJSON []byte
	var completedAt pq.NullTime

	var err error
	switch s := scanner.(type) {
	case *sql.Row:
		err = s.Scan(
			&operation.ID,
			&operation.IntegrationID,
			&operation.Action,
			&paramsJSON,
			&resultJSON,
			&operation.Status,
			&operation.Error,
			&operation.Duration,
			&operation.CreatedAt,
			&completedAt,
		)
	case interface{ Scan(...interface{}) error }:
		err = s.Scan(
			&operation.ID,
			&operation.IntegrationID,
			&operation.Action,
			&paramsJSON,
			&resultJSON,
			&operation.Status,
			&operation.Error,
			&operation.Duration,
			&operation.CreatedAt,
			&completedAt,
		)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("operation not found")
		}
		return nil, fmt.Errorf("failed to scan operation: %w", err)
	}

	// Parse JSON fields
	if len(paramsJSON) > 0 {
		if err := json.Unmarshal(paramsJSON, &operation.Params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal params: %w", err)
		}
	}

	if len(resultJSON) > 0 {
		if err := json.Unmarshal(resultJSON, &operation.Result); err != nil {
			return nil, fmt.Errorf("failed to unmarshal result: %w", err)
		}
	}

	// Handle nullable completed_at
	if completedAt.Valid {
		operation.CompletedAt = &completedAt.Time
	}

	return &operation, nil
}
