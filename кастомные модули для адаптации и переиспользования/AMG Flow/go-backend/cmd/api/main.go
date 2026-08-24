package main

import (
	"log"
	"os"

	"amg-flow-backend/internal/transport/http"
	"amg-flow-backend/pkg/config"
	"amg-flow-backend/pkg/logger"
)

// @title AMG Flow API
// @version 1.0
// @description API для автоматизации бизнес-процессов с AI
// @host localhost:8080
// @BasePath /api/v1
func main() {
	// Загружаем конфигурацию
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Инициализируем логгер
	logger := logger.New(cfg.LogLevel)

	// Создаем HTTP сервер
	server := http.NewServer(cfg, logger)

	// Запускаем сервер
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.Infof("Starting server on port %s", port)
	if err := server.Run(":" + port); err != nil {
		logger.Fatalf("Failed to start server: %v", err)
	}
}
