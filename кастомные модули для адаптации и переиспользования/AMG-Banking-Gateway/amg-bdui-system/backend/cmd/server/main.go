package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"amg-bdui-backend/internal/transport/http/handlers"
	"amg-bdui-backend/internal/transport/http/middleware"
	"amg-bdui-backend/internal/ui/schemas"
	"amg-bdui-backend/internal/service"
	"amg-bdui-backend/internal/repository"
	"amg-bdui-backend/configs"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	// Загрузка конфигурации
	cfg := configs.Load()

	// Инициализация базы данных
	db, err := initDatabase(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Инициализация Redis
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisURL,
	})
	defer rdb.Close()

	// Инициализация репозиториев
	userRepo := repository.NewUserRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	permissionRepo := repository.NewPermissionRepository(db)
	uiSchemaRepo := repository.NewUISchemaRepository(db)

	// Инициализация сервисов
	authService := service.NewAuthService(userRepo, roleRepo, cfg.JWTSecret)
	permissionService := service.NewPermissionService(permissionRepo, roleRepo)
	uiSchemaService := service.NewUISchemaService(uiSchemaRepo, permissionService, rdb)

	// Инициализация UI схем
	schemaManager := schemas.NewSchemaManager()
	schemaManager.LoadDefaultSchemas()

	// Инициализация HTTP сервера
	router := gin.Default()

	// Middleware
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())
	router.Use(middleware.Recovery())
	router.Use(middleware.Metrics())

	// Health check endpoints
	router.GET("/health", handlers.HealthCheck(uiSchemaService))
	router.GET("/health/ui", handlers.UIHealthCheck(uiSchemaService))
	router.GET("/health/database", handlers.DatabaseHealthCheck(db))
	router.GET("/health/cache", handlers.CacheHealthCheck(rdb))

	// Metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API routes
	api := router.Group("/api")
	{
		// UI Schema API
		ui := api.Group("/ui")
		{
			ui.GET("/schema/:role/:page", handlers.GetUISchema(uiSchemaService, schemaManager))
			ui.POST("/validate", handlers.ValidateUISchema())
			ui.GET("/status", handlers.GetUIStatus(uiSchemaService))
			ui.GET("/roles", handlers.GetAvailableRoles(roleRepo))
		}

		// Auth API
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login(authService))
			auth.POST("/refresh", handlers.RefreshToken(authService))
			auth.POST("/logout", handlers.Logout(authService))
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.AuthRequired(authService))
		{
			protected.GET("/profile", handlers.GetProfile(authService))
			protected.PUT("/profile", handlers.UpdateProfile(authService))
		}
	}

	// Запуск сервера
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Graceful shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Printf("Server started on port %s", cfg.Port)

	// Ожидание сигнала завершения
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown с таймаутом
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}

func initDatabase(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	// Проверка подключения
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Настройка пула соединений
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	return db, nil
}
