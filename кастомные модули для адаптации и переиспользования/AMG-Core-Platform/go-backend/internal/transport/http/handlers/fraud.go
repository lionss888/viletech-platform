package handlers

import (
	"net/http"
	"strconv"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// FraudHandlers обработчики для работы с фрод-контролем
type FraudHandlers struct {
	fraudService *service.FraudService
}

// NewFraudHandlers создает новые FraudHandlers
func NewFraudHandlers(fraudService *service.FraudService) *FraudHandlers {
	return &FraudHandlers{fraudService: fraudService}
}

// CreateFraudRule создает новое правило фрод-контроля
// @Summary Create fraud rule
// @Description Create a new fraud control rule
// @Tags Fraud
// @Accept json
// @Produce json
// @Param rule body service.CreateFraudRuleRequest true "Fraud rule data"
// @Success 201 {object} domain.FraudRule
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/rules [post]
func (h *FraudHandlers) CreateFraudRule(c *gin.Context) {
	var req service.CreateFraudRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	rule, err := h.fraudService.CreateFraudRule(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create fraud rule",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, rule)
}

// GetFraudRuleByID получает правило по ID
// @Summary Get fraud rule by ID
// @Description Get a fraud rule by its ID
// @Tags Fraud
// @Produce json
// @Param id path string true "Rule ID"
// @Success 200 {object} domain.FraudRule
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/rules/{id} [get]
func (h *FraudHandlers) GetFraudRuleByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid rule ID",
		})
		return
	}

	rule, err := h.fraudService.GetFraudRuleByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Fraud rule not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, rule)
}

// GetFraudRules получает правила с фильтрацией
// @Summary Get fraud rules
// @Description Get fraud rules with filtering
// @Tags Fraud
// @Produce json
// @Param rule_type query string false "Rule type filter"
// @Param is_active query bool false "Active status filter"
// @Success 200 {array} domain.FraudRule
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/rules [get]
func (h *FraudHandlers) GetFraudRules(c *gin.Context) {
	ruleType := domain.FraudRuleType(c.Query("rule_type"))
	isActiveStr := c.Query("is_active")

	var isActive bool
	if isActiveStr != "" {
		var err error
		isActive, err = strconv.ParseBool(isActiveStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid is_active parameter",
			})
			return
		}
	}

	rules, err := h.fraudService.GetFraudRules(c.Request.Context(), ruleType, isActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get fraud rules",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, rules)
}

// UpdateFraudRule обновляет правило
// @Summary Update fraud rule
// @Description Update an existing fraud rule
// @Tags Fraud
// @Accept json
// @Produce json
// @Param id path string true "Rule ID"
// @Param rule body service.UpdateFraudRuleRequest true "Updated fraud rule data"
// @Success 200 {object} domain.FraudRule
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/rules/{id} [put]
func (h *FraudHandlers) UpdateFraudRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid rule ID",
		})
		return
	}

	var req service.UpdateFraudRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	rule, err := h.fraudService.UpdateFraudRule(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update fraud rule",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, rule)
}

// DeleteFraudRule удаляет правило
// @Summary Delete fraud rule
// @Description Delete a fraud rule by its ID
// @Tags Fraud
// @Produce json
// @Param id path string true "Rule ID"
// @Success 204 "No Content"
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/rules/{id} [delete]
func (h *FraudHandlers) DeleteFraudRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid rule ID",
		})
		return
	}

	if err := h.fraudService.DeleteFraudRule(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete fraud rule",
			"details": err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}

// CheckFraudRules проверяет правила фрод-контроля
// @Summary Check fraud rules
// @Description Check fraud control rules for a transaction or event
// @Tags Fraud
// @Accept json
// @Produce json
// @Param checkRequest body domain.FraudCheckRequest true "Fraud check request data"
// @Success 200 {object} domain.FraudCheckResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/check [post]
func (h *FraudHandlers) CheckFraudRules(c *gin.Context) {
	var req domain.FraudCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	response, err := h.fraudService.CheckFraudRules(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to check fraud rules",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetFraudChecksByUserID получает проверки пользователя
// @Summary Get fraud checks by user ID
// @Description Get fraud checks for a specific user
// @Tags Fraud
// @Produce json
// @Param user_id path string true "User ID"
// @Param limit query int false "Limit"
// @Param offset query int false "Offset"
// @Success 200 {array} domain.FraudCheck
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/checks/user/{user_id} [get]
func (h *FraudHandlers) GetFraudChecksByUserID(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	limitStr := c.Query("limit")
	offsetStr := c.Query("offset")

	limit := 0
	offset := 0

	if limitStr != "" {
		limit, err = strconv.Atoi(limitStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid limit parameter",
			})
			return
		}
	}

	if offsetStr != "" {
		offset, err = strconv.Atoi(offsetStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid offset parameter",
			})
			return
		}
	}

	checks, err := h.fraudService.GetFraudChecksByUserID(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get fraud checks",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, checks)
}

// GetFraudAlertsByUserID получает алерты пользователя
// @Summary Get fraud alerts by user ID
// @Description Get fraud alerts for a specific user
// @Tags Fraud
// @Produce json
// @Param user_id path string true "User ID"
// @Param is_resolved query bool false "Resolved status filter"
// @Success 200 {array} domain.FraudAlert
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/alerts/user/{user_id} [get]
func (h *FraudHandlers) GetFraudAlertsByUserID(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	isResolvedStr := c.Query("is_resolved")
	var isResolved bool
	if isResolvedStr != "" {
		isResolved, err = strconv.ParseBool(isResolvedStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid is_resolved parameter",
			})
			return
		}
	}

	alerts, err := h.fraudService.GetFraudAlertsByUserID(c.Request.Context(), userID, isResolved)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get fraud alerts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, alerts)
}

// ResolveFraudAlert разрешает алерт
// @Summary Resolve fraud alert
// @Description Resolve a fraud alert
// @Tags Fraud
// @Produce json
// @Param id path string true "Alert ID"
// @Param resolved_by path string true "Resolved by user ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/alerts/{id}/resolve/{resolved_by} [post]
func (h *FraudHandlers) ResolveFraudAlert(c *gin.Context) {
	alertIDStr := c.Param("id")
	resolvedByStr := c.Param("resolved_by")

	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid alert ID",
		})
		return
	}

	resolvedBy, err := uuid.Parse(resolvedByStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid resolved_by ID",
		})
		return
	}

	if err := h.fraudService.ResolveFraudAlert(c.Request.Context(), alertID, resolvedBy); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to resolve fraud alert",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Fraud alert resolved successfully",
	})
}

// GetFraudStats получает статистику фрод-контроля
// @Summary Get fraud statistics
// @Description Get fraud statistics for a specific user
// @Tags Fraud
// @Produce json
// @Param user_id path string true "User ID"
// @Success 200 {object} domain.FraudStats
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fraud/stats/{user_id} [get]
func (h *FraudHandlers) GetFraudStats(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	stats, err := h.fraudService.GetFraudStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get fraud stats",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// RegisterFraudRoutes регистрирует маршруты для фрод-контроля
func RegisterFraudRoutes(router *gin.RouterGroup, fraudService *service.FraudService) {
	fraudHandlers := NewFraudHandlers(fraudService)

	// Правила фрод-контроля
	rules := router.Group("/fraud/rules")
	{
		rules.POST("", fraudHandlers.CreateFraudRule)
		rules.GET("", fraudHandlers.GetFraudRules)
		rules.GET("/:id", fraudHandlers.GetFraudRuleByID)
		rules.PUT("/:id", fraudHandlers.UpdateFraudRule)
		rules.DELETE("/:id", fraudHandlers.DeleteFraudRule)
	}

	// Проверки фрод-контроля
	router.POST("/fraud/check", fraudHandlers.CheckFraudRules)
	router.GET("/fraud/checks/user/:user_id", fraudHandlers.GetFraudChecksByUserID)

	// Алерты фрод-контроля
	alerts := router.Group("/fraud/alerts")
	{
		alerts.GET("/user/:user_id", fraudHandlers.GetFraudAlertsByUserID)
		alerts.POST("/:id/resolve/:resolved_by", fraudHandlers.ResolveFraudAlert)
	}

	// Статистика фрод-контроля
	router.GET("/fraud/stats/:user_id", fraudHandlers.GetFraudStats)
}
