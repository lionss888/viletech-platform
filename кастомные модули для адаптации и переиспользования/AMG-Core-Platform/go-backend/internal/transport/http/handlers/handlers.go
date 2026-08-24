package handlers

import (
	"amg-flow-backend/internal/data-access"
	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/logger"
)

// Handlers содержит все HTTP хендлеры
type Handlers struct {
	pythonClient   *service.PythonAnalyticsClient
	strigaHandlers *StrigaHandlers
	limitsHandlers *LimitsHandlers
	fraudHandlers  *FraudHandlers
	logger         logger.Logger
}

// NewHandlers создает новые хендлеры
func NewHandlers(
	pythonClient *service.PythonAnalyticsClient,
	strigaService *service.StrigaService,
	limitsRepo dataaccess.LimitsRepository,
	fraudRepo dataaccess.FraudRepository,
	logger logger.Logger,
) *Handlers {
	limitsService := service.NewLimitsService(limitsRepo)
	fraudService := service.NewFraudService(fraudRepo)

	return &Handlers{
		pythonClient:   pythonClient,
		strigaHandlers: NewStrigaHandlers(strigaService, logger),
		limitsHandlers: NewLimitsHandlers(limitsService),
		fraudHandlers:  NewFraudHandlers(fraudService),
		logger:         logger,
	}
}

// GetStrigaHandlers возвращает Striga handlers
func (h *Handlers) GetStrigaHandlers() *StrigaHandlers {
	return h.strigaHandlers
}

// GetLimitsHandlers возвращает Limits handlers
func (h *Handlers) GetLimitsHandlers() *LimitsHandlers {
	return h.limitsHandlers
}

// GetFraudHandlers возвращает Fraud handlers
func (h *Handlers) GetFraudHandlers() *FraudHandlers {
	return h.fraudHandlers
}
