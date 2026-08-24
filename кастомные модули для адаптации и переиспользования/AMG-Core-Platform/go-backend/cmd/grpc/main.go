package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"amg-flow-backend/internal/grpc"
	"amg-flow-backend/pkg/config"
	"amg-flow-backend/pkg/logger"
)

// @title AMG Flow gRPC API
// @version 1.0
// @description gRPC API для автоматизации бизнес-процессов с AI
// @host localhost:9090
func main() {
	// Загружаем конфигурацию
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Инициализируем логгер
	logger := logger.New(cfg.LogLevel)

	// Создаем gRPC сервер
	grpcServer := grpc.NewServer(cfg, logger)

	// Регистрируем сервисы
	if err := grpcServer.RegisterServices(); err != nil {
		logger.Fatalf("Failed to register services: %v", err)
	}

	// Получаем порт из переменной окружения
	port := os.Getenv("GRPC_PORT")
	if port == "" {
		port = "9090"
	}

	// Запускаем gRPC сервер
	if err := grpcServer.Start(port); err != nil {
		logger.Fatalf("Failed to start gRPC server: %v", err)
	}

	logger.Infof("gRPC server started on port %s", port)

	// Ожидаем сигнал для graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down gRPC server...")
	grpcServer.Stop()
	logger.Info("gRPC server stopped")
}
