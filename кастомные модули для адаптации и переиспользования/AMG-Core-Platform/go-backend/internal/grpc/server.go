package grpc

import (
	"context"
	"fmt"
	"net"
	"time"

	"amg-flow-backend/pkg/config"
	"amg-flow-backend/pkg/logger"

	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/reflection"
)

// Server represents the gRPC server
type Server struct {
	config     *config.Config
	logger     logger.Logger
	grpcServer *grpc.Server
	userServer *UserServer
}

// NewServer creates a new gRPC server instance
func NewServer(cfg *config.Config, logger logger.Logger) *Server {
	// Create gRPC server with options
	grpcServer := grpc.NewServer(
		grpc.KeepaliveParams(keepalive.ServerParameters{
			Time:    10 * time.Second,
			Timeout: 5 * time.Second,
		}),
		grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
			MinTime:             5 * time.Second,
			PermitWithoutStream: true,
		}),
	)

	// Enable reflection for debugging
	reflection.Register(grpcServer)

	return &Server{
		config:     cfg,
		logger:     logger,
		grpcServer: grpcServer,
	}
}

// RegisterServices registers all gRPC services
func (s *Server) RegisterServices() error {
	// TODO: Initialize services and repositories
	// For now, we'll create a placeholder user service
	// userService := service.NewUserService(...)
	// s.userServer = user.NewUserServer(userService, s.logger)
	// s.userServer.RegisterServer(s.grpcServer)

	s.logger.Info("gRPC services registered successfully")
	return nil
}

// Start starts the gRPC server
func (s *Server) Start(port string) error {
	// Create listener
	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		return fmt.Errorf("failed to listen on port %s: %w", port, err)
	}

	s.logger.Infof("Starting gRPC server on port %s", port)

	// Start server in goroutine
	go func() {
		if err := s.grpcServer.Serve(lis); err != nil {
			s.logger.Errorf("Failed to serve gRPC: %v", err)
		}
	}()

	return nil
}

// Stop gracefully stops the gRPC server
func (s *Server) Stop() {
	s.logger.Info("Stopping gRPC server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	done := make(chan struct{})
	go func() {
		s.grpcServer.GracefulStop()
		close(done)
	}()

	select {
	case <-done:
		s.logger.Info("gRPC server stopped gracefully")
	case <-ctx.Done():
		s.logger.Warn("gRPC server shutdown timeout, forcing stop")
		s.grpcServer.Stop()
	}
}

// GetServer returns the underlying gRPC server
func (s *Server) GetServer() *grpc.Server {
	return s.grpcServer
}
