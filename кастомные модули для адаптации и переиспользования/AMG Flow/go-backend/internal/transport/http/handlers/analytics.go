package handlers

import (
	"net/http"

	"amg-flow-backend/internal/service"

	"github.com/gin-gonic/gin"
)

// GetDailyAnalytics получает ежедневную аналитику
func (h *Handlers) GetDailyAnalytics(c *gin.Context) {
	date := c.DefaultQuery("date", "")
	days := c.DefaultQuery("days", "1")

	params := map[string]string{
		"date": date,
		"days": days,
	}

	analytics, err := h.pythonClient.GetAnalytics(c.Request.Context(), "daily", params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get daily analytics",
		})
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

	days := c.DefaultQuery("days", "30")

	params := map[string]string{
		"user_id": userID,
		"days":    days,
	}

	analytics, err := h.pythonClient.GetAnalytics(c.Request.Context(), "user", params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user analytics",
		})
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

	params := map[string]string{
		"conversation_id": conversationID,
	}

	analytics, err := h.pythonClient.GetAnalytics(c.Request.Context(), "conversation", params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get conversation analytics",
		})
		return
	}

	c.JSON(http.StatusOK, analytics)
}
