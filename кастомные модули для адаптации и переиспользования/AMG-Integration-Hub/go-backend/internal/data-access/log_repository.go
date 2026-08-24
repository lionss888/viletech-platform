package data_access

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"amg-integration-bus/internal/domain"
)

// LogRepository implements data access for integration logs
type LogRepository struct {
	db *sql.DB
}

// NewLogRepository creates a new log repository
func NewLogRepository(db *sql.DB) LogRepository {
	return LogRepository{db: db}
}

// Create creates a new log entry
func (r LogRepository) Create(ctx context.Context, log *domain.IntegrationLog) error {
	query := `
		INSERT INTO integration_logs (
			id, integration_id, level, message, context, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6)
	`

	contextJSON, _ := json.Marshal(log.Context)

	_, err := r.db.ExecContext(ctx, query,
		log.ID,
		log.IntegrationID,
		log.Level,
		log.Message,
		contextJSON,
		log.Timestamp,
	)

	if err != nil {
		return fmt.Errorf("failed to create log: %w", err)
	}

	return nil
}

// GetByID retrieves a log entry by ID
func (r LogRepository) GetByID(ctx context.Context, id string) (*domain.IntegrationLog, error) {
	query := `
		SELECT id, integration_id, level, message, context, timestamp
		FROM integration_logs
		WHERE id = $1
	`

	row := r.db.QueryRowContext(ctx, query, id)
	return r.scanLog(row)
}

// GetAll retrieves all log entries with optional filters
func (r LogRepository) GetAll(ctx context.Context, filters map[string]interface{}) ([]*domain.IntegrationLog, error) {
	query := `
		SELECT id, integration_id, level, message, context, timestamp
		FROM integration_logs
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
		
		if level, ok := filters["level"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("level = $%d", argIndex))
			args = append(args, level)
			argIndex++
		}
		
		if message, ok := filters["message"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("message ILIKE $%d", argIndex))
			args = append(args, "%"+message.(string)+"%")
			argIndex++
		}

		// Time range filters
		if startTime, ok := filters["start_time"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("timestamp >= $%d", argIndex))
			args = append(args, startTime)
			argIndex++
		}
		
		if endTime, ok := filters["end_time"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("timestamp <= $%d", argIndex))
			args = append(args, endTime)
			argIndex++
		}

		if len(whereClauses) > 0 {
			query += " WHERE " + strings.Join(whereClauses, " AND ")
		}
	}

	// Add ordering
	query += " ORDER BY timestamp DESC"

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
		return nil, fmt.Errorf("failed to query logs: %w", err)
	}
	defer rows.Close()

	var logs []*domain.IntegrationLog
	for rows.Next() {
		log, err := r.scanLog(rows)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating logs: %w", err)
	}

	return logs, nil
}

// GetLogLevels retrieves distinct log levels for an integration
func (r LogRepository) GetLogLevels(ctx context.Context, integrationID string) ([]string, error) {
	query := `
		SELECT DISTINCT level
		FROM integration_logs
		WHERE integration_id = $1
		ORDER BY level
	`

	rows, err := r.db.QueryContext(ctx, query, integrationID)
	if err != nil {
		return nil, fmt.Errorf("failed to query log levels: %w", err)
	}
	defer rows.Close()

	var levels []string
	for rows.Next() {
		var level string
		if err := rows.Scan(&level); err != nil {
			return nil, fmt.Errorf("failed to scan log level: %w", err)
		}
		levels = append(levels, level)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating log levels: %w", err)
	}

	return levels, nil
}

// GetLogStats retrieves log statistics for an integration
func (r LogRepository) GetLogStats(ctx context.Context, integrationID string) (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(*) as total_logs,
			COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
			COUNT(CASE WHEN level = 'warn' THEN 1 END) as warn_count,
			COUNT(CASE WHEN level = 'info' THEN 1 END) as info_count,
			COUNT(CASE WHEN level = 'debug' THEN 1 END) as debug_count,
			MIN(timestamp) as first_log,
			MAX(timestamp) as last_log
		FROM integration_logs
		WHERE integration_id = $1
	`

	row := r.db.QueryRowContext(ctx, query, integrationID)
	
	var totalLogs, errorCount, warnCount, infoCount, debugCount int64
	var firstLog, lastLog sql.NullTime
	
	err := row.Scan(&totalLogs, &errorCount, &warnCount, &infoCount, &debugCount, 
		&firstLog, &lastLog)
	if err != nil {
		return nil, fmt.Errorf("failed to get log stats: %w", err)
	}

	stats := map[string]interface{}{
		"total_logs": totalLogs,
		"error_count": errorCount,
		"warn_count":  warnCount,
		"info_count":  infoCount,
		"debug_count": debugCount,
	}

	if firstLog.Valid {
		stats["first_log"] = firstLog.Time
	}

	if lastLog.Valid {
		stats["last_log"] = lastLog.Time
	}

	return stats, nil
}

// DeleteOldLogs deletes logs older than specified duration
func (r LogRepository) DeleteOldLogs(ctx context.Context, olderThan interface{}) error {
	query := "DELETE FROM integration_logs WHERE timestamp < $1"

	result, err := r.db.ExecContext(ctx, query, olderThan)
	if err != nil {
		return fmt.Errorf("failed to delete old logs: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	return nil
}

// scanLog scans a database row into an IntegrationLog struct
func (r LogRepository) scanLog(scanner interface{}) (*domain.IntegrationLog, error) {
	var log domain.IntegrationLog
	var contextJSON []byte

	var err error
	switch s := scanner.(type) {
	case *sql.Row:
		err = s.Scan(
			&log.ID,
			&log.IntegrationID,
			&log.Level,
			&log.Message,
			&contextJSON,
			&log.Timestamp,
		)
	case interface{ Scan(...interface{}) error }:
		err = s.Scan(
			&log.ID,
			&log.IntegrationID,
			&log.Level,
			&log.Message,
			&contextJSON,
			&log.Timestamp,
		)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("log not found")
		}
		return nil, fmt.Errorf("failed to scan log: %w", err)
	}

	// Parse JSON fields
	if len(contextJSON) > 0 {
		if err := json.Unmarshal(contextJSON, &log.Context); err != nil {
			return nil, fmt.Errorf("failed to unmarshal context: %w", err)
		}
	}

	return &log, nil
}
