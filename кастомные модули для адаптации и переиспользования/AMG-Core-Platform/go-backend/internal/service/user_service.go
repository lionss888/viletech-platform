package service

import (
	"context"
	"errors"

	dataaccess "amg-flow-backend/internal/data-access"
	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/logger"
)

// UserService handles user-related business logic
type UserService struct {
	userRepo dataaccess.UserRepository
	logger   logger.Logger
}

// NewUserService creates a new UserService instance
func NewUserService(userRepo dataaccess.UserRepository, logger logger.Logger) *UserService {
	return &UserService{
		userRepo: userRepo,
		logger:   logger,
	}
}

// CreateUser creates a new user
func (s *UserService) CreateUser(ctx context.Context, user *domain.User, password string) (*domain.User, error) {
	// TODO: Hash password
	// TODO: Validate email format
	// TODO: Check if user already exists

	user.Status = domain.UserStatusPendingVerification

	createdUser, err := s.userRepo.Create(ctx, user)
	if err != nil {
		s.logger.Errorf("Failed to create user: %v", err)
		return nil, err
	}

	s.logger.Infof("User created successfully: %s", createdUser.ID)
	return createdUser, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(ctx context.Context, userID string) (*domain.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		s.logger.Errorf("Failed to get user by ID %s: %v", userID, err)
		return nil, err
	}

	return user, nil
}

// UpdateUser updates an existing user
func (s *UserService) UpdateUser(ctx context.Context, user *domain.User) (*domain.User, error) {
	updatedUser, err := s.userRepo.Update(ctx, user)
	if err != nil {
		s.logger.Errorf("Failed to update user %s: %v", user.ID, err)
		return nil, err
	}

	s.logger.Infof("User updated successfully: %s", updatedUser.ID)
	return updatedUser, nil
}

// DeleteUser deletes a user
func (s *UserService) DeleteUser(ctx context.Context, userID string) error {
	err := s.userRepo.Delete(ctx, userID)
	if err != nil {
		s.logger.Errorf("Failed to delete user %s: %v", userID, err)
		return err
	}

	s.logger.Infof("User deleted successfully: %s", userID)
	return nil
}

// ListUsers retrieves a list of users with pagination
func (s *UserService) ListUsers(ctx context.Context, page, pageSize int, search string, status domain.UserStatus) ([]*domain.User, int, error) {
	users, total, err := s.userRepo.List(ctx, page, pageSize, search, status)
	if err != nil {
		s.logger.Errorf("Failed to list users: %v", err)
		return nil, 0, err
	}

	return users, total, nil
}

// AuthenticateUser authenticates a user
func (s *UserService) AuthenticateUser(ctx context.Context, email, password string) (*domain.User, string, error) {
	// TODO: Implement authentication logic
	// TODO: Generate JWT token

	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		s.logger.Errorf("Failed to authenticate user %s: %v", email, err)
		return nil, "", errors.New("invalid credentials")
	}

	// TODO: Verify password hash
	// TODO: Generate JWT token

	token := "dummy-token" // TODO: Generate real JWT token

	s.logger.Infof("User authenticated successfully: %s", user.ID)
	return user, token, nil
}
