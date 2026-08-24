package handlers

import (
	"net/http"
	"strconv"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// FeesHandlers обработчики для работы с комиссиями
type FeesHandlers struct {
	feesService *service.FeesService
}

// NewFeesHandlers создает новые FeesHandlers
func NewFeesHandlers(feesService *service.FeesService) *FeesHandlers {
	return &FeesHandlers{feesService: feesService}
}

// CreateFeeConfig создает новую конфигурацию комиссии
// @Summary Create fee config
// @Description Create a new fee configuration
// @Tags Fees
// @Accept json
// @Produce json
// @Param config body service.CreateFeeConfigRequest true "Fee configuration data"
// @Success 201 {object} domain.FeeConfig
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fees/configs [post]
func (h *FeesHandlers) CreateFeeConfig(c *gin.Context) {
	var req service.CreateFeeConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	config, err := h.feesService.CreateFeeConfig(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create fee config",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, config)
}

// GetFeeConfigByID получает конфигурацию по ID
// @Summary Get fee config by ID
// @Description Get a fee configuration by its ID
// @Tags Fees
// @Produce json
// @Param id path string true "Config ID"
// @Success 200 {object} domain.FeeConfig
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fees/configs/{id} [get]
func (h *FeesHandlers) GetFeeConfigByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid config ID",
		})
		return
	}

	config, err := h.feesService.GetFeeConfigByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Fee config not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, config)
}

// GetFeeConfigs получает конфигурации с фильтрацией
// @Summary Get fee configs
// @Description Get fee configurations with filtering
// @Tags Fees
// @Produce json
// @Param category query string false "Category filter"
// @Param is_active query bool false "Active status filter"
// @Success 200 {array} domain.FeeConfig
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fees/configs [get]
func (h *FeesHandlers) GetFeeConfigs(c *gin.Context) {
	category := domain.FeeCategory(c.Query("category"))
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

	configs, err := h.feesService.GetFeeConfigs(c.Request.Context(), category, isActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get fee configs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, configs)
}

// UpdateFeeConfig обновляет конфигурацию
// @Summary Update fee config
// @Description Update an existing fee configuration
// @Tags Fees
// @Accept json
// @Produce json
// @Param id path string true "Config ID"
// @Param config body service.UpdateFeeConfigRequest true "Updated fee configuration data"
// @Success 200 {object} domain.FeeConfig
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fees/configs/{id} [put]
func (h *FeesHandlers) UpdateFeeConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid config ID",
		})
		return
	}

	var req service.UpdateFeeConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	config, err := h.feesService.UpdateFeeConfig(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update fee config",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, config)
}

// DeleteFeeConfig удаляет конфигурацию
// @Summary Delete fee config
// @Description Delete a fee configuration by its ID
// @Tags Fees
// @Produce json
// @Param id path string true "Config ID"
// @Success 204 "No Content"
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fees/configs/{id} [delete]
func (h *FeesHandlers) DeleteFeeConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid config ID",
		})
		return
	}

	if err := h.feesService.DeleteFeeConfig(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete fee config",
			"details": err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}

// CalculateFee рассчитывает комиссию
// @Summary Calculate fee
// @Description Calculate fee for a transaction
// @Tags Fees
// @Accept json
// @Produce json
// @Param request body domain.FeeCalculationRequest true "Fee calculation request data"
// @Success 200 {object} domain.FeeCalculationResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fees/calculate [post]
func (h *FeesHandlers) CalculateFee(c *gin.Context) {
	var req domain.FeeCalculationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	response, err := h.feesService.CalculateFee(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to calculate fee",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// CreateSpreadConfig создает новую конфигурацию спреда
// @Summary Create spread config
// @Description Create a new spread configuration
// @Tags Fees
// @Accept json
// @Produce json
// @Param config body service.CreateSpreadConfigRequest true "Spread configuration data"
// @Success 201 {object} domain.SpreadConfig
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fees/spreads [post]
func (h *FeesHandlers) CreateSpreadConfig(c *gin.Context) {
	var req service.CreateSpreadConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	config, err := h.feesService.CreateSpreadConfig(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create spread config",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, config)
}

// CalculateSpread рассчитывает спред
// @Summary Calculate spread
// @Description Calculate spread for currency exchange
// @Tags Fees
// @Accept json
// @Produce json
// @Param request body domain.SpreadCalculationRequest true "Spread calculation request data"
// @Success 200 {object} domain.SpreadCalculationResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fees/spreads/calculate [post]
func (h *FeesHandlers) CalculateSpread(c *gin.Context) {
	var req domain.SpreadCalculationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	response, err := h.feesService.CalculateSpread(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to calculate spread",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetFeeStats получает статистику комиссий
// @Summary Get fee statistics
// @Description Get fee statistics for a specific user
// @Tags Fees
// @Produce json
// @Param user_id path string true "User ID"
// @Success 200 {object} domain.FeeStats
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/fees/stats/{user_id} [get]
func (h *FeesHandlers) GetFeeStats(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	stats, err := h.feesService.GetFeeStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get fee stats",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// RegisterFeesRoutes регистрирует маршруты для комиссий
func RegisterFeesRoutes(router *gin.RouterGroup, feesService *service.FeesService) {
	feesHandlers := NewFeesHandlers(feesService)
	
	// Конфигурации комиссий
	configs := router.Group("/fees/configs")
	{
		configs.POST("", feesHandlers.CreateFeeConfig)
		configs.GET("", feesHandlers.GetFeeConfigs)
		configs.GET("/:id", feesHandlers.GetFeeConfigByID)
		configs.PUT("/:id", feesHandlers.UpdateFeeConfig)
		configs.DELETE("/:id", feesHandlers.DeleteFeeConfig)
	}
	
	// Расчет комиссий
	router.POST("/fees/calculate", feesHandlers.CalculateFee)
	
	// Конфигурации спредов
	router.POST("/fees/spreads", feesHandlers.CreateSpreadConfig)
	router.POST("/fees/spreads/calculate", feesHandlers.CalculateSpread)
	
	// Статистика комиссий
	router.GET("/fees/stats/:user_id", feesHandlers.GetFeeStats)
}
