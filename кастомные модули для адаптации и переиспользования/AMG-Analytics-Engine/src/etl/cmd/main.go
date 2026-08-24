package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"amg-etl/internal/config"
	"amg-etl/internal/processor"
)

func main() {
	log.Println("🚀 Запуск AMG ETL утилиты...")

	// Загрузка конфигурации
	cfg := config.Load()

	// Создание PostgreSQL ETL процессора
	etl := processor.NewPostgresETLProcessor(cfg)

	// Инициализация
	if err := etl.Initialize(); err != nil {
		log.Fatalf("❌ Ошибка инициализации: %v", err)
	}
	defer etl.Close()

	// Запуск ETL процесса
	if err := etl.Run(); err != nil {
		log.Fatalf("❌ Ошибка выполнения ETL: %v", err)
	}

	log.Println("✅ ETL процесс завершен успешно")

	// Ожидание сигнала для graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("🛑 Получен сигнал завершения, закрытие соединений...")
}
