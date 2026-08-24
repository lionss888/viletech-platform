package data_access

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"amg-integration-bus/internal/domain"
)

// MetricRepository implements data access for integration metrics
type MetricRepository struct {
	db *sql.DB
}

// NewMetricRepository creates a new metric repository
func NewMetricRepository(db *sql.DB) MetricRepository {
	return MetricRepository{db: db}
}

// Create creates a new metric
func (r MetricRepository) Create(ctx context.Context, metric *domain.IntegrationMetric) error {
	query := `
		INSERT INTO integration_metrics (
			id, integration_id, name, value, unit, labels, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	labelsJSON, _ := json.Marshal(metric.Labels)

	_, err := r.db.ExecContext(ctx, query,
		metric.ID,
		metric.IntegrationID,
		metric.Name,
		metric.Value,
		metric.Unit,
		labelsJSON,
		metric.Timestamp,
	)

	if err != nil {
		return fmt.Errorf("failed to create metric: %w", err)
	}

	return nil
}

// GetByID retrieves a metric by ID
func (r MetricRepository) GetByID(ctx context.Context, id string) (*domain.IntegrationMetric, error) {
	query := `
		SELECT id, integration_id, name, value, unit, labels, timestamp
		FROM integration_metrics
		WHERE id = $1
	`

	row := r.db.QueryRowContext(ctx, query, id)
	return r.scanMetric(row)
}

// GetAll retrieves all metrics with optional filters
func (r MetricRepository) GetAll(ctx context.Context, filters map[string]interface{}) ([]*domain.IntegrationMetric, error) {
	query := `
		SELECT id, integration_id, name, value, unit, labels, timestamp
		FROM integration_metrics
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
		
		if name, ok := filters["name"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("name = $%d", argIndex))
			args = append(args, name)
			argIndex++
		}
		
		if unit, ok := filters["unit"]; ok {
			whereClauses = append(whereClauses, fmt.Sprintf("unit = $%d", argIndex))
			args = append(args, unit)
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
		return nil, fmt.Errorf("failed to query metrics: %w", err)
	}
	defer rows.Close()

	var metrics []*domain.IntegrationMetric
	for rows.Next() {
		metric, err := r.scanMetric(rows)
		if err != nil {
			return nil, err
		}
		metrics = append(metrics, metric)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating metrics: %w", err)
	}

	return metrics, nil
}

// GetAggregatedMetrics retrieves aggregated metrics for an integration
func (r MetricRepository) GetAggregatedMetrics(ctx context.Context, integrationID string, timeRange string) ([]map[string]interface{}, error) {
	// Determine the grouping interval based on time range
	var interval string
	switch timeRange {
	case "1h":
		interval = "1 minute"
	case "24h", "1d":
		interval = "1 hour"
	case "7d", "1w":
		interval = "1 day"
	case "30d", "1m":
		interval = "1 day"
	default:
		interval = "1 hour"
	}

	query := fmt.Sprintf(`
		SELECT 
			name,
			unit,
			DATE_TRUNC('%s', timestamp) as time_bucket,
			AVG(value) as avg_value,
			MIN(value) as min_value,
			MAX(value) as max_value,
			COUNT(*) as sample_count
		FROM integration_metrics
		WHERE integration_id = $1
		GROUP BY name, unit, time_bucket
		ORDER BY time_bucket DESC, name
	`, interval)

	rows, err := r.db.QueryContext(ctx, query, integrationID)
	if err != nil {
		return nil, fmt.Errorf("failed to query aggregated metrics: %w", err)
	}
	defer rows.Close()

	var metrics []map[string]interface{}
	for rows.Next() {
		var name, unit string
		var timeBucket interface{}
		var avgValue, minValue, maxValue float64
		var sampleCount int64

		err := rows.Scan(&name, &unit, &timeBucket, &avgValue, &minValue, &maxValue, &sampleCount)
		if err != nil {
			return nil, fmt.Errorf("failed to scan aggregated metric: %w", err)
		}

		metric := map[string]interface{}{
			"name":         name,
			"unit":         unit,
			"time_bucket":  timeBucket,
			"avg_value":    avgValue,
			"min_value":    minValue,
			"max_value":    maxValue,
			"sample_count": sampleCount,
		}

		metrics = append(metrics, metric)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating aggregated metrics: %w", err)
	}

	return metrics, nil
}

// GetMetricSummary retrieves a summary of metrics for an integration
func (r MetricRepository) GetMetricSummary(ctx context.Context, integrationID string) (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(DISTINCT name) as metric_count,
			COUNT(*) as total_samples,
			MIN(timestamp) as first_metric,
			MAX(timestamp) as last_metric,
			AVG(value) as avg_value,
			MIN(value) as min_value,
			MAX(value) as max_value
		FROM integration_metrics
		WHERE integration_id = $1
	`

	row := r.db.QueryRowContext(ctx, query, integrationID)
	
	var metricCount, totalSamples int64
	var firstMetric, lastMetric sql.NullTime
	var avgValue, minValue, maxValue sql.NullFloat64
	
	err := row.Scan(&metricCount, &totalSamples, &firstMetric, &lastMetric, 
		&avgValue, &minValue, &maxValue)
	if err != nil {
		return nil, fmt.Errorf("failed to get metric summary: %w", err)
	}

	summary := map[string]interface{}{
		"metric_count":   metricCount,
		"total_samples":  totalSamples,
	}

	if firstMetric.Valid {
		summary["first_metric"] = firstMetric.Time
	}

	if lastMetric.Valid {
		summary["last_metric"] = lastMetric.Time
	}

	if avgValue.Valid {
		summary["avg_value"] = avgValue.Float64
	}

	if minValue.Valid {
		summary["min_value"] = minValue.Float64
	}

	if maxValue.Valid {
		summary["max_value"] = maxValue.Float64
	}

	return summary, nil
}

// DeleteOldMetrics deletes metrics older than specified duration
func (r MetricRepository) DeleteOldMetrics(ctx context.Context, olderThan interface{}) error {
	query := "DELETE FROM integration_metrics WHERE timestamp < $1"

	result, err := r.db.ExecContext(ctx, query, olderThan)
	if err != nil {
		return fmt.Errorf("failed to delete old metrics: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	return nil
}

// scanMetric scans a database row into an IntegrationMetric struct
func (r MetricRepository) scanMetric(scanner interface{}) (*domain.IntegrationMetric, error) {
	var metric domain.IntegrationMetric
	var labelsJSON []byte

	var err error
	switch s := scanner.(type) {
	case *sql.Row:
		err = s.Scan(
			&metric.ID,
			&metric.IntegrationID,
			&metric.Name,
			&metric.Value,
			&metric.Unit,
			&labelsJSON,
			&metric.Timestamp,
		)
	case interface{ Scan(...interface{}) error }:
		err = s.Scan(
			&metric.ID,
			&metric.IntegrationID,
			&metric.Name,
			&metric.Value,
			&metric.Unit,
			&labelsJSON,
			&metric.Timestamp,
		)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("metric not found")
		}
		return nil, fmt.Errorf("failed to scan metric: %w", err)
	}

	// Parse JSON fields
	if len(labelsJSON) > 0 {
		if err := json.Unmarshal(labelsJSON, &metric.Labels); err != nil {
			return nil, fmt.Errorf("failed to unmarshal labels: %w", err)
		}
	}

	return &metric, nil
}
