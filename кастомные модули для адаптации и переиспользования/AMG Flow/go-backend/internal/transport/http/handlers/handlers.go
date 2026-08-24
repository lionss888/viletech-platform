package handlers

import (
	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/logger"
)

// Handlers содержит все HTTP хендлеры
type Handlers struct {
	pythonClient *service.PythonAnalyticsClient
	logger       logger.Logger
}

// NewHandlers создает новые хендлеры
func NewHandlers(pythonClient *service.PythonAnalyticsClient, logger logger.Logger) *Handlers {
	return &Handlers{
		pythonClient: pythonClient,
		logger:       logger,
	}
}
