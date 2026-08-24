package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	RequestIDHeader = "X-Request-ID"
	RequestIDKey    = "request_id"
)

// RequestID middleware для добавления Request ID
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader(RequestIDHeader)
		if requestID == "" {
			requestID = generateRequestID()
		}
		
		c.Header(RequestIDHeader, requestID)
		c.Set(RequestIDKey, requestID)
		c.Next()
	}
}

// GetRequestID получает Request ID из контекста
func GetRequestID(c *gin.Context) string {
	if requestID, exists := c.Get(RequestIDKey); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return ""
}

// generateRequestID генерирует уникальный Request ID
func generateRequestID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// generateSessionID генерирует уникальный Session ID
func generateSessionID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return "session-" + hex.EncodeToString(bytes)
}
