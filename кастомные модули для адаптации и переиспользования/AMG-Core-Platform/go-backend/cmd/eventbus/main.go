package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"amg-flow-backend/internal/eventbus"
	"amg-flow-backend/pkg/logger"
)

func main() {
	// Initialize logger
	logger := logger.New("info")

	// Create event bus configuration
	config := &eventbus.EventBusConfig{
		BrokerURL:     getEnv("KAFKA_BROKERS", "localhost:9092"),
		BrokerType:    "kafka",
		TopicPrefix:   getEnv("KAFKA_TOPIC_PREFIX", "amg"),
		ConsumerGroup: getEnv("KAFKA_CONSUMER_GROUP", "amg-core"),
		MaxRetries:    3,
		RetryDelay:    1000,
		BatchSize:     100,
		FlushInterval: 1000,
		EnableTracing: true,
		EnableMetrics: true,
	}

	// Create Kafka event bus
	eventBus := eventbus.NewKafkaEventBus(config, logger)

	// Create event handlers
	userHandler := eventbus.NewUserEventHandler(logger)
	paymentHandler := eventbus.NewPaymentEventHandler(logger)
	bankingHandler := eventbus.NewBankingEventHandler(logger)

	// Create projections
	userProjection := eventbus.NewUserProjection(logger)
	paymentProjection := eventbus.NewPaymentProjection(logger)
	bankingProjection := eventbus.NewBankingProjection(logger)

	// Create event bus service
	eventBusService := eventbus.NewEventBusService(eventBus, nil, logger)

	// Register projections
	eventBusService.RegisterProjection(userProjection)
	eventBusService.RegisterProjection(paymentProjection)
	eventBusService.RegisterProjection(bankingProjection)

	// Subscribe to topics
	ctx := context.Background()
	if err := eventBusService.SubscribeToTopic(ctx, "user.events", userHandler); err != nil {
		logger.Fatalf("Failed to subscribe to user events: %v", err)
	}

	if err := eventBusService.SubscribeToTopic(ctx, "payment.events", paymentHandler); err != nil {
		logger.Fatalf("Failed to subscribe to payment events: %v", err)
	}

	if err := eventBusService.SubscribeToTopic(ctx, "banking.events", bankingHandler); err != nil {
		logger.Fatalf("Failed to subscribe to banking events: %v", err)
	}

	logger.Info("Event Bus service started successfully")

	// Create sample events
	go func() {
		time.Sleep(5 * time.Second)
		createSampleEvents(eventBusService, logger)
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down Event Bus service...")

	// Close event bus service
	if err := eventBusService.Close(); err != nil {
		logger.Errorf("Failed to close event bus service: %v", err)
	}

	logger.Info("Event Bus service stopped")
}

func createSampleEvents(eventBusService *eventbus.EventBusService, logger logger.Logger) {
	ctx := context.Background()

	// Create user events
	userCreatedEvent := eventBusService.CreateEvent(
		"UserCreated",
		"user-001",
		"User",
		"user-service",
		map[string]interface{}{
			"email":      "john@example.com",
			"first_name": "John",
			"last_name":  "Doe",
		},
	)

	userUpdatedEvent := eventBusService.CreateEventWithCorrelation(
		"UserUpdated",
		"user-001",
		"User",
		"user-service",
		userCreatedEvent.CorrelationID,
		userCreatedEvent.ID.String(),
		map[string]interface{}{
			"email":      "john.doe@example.com",
			"first_name": "John",
			"last_name":  "Doe",
		},
	)

	// Create payment events
	paymentInitiatedEvent := eventBusService.CreateEvent(
		"PaymentInitiated",
		"payment-001",
		"Payment",
		"payment-service",
		map[string]interface{}{
			"amount":   100.00,
			"currency": "USD",
			"user_id":  "user-001",
		},
	)

	paymentProcessedEvent := eventBusService.CreateEventWithCorrelation(
		"PaymentProcessed",
		"payment-001",
		"Payment",
		"payment-service",
		paymentInitiatedEvent.CorrelationID,
		paymentInitiatedEvent.ID.String(),
		map[string]interface{}{
			"amount":   100.00,
			"currency": "USD",
			"user_id":  "user-001",
			"status":   "completed",
		},
	)

	// Create banking events
	accountCreatedEvent := eventBusService.CreateEvent(
		"AccountCreated",
		"account-001",
		"Account",
		"banking-service",
		map[string]interface{}{
			"user_id":      "user-001",
			"account_type": "checking",
			"balance":      0.00,
		},
	)

	// Publish events
	events := []*eventbus.Event{
		userCreatedEvent,
		userUpdatedEvent,
		paymentInitiatedEvent,
		paymentProcessedEvent,
		accountCreatedEvent,
	}

	if err := eventBusService.PublishEvents(ctx, events); err != nil {
		logger.Errorf("Failed to publish sample events: %v", err)
	} else {
		logger.Info("Sample events published successfully")
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
