package grpc

import (
	"context"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/logger"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// UserServer implements the UserService gRPC service
type UserServer struct {
	userService *service.UserService
	logger      logger.Logger
}

// NewUserServer creates a new UserServer instance
func NewUserServer(userService *service.UserService, logger logger.Logger) *UserServer {
	return &UserServer{
		userService: userService,
		logger:      logger,
	}
}

// RegisterUserService registers the UserService with the gRPC server
func (s *UserServer) RegisterUserService(grpcServer *grpc.Server) {
	// TODO: Register with generated proto service
	// pb.RegisterUserServiceServer(grpcServer, s)
}

// CreateUser creates a new user
func (s *UserServer) CreateUser(ctx context.Context, email, firstName, lastName, phone, password string) (*domain.User, error) {
	s.logger.Infof("Creating user with email: %s", email)

	// Convert request to domain model
	user := &domain.User{
		Email:     email,
		FirstName: firstName,
		LastName:  lastName,
		Phone:     phone,
		Status:    domain.UserStatusPendingVerification,
	}

	// Create user through service
	createdUser, err := s.userService.CreateUser(ctx, user, password)
	if err != nil {
		s.logger.Errorf("Failed to create user: %v", err)
		return nil, status.Error(codes.Internal, err.Error())
	}

	return createdUser, nil
}

// GetUser retrieves a user by ID
func (s *UserServer) GetUser(ctx context.Context, userID string) (*domain.User, error) {
	s.logger.Infof("Getting user with ID: %s", userID)

	user, err := s.userService.GetUserByID(ctx, userID)
	if err != nil {
		s.logger.Errorf("Failed to get user: %v", err)
		return nil, status.Error(codes.NotFound, err.Error())
	}

	return user, nil
}

// UpdateUser updates an existing user
func (s *UserServer) UpdateUser(ctx context.Context, user *domain.User) (*domain.User, error) {
	s.logger.Infof("Updating user with ID: %s", user.ID)

	updatedUser, err := s.userService.UpdateUser(ctx, user)
	if err != nil {
		s.logger.Errorf("Failed to update user: %v", err)
		return nil, status.Error(codes.Internal, err.Error())
	}

	return updatedUser, nil
}

// DeleteUser deletes a user
func (s *UserServer) DeleteUser(ctx context.Context, userID string) error {
	s.logger.Infof("Deleting user with ID: %s", userID)

	err := s.userService.DeleteUser(ctx, userID)
	if err != nil {
		s.logger.Errorf("Failed to delete user: %v", err)
		return status.Error(codes.Internal, err.Error())
	}

	return nil
}

// ListUsers retrieves a list of users with pagination
func (s *UserServer) ListUsers(ctx context.Context, page, pageSize int, search string, userStatus domain.UserStatus) ([]*domain.User, int, error) {
	s.logger.Infof("Listing users with page: %d, page_size: %d", page, pageSize)

	users, total, err := s.userService.ListUsers(ctx, page, pageSize, search, userStatus)
	if err != nil {
		s.logger.Errorf("Failed to list users: %v", err)
		return nil, 0, status.Error(codes.Internal, err.Error())
	}

	return users, total, nil
}

// AuthenticateUser authenticates a user
func (s *UserServer) AuthenticateUser(ctx context.Context, email, password string) (*domain.User, string, error) {
	s.logger.Infof("Authenticating user with email: %s", email)

	user, token, err := s.userService.AuthenticateUser(ctx, email, password)
	if err != nil {
		s.logger.Errorf("Failed to authenticate user: %v", err)
		return nil, "", status.Error(codes.Unauthenticated, err.Error())
	}

	return user, token, nil
}
