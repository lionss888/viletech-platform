package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiter представляет rate limiter для API Gateway
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

// NewRateLimiter создает новый rate limiter
func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     r,
		burst:    b,
	}
}

// GetLimiter получает limiter для IP адреса
func (rl *RateLimiter) GetLimiter(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter, exists := rl.limiters[ip]
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.limiters[ip] = limiter
	}

	return limiter
}

// Cleanup удаляет старые limiters (вызывать периодически)
func (rl *RateLimiter) Cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Удаляем limiters старше 1 часа
	for ip, limiter := range rl.limiters {
		if time.Since(limiter.TokensAt(time.Now())) > time.Hour {
			delete(rl.limiters, ip)
		}
	}
}

// RateLimitMiddleware middleware для ограничения скорости запросов
func RateLimitMiddleware(rps int, burst int) gin.HandlerFunc {
	limiter := NewRateLimiter(rate.Limit(rps), burst)

	// Запускаем cleanup каждые 10 минут
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			limiter.Cleanup()
		}
	}()

	return func(c *gin.Context) {
		// Получаем IP адрес клиента
		ip := c.ClientIP()
		if ip == "" {
			ip = "unknown"
		}

		// Получаем limiter для IP
		lim := limiter.GetLimiter(ip)

		// Проверяем лимит
		if !lim.Allow() {
			c.Header("X-RateLimit-Limit", string(rune(rps)))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", time.Now().Add(time.Second).Format(time.RFC3339))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"message": "Too many requests. Please try again later.",
			})
			c.Abort()
			return
		}

		// Добавляем заголовки с информацией о лимитах
		c.Header("X-RateLimit-Limit", string(rune(rps)))
		c.Header("X-RateLimit-Remaining", string(rune(lim.Burst())))
		c.Header("X-RateLimit-Reset", time.Now().Add(time.Second).Format(time.RFC3339))

		c.Next()
	}
}
