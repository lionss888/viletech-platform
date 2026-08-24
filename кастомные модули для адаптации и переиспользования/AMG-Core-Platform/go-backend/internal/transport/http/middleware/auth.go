package middleware

import (
	"net/http"
	"strings"

	"amg-flow-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware middleware для аутентификации (заглушка)
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем токен из заголовка Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// Для публичных endpoints пропускаем аутентификацию
			if isPublicEndpoint(c.Request.URL.Path) {
				c.Next()
				return
			}

			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
			})
			c.Abort()
			return
		}

		// Проверяем формат токена (Bearer <token>)
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		token := tokenParts[1]

		// Валидируем токен (заглушка)
		if !validateToken(token) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token",
			})
			c.Abort()
			return
		}

		// Извлекаем информацию о пользователе из токена
		userInfo, err := extractUserInfo(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Failed to extract user info",
			})
			c.Abort()
			return
		}

		// Сохраняем информацию о пользователе в контексте
		c.Set("user_id", userInfo["user_id"])
		c.Set("user_email", userInfo["email"])
		c.Set("user_roles", userInfo["roles"])

		c.Next()
	}
}

// isPublicEndpoint проверяет, является ли endpoint публичным
func isPublicEndpoint(path string) bool {
	publicPaths := []string{
		"/api/v1/health",
		"/api/v1/health/python",
		"/api/v1/health/db",
		"/api/v1/info",
		"/swagger/",
		"/docs",
		"/",
	}

	for _, publicPath := range publicPaths {
		if strings.HasPrefix(path, publicPath) {
			return true
		}
	}

	return false
}

// validateToken валидирует токен (заглушка)
func validateToken(token string) bool {
	// В реальной реализации здесь должна быть проверка JWT токена
	// или обращение к сервису аутентификации
	
	// Заглушка: принимаем любой непустой токен
	if token == "" {
		return false
	}

	// Для демонстрации принимаем токен "demo-token"
	if token == "demo-token" {
		return true
	}

	// В реальной реализации здесь должна быть проверка подписи токена
	return len(token) > 10
}

// extractUserInfo извлекает информацию о пользователе из токена (заглушка)
func extractUserInfo(token string) (map[string]interface{}, error) {
	// В реальной реализации здесь должен быть парсинг JWT токена
	
	// Заглушка
	userInfo := map[string]interface{}{
		"user_id": "demo-user-123",
		"email":   "demo@example.com",
		"roles":   []string{"user"},
	}

	return userInfo, nil
}

// RequireRole middleware для проверки ролей пользователя
func RequireRole(requiredRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRoles, exists := c.Get("user_roles")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "User roles not found",
			})
			c.Abort()
			return
		}

		roles, ok := userRoles.([]string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Invalid user roles format",
			})
			c.Abort()
			return
		}

		// Проверяем, есть ли у пользователя одна из требуемых ролей
		hasRole := false
		for _, requiredRole := range requiredRoles {
			for _, userRole := range roles {
				if userRole == requiredRole {
					hasRole = true
					break
				}
			}
			if hasRole {
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
				"message": "You don't have the required role to access this resource",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
