package handlers

import (
	"net/http"
	"time"

	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// ProcessChat обрабатывает запрос чата
func (h *Handlers) ProcessChat(c *gin.Context) {
	var req service.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": errors.New(errors.ErrCodeValidation, "Invalid request format").Error(),
		})
		return
	}

	// Получаем session ID из заголовков или создаем новый
	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		sessionID = generateSessionID()
	}

	// Создаем сервис чата (в реальной реализации здесь будет DI)
	chatService := service.NewChatService(nil, nil, nil, nil, h.pythonClient, h.logger)

	// Обрабатываем запрос
	response, err := chatService.ProcessChat(c.Request.Context(), &req, sessionID)
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

	c.JSON(http.StatusOK, response)
}

// GetChatHistory получает историю чата
func (h *Handlers) GetChatHistory(c *gin.Context) {
	conversationID := c.Param("conversation_id")
	if conversationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Conversation ID is required",
		})
		return
	}

	// Получаем параметры пагинации
	limit := c.DefaultQuery("limit", "50")
	offset := c.DefaultQuery("offset", "0")

	// Здесь должна быть логика получения истории из базы данных
	// Пока возвращаем заглушку
	c.JSON(http.StatusOK, gin.H{
		"conversation_id": conversationID,
		"messages":        []interface{}{},
		"limit":           limit,
		"offset":          offset,
		"total":           0,
	})
}

// generateSessionID генерирует уникальный ID сессии
func generateSessionID() string {
	return "session-" + generateRequestID()
}

// generateRequestID генерирует уникальный ID запроса
func generateRequestID() string {
	return "req-" + generateRandomString(10)
}

// generateRandomString генерирует случайную строку
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}
