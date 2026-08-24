package http

import (
	"net/http"
	"time"

	"amg-flow-backend/internal/service"
	"amg-flow-backend/internal/transport/http/handlers"
	"amg-flow-backend/internal/transport/http/middleware"
	"amg-flow-backend/pkg/config"
	"amg-flow-backend/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/swaggo/files"
	"github.com/swaggo/gin-swagger"
)

// Server представляет HTTP сервер
type Server struct {
	config   *config.Config
	logger   logger.Logger
	router   *gin.Engine
	handlers *handlers.Handlers
}

// NewServer создает новый HTTP сервер
func NewServer(cfg *config.Config, logger logger.Logger) *Server {
	// Настраиваем режим Gin
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Создаем клиент для Python сервиса
	pythonClient := service.NewPythonAnalyticsClient(cfg.PythonAnalyticsURL, logger)

	// Создаем Striga сервис
	strigaService := service.NewStrigaService(cfg, logger)

	// Создаем хендлеры
	handlers := handlers.NewHandlers(pythonClient, strigaService, logger)

	server := &Server{
		config:   cfg,
		logger:   logger,
		router:   router,
		handlers: handlers,
	}

	server.setupMiddleware()
	server.setupRoutes()

	return server
}

// setupMiddleware настраивает middleware
func (s *Server) setupMiddleware() {
	// Логирование
	s.router.Use(middleware.Logger(s.logger))

	// Recovery
	s.router.Use(middleware.Recovery(s.logger))

	// CORS
	s.router.Use(middleware.CORSMiddleware())

	// Rate limiting
	s.router.Use(middleware.RateLimitMiddleware(100, 200)) // 100 RPS, burst 200

	// Аутентификация
	s.router.Use(middleware.AuthMiddleware())

	// Request ID
	s.router.Use(middleware.RequestID())
}

// setupRoutes настраивает маршруты
func (s *Server) setupRoutes() {
	// Swagger документация
	s.router.GET("/swagger/*any", ginSwagger.WrapHandler(files.Handler))

	// API v1
	v1 := s.router.Group("/api/v1")
	{
		// Health checks
		v1.GET("/health", s.handlers.HealthCheck)
		v1.GET("/health/python", s.handlers.PythonHealthCheck)
		v1.GET("/health/db", s.handlers.DatabaseHealthCheck)

		// Chat
		v1.POST("/chat", s.handlers.ProcessChat)
		v1.GET("/chat/history/:conversation_id", s.handlers.GetChatHistory)

		// Models
		v1.GET("/models", s.handlers.GetModels)
		v1.POST("/models", s.handlers.CreateModel)
		v1.PUT("/models/:id", s.handlers.UpdateModel)
		v1.DELETE("/models/:id", s.handlers.DeleteModel)

		// Analytics (прокси к Python сервису)
		v1.GET("/analytics/daily", s.handlers.GetDailyAnalytics)
		v1.GET("/analytics/user/:user_id", s.handlers.GetUserAnalytics)
		v1.GET("/analytics/conversation/:conversation_id", s.handlers.GetConversationAnalytics)

		// UI Schemas (Backend-Driven UI)
		v1.GET("/ui/components", s.handlers.GetUIComponents)
		v1.POST("/ui/components", s.handlers.CreateUIComponent)
		v1.PUT("/ui/components/:id", s.handlers.UpdateUIComponent)
		v1.DELETE("/ui/components/:id", s.handlers.DeleteUIComponent)
		v1.GET("/ui/forms", s.handlers.GetUIForms)
		v1.GET("/ui/tabs", s.handlers.GetUITabs)
		v1.GET("/ui/schema/:name", s.handlers.GetUISchema)
		v1.POST("/ui/validate", s.handlers.ValidateForm)
		v1.POST("/ui/generate", s.handlers.GenerateForm)

		// Workflows
		v1.GET("/workflows", s.handlers.GetWorkflows)
		v1.POST("/workflows", s.handlers.CreateWorkflow)
		v1.POST("/workflows/:id/run", s.handlers.RunWorkflow)

		// Striga API
		striga := v1.Group("/striga")
		{
			// Health check
			striga.GET("/health", s.handlers.GetStrigaHandlers().StrigaHealthCheck)

			// Users
			striga.POST("/users", s.handlers.GetStrigaHandlers().CreateUser)
			striga.GET("/users", s.handlers.GetStrigaHandlers().ListUsers)
			striga.GET("/users/:id", s.handlers.GetStrigaHandlers().GetUser)
			striga.PUT("/users/:id", s.handlers.GetStrigaHandlers().UpdateUser)

			// Wallets
			striga.POST("/wallets", s.handlers.GetStrigaHandlers().CreateWallet)
			striga.GET("/wallets/:id", s.handlers.GetStrigaHandlers().GetWallet)
			striga.GET("/users/:user_id/wallets", s.handlers.GetStrigaHandlers().ListWallets)

			// Cards
			striga.POST("/cards", s.handlers.GetStrigaHandlers().CreateCard)
			striga.GET("/cards/:id", s.handlers.GetStrigaHandlers().GetCard)
			striga.GET("/users/:user_id/cards", s.handlers.GetStrigaHandlers().ListCards)

			// Transactions
			striga.POST("/transactions", s.handlers.GetStrigaHandlers().CreateTransaction)
			striga.GET("/transactions/:id", s.handlers.GetStrigaHandlers().GetTransaction)
			striga.GET("/users/:user_id/transactions", s.handlers.GetStrigaHandlers().ListTransactions)

			// Webhooks
			striga.POST("/webhooks", s.handlers.GetStrigaHandlers().ProcessWebhook)
		}
	}
}

// Run запускает сервер
func (s *Server) Run(addr string) error {
	s.logger.Infof("Starting HTTP server on %s", addr)

	server := &http.Server{
		Addr:         addr,
		Handler:      s.router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return server.ListenAndServe()
}
