package handlers

import (
	"net/http"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// LimitsHandlers обработчики для работы с лимитами
type LimitsHandlers struct {
	limitsService *service.LimitsService
}

// NewLimitsHandlers создает новые обработчики лимитов
func NewLimitsHandlers(limitsService *service.LimitsService) *LimitsHandlers {
	return &LimitsHandlers{
		limitsService: limitsService,
	}
}

// CreateLimit создает новый лимит
// @Summary Create limit
// @Description Create a new limit for user
// @Tags Limits
// @Accept json
// @Produce json
// @Param limit body service.CreateLimitRequest true "Limit data"
// @Success 201 {object} domain.LimitConfig
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/limits [post]
func (h *LimitsHandlers) CreateLimit(c *gin.Context) {
	var req service.CreateLimitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	limit, err := h.limitsService.CreateLimit(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create limit", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, limit)
}

// GetLimit получает лимит по ID
// @Summary Get limit
// @Description Get limit by ID
// @Tags Limits
// @Produce json
// @Param id path string true "Limit ID"
// @Success 200 {object} domain.LimitConfig
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/limits/{id} [get]
func (h *LimitsHandlers) GetLimit(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit ID"})
		return
	}

	limit, err := h.limitsService.GetLimit(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Limit not found"})
		return
	}

	c.JSON(http.StatusOK, limit)
}

// GetUserLimits получает лимиты пользователя
// @Summary Get user limits
// @Description Get all limits for user
// @Tags Limits
// @Produce json
// @Param user_id path string true "User ID"
// @Param active query bool false "Filter active limits only"
// @Success 200 {array} domain.LimitConfig
// @Failure 500 {object} map[string]string
// @Router /api/v1/limits/user/{user_id} [get]
func (h *LimitsHandlers) GetUserLimits(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	activeOnly := c.Query("active") == "true"

	var limits []*domain.LimitConfig
	if activeOnly {
		limits, err = h.limitsService.GetActiveUserLimits(c.Request.Context(), userID)
	} else {
		limits, err = h.limitsService.GetUserLimits(c.Request.Context(), userID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user limits", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, limits)
}

// UpdateLimit обновляет лимит
// @Summary Update limit
// @Description Update limit by ID
// @Tags Limits
// @Accept json
// @Produce json
// @Param id path string true "Limit ID"
// @Param limit body service.UpdateLimitRequest true "Limit update data"
// @Success 200 {object} domain.LimitConfig
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/limits/{id} [put]
func (h *LimitsHandlers) UpdateLimit(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit ID"})
		return
	}

	var req service.UpdateLimitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	limit, err := h.limitsService.UpdateLimit(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update limit", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, limit)
}

// DeleteLimit удаляет лимит
// @Summary Delete limit
// @Description Delete limit by ID
// @Tags Limits
// @Param id path string true "Limit ID"
// @Success 204
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/limits/{id} [delete]
func (h *LimitsHandlers) DeleteLimit(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit ID"})
		return
	}

	err = h.limitsService.DeleteLimit(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete limit", "details": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// CheckLimits проверяет лимиты для операции
// @Summary Check limits
// @Description Check limits for operation
// @Tags Limits
// @Accept json
// @Produce json
// @Param request body domain.LimitCheckRequest true "Limit check request"
// @Success 200 {object} domain.LimitCheckResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/limits/check [post]
func (h *LimitsHandlers) CheckLimits(c *gin.Context) {
	var req domain.LimitCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	response, err := h.limitsService.CheckLimits(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check limits", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// RecordLimitUsage записывает использование лимита
// @Summary Record limit usage
// @Description Record limit usage for transaction
// @Tags Limits
// @Accept json
// @Produce json
// @Param usage body service.RecordLimitUsageRequest true "Limit usage data"
// @Success 201
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/limits/usage [post]
func (h *LimitsHandlers) RecordLimitUsage(c *gin.Context) {
	var req service.RecordLimitUsageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data", "details": err.Error()})
		return
	}

	err := h.limitsService.RecordLimitUsage(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record limit usage", "details": err.Error()})
		return
	}

	c.Status(http.StatusCreated)
}

// GetLimitStats получает статистику по лимитам пользователя
// @Summary Get limit stats
// @Description Get limit statistics for user
// @Tags Limits
// @Produce json
// @Param user_id path string true "User ID"
// @Success 200 {object} domain.LimitStats
// @Failure 500 {object} map[string]string
// @Router /api/v1/limits/stats/{user_id} [get]
func (h *LimitsHandlers) GetLimitStats(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	stats, err := h.limitsService.GetLimitStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get limit stats", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetRemainingLimits получает оставшиеся лимиты пользователя
// @Summary Get remaining limits
// @Description Get remaining limits for user
// @Tags Limits
// @Produce json
// @Param user_id path string true "User ID"
// @Param category query string false "Limit category filter"
// @Success 200 {array} domain.LimitInfo
// @Failure 500 {object} map[string]string
// @Router /api/v1/limits/remaining/{user_id} [get]
func (h *LimitsHandlers) GetRemainingLimits(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	category := domain.LimitCategory(c.Query("category"))

	limits, err := h.limitsService.GetRemainingLimits(c.Request.Context(), userID, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get remaining limits", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, limits)
}

// RegisterLimitsRoutes регистрирует маршруты для лимитов
func RegisterLimitsRoutes(router *gin.RouterGroup, limitsService *service.LimitsService) {
	handlers := NewLimitsHandlers(limitsService)

	limits := router.Group("/limits")
	{
		limits.POST("", handlers.CreateLimit)
		limits.GET("/:id", handlers.GetLimit)
		limits.PUT("/:id", handlers.UpdateLimit)
		limits.DELETE("/:id", handlers.DeleteLimit)
		limits.POST("/check", handlers.CheckLimits)
		limits.POST("/usage", handlers.RecordLimitUsage)
		limits.GET("/user/:user_id", handlers.GetUserLimits)
		limits.GET("/stats/:user_id", handlers.GetLimitStats)
		limits.GET("/remaining/:user_id", handlers.GetRemainingLimits)
	}
}
