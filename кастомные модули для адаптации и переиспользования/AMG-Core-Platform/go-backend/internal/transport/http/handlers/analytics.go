package handlers

import (
	"net/http"

	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// GetDailyAnalytics получает ежедневную аналитику
func (h *Handlers) GetDailyAnalytics(c *gin.Context) {
	// Получаем параметры запроса
	date := c.Query("date")
	days := c.DefaultQuery("days", "1")

	// Создаем параметры для Python сервиса
	params := map[string]string{
		"date": date,
		"days": days,
	}

	// Получаем аналитику из Python сервиса
	analytics, err := h.pythonClient.GetAnalytics(c.Request.Context(), "daily", params)
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

	c.JSON(http.StatusOK, analytics)
}

// GetUserAnalytics получает аналитику пользователя
func (h *Handlers) GetUserAnalytics(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	// Получаем параметры запроса
	days := c.DefaultQuery("days", "30")

	// Создаем параметры для Python сервиса
	params := map[string]string{
		"user_id": userID,
		"days":    days,
	}

	// Получаем аналитику из Python сервиса
	analytics, err := h.pythonClient.GetAnalytics(c.Request.Context(), "user", params)
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

	c.JSON(http.StatusOK, analytics)
}

// GetConversationAnalytics получает аналитику разговора
func (h *Handlers) GetConversationAnalytics(c *gin.Context) {
	conversationID := c.Param("conversation_id")
	if conversationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Conversation ID is required",
		})
		return
	}

	// Создаем параметры для Python сервиса
	params := map[string]string{
		"conversation_id": conversationID,
	}

	// Получаем аналитику из Python сервиса
	analytics, err := h.pythonClient.GetAnalytics(c.Request.Context(), "conversation", params)
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

	c.JSON(http.StatusOK, analytics)
}