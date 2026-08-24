package middleware

import (
	"net/http"

	"amg-flow-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

// Recovery middleware для обработки паник
func Recovery(log logger.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		if err, ok := recovered.(string); ok {
			log.Errorf("Panic recovered: %s", err)
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Internal server error",
		})
	})
}
