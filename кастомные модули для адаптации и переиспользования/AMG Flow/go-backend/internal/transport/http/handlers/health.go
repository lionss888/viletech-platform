package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// HealthResponse представляет ответ health check
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
}

// PythonHealthResponse представляет ответ проверки Python сервиса
type PythonHealthResponse struct {
	OK        bool   `json:"ok"`
	Host      string `json:"host"`
	LatencyMs int    `json:"latency_ms,omitempty"`
	Error     string `json:"error,omitempty"`
}

// DatabaseHealthResponse представляет ответ проверки базы данных
type DatabaseHealthResponse struct {
	OK        bool   `json:"ok"`
	LatencyMs int    `json:"latency_ms,omitempty"`
	Error     string `json:"error,omitempty"`
}

// HealthCheck проверяет состояние сервиса
func (h *Handlers) HealthCheck(c *gin.Context) {
	response := HealthResponse{
		Status:    "ok",
		Timestamp: time.Now(),
		Version:   "1.0.0",
	}
	
	c.JSON(http.StatusOK, response)
}

// PythonHealthCheck проверяет состояние Python сервиса
func (h *Handlers) PythonHealthCheck(c *gin.Context) {
	start := time.Now()
	
	// Здесь должна быть проверка Python сервиса
	// Пока возвращаем заглушку
	response := PythonHealthResponse{
		OK:        true,
		Host:      "http://localhost:8000",
		LatencyMs: int(time.Since(start).Milliseconds()),
	}
	
	c.JSON(http.StatusOK, response)
}

// DatabaseHealthCheck проверяет состояние базы данных
func (h *Handlers) DatabaseHealthCheck(c *gin.Context) {
	start := time.Now()
	
	// Здесь должна быть проверка базы данных
	// Пока возвращаем заглушку
	response := DatabaseHealthResponse{
		OK:        true,
		LatencyMs: int(time.Since(start).Milliseconds()),
	}
	
	c.JSON(http.StatusOK, response)
}
