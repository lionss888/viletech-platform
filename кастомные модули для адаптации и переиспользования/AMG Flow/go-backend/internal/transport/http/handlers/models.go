package handlers

import (
	"net/http"

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
	// Здесь должна быть логика получения моделей из базы данных
	// Пока возвращаем заглушку
	models := []ModelInfo{
		{
			ID:          "1",
			Name:        "llama3.2:3b-instruct-q4_0",
			DisplayName: "Llama 3.2 3B Instruct",
			Description: "Small, fast model for general tasks",
			IsActive:    true,
		},
		{
			ID:          "2",
			Name:        "codellama:7b",
			DisplayName: "Code Llama 7B",
			Description: "Specialized model for code generation",
			IsActive:    true,
		},
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
