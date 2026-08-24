package middleware

import (
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/gin-gonic/gin"
)

// Logger middleware для логирования HTTP запросов
func Logger(log logger.Logger) gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		log.Infof("[%s] %s %s %d %s %s %s",
			param.TimeStamp.Format(time.RFC3339),
			param.Method,
			param.Path,
			param.StatusCode,
			param.Latency,
			param.ClientIP,
			param.ErrorMessage,
		)
		return ""
	})
}
