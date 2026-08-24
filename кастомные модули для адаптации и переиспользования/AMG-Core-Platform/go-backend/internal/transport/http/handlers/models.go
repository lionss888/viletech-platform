package handlers

import (
	"net/http"

	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// ModelInfo представляет информацию о модели
type ModelInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
}

// ModelsResponse представляет ответ со списком моделей
type ModelsResponse struct {
	Models []ModelInfo `json:"models"`
	Total  int         `json:"total"`
}

// GetModels получает список моделей
func (h *Handlers) GetModels(c *gin.Context) {
	// Создаем сервис моделей (в реальной реализации здесь будет DI)
	modelService := service.NewModelService(h.pythonClient, h.logger)

	// Получаем модели через Python сервис
	models, err := modelService.GetAvailableModels(c.Request.Context())
	if err != nil {
		appErr, ok := err.(*errors.AppError)
		if ok {
			c.JSON(appErr.StatusCode, gin.H{
				"error": appErr.Error(),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Internal server error",
			})
		}
		return
	}

	response := ModelsResponse{
		Models: models,
		Total:  len(models),
	}

	c.JSON(http.StatusOK, response)
}

// CreateModel создает новую модель
func (h *Handlers) CreateModel(c *gin.Context) {
	var model ModelInfo
	if err := c.ShouldBindJSON(&model); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid model data",
		})
		return
	}

	// Здесь должна быть логика создания модели в базе данных
	// Пока возвращаем заглушку
	c.JSON(http.StatusCreated, gin.H{
		"message": "Model created successfully",
		"model":   model,
	})
}

// UpdateModel обновляет модель
func (h *Handlers) UpdateModel(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Model ID is required",
		})
		return
	}

	var model ModelInfo
	if err := c.ShouldBindJSON(&model); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid model data",
		})
		return
	}

	// Здесь должна быть логика обновления модели в базе данных
	// Пока возвращаем заглушку
	c.JSON(http.StatusOK, gin.H{
		"message": "Model updated successfully",
		"model":   model,
	})
}

// DeleteModel удаляет модель
func (h *Handlers) DeleteModel(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Model ID is required",
		})
		return
	}

	// Здесь должна быть логика удаления модели из базы данных
	// Пока возвращаем заглушку
	c.JSON(http.StatusOK, gin.H{
		"message": "Model deleted successfully",
	})
}
