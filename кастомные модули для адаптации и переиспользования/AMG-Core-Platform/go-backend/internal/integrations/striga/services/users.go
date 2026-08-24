package services

import (
	"context"
	"fmt"

	"amg-flow-backend/internal/integrations/common"
	"amg-flow-backend/internal/integrations/striga"
)

// UserService - сервис для работы с пользователями Striga
type UserService struct {
	client *striga.Client
	logger common.Logger
}

// NewUserService создаёт новый сервис пользователей
func NewUserService(client *striga.Client, logger common.Logger) *UserService {
	return &UserService{
		client: client,
		logger: logger,
	}
}

// CreateUser создаёт нового пользователя
func (s *UserService) CreateUser(ctx context.Context, req striga.CreateUserRequest) (*striga.User, error) {
	s.logger.Info("Creating Striga user", map[string]interface{}{
		"email":   req.Email,
		"country": req.Country,
	})

	var response striga.UserResponse
	if err := s.client.Post(ctx, "/v1/users", req, &response); err != nil {
		s.logger.Error("Failed to create Striga user", map[string]interface{}{
			"email": req.Email,
			"error": err.Error(),
		})
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	s.logger.Info("Striga user created successfully", map[string]interface{}{
		"user_id": response.User.ID,
		"email":   response.User.Email,
	})

	return response.User, nil
}

// GetUser получает пользователя по ID
func (s *UserService) GetUser(ctx context.Context, userID string) (*striga.User, error) {
	if userID == "" {
		return nil, fmt.Errorf("user ID is required")
	}

	s.logger.Debug("Getting Striga user", map[string]interface{}{
		"user_id": userID,
	})

	var response striga.UserResponse
	endpoint := fmt.Sprintf("/v1/users/%s", userID)
	if err := s.client.Get(ctx, endpoint, &response); err != nil {
		s.logger.Error("Failed to get Striga user", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return response.User, nil
}

// UpdateUser обновляет данные пользователя
func (s *UserService) UpdateUser(ctx context.Context, userID string, req striga.UpdateUserRequest) (*striga.User, error) {
	if userID == "" {
		return nil, fmt.Errorf("user ID is required")
	}

	s.logger.Info("Updating Striga user", map[string]interface{}{
		"user_id": userID,
	})

	var response striga.UserResponse
	endpoint := fmt.Sprintf("/v1/users/%s", userID)
	if err := s.client.Put(ctx, endpoint, req, &response); err != nil {
		s.logger.Error("Failed to update Striga user", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	s.logger.Info("Striga user updated successfully", map[string]interface{}{
		"user_id": response.User.ID,
	})

	return response.User, nil
}

// GetUsers получает список пользователей
func (s *UserService) GetUsers(ctx context.Context, limit, offset int) ([]striga.User, int, error) {
	s.logger.Debug("Getting Striga users list", map[string]interface{}{
		"limit":  limit,
		"offset": offset,
	})

	endpoint := fmt.Sprintf("/v1/users?limit=%d&offset=%d", limit, offset)
	var response striga.UsersResponse
	if err := s.client.Get(ctx, endpoint, &response); err != nil {
		s.logger.Error("Failed to get Striga users", map[string]interface{}{
			"error": err.Error(),
		})
		return nil, 0, fmt.Errorf("failed to get users: %w", err)
	}

	return response.Users, response.Total, nil
}

// SuspendUser приостанавливает пользователя
func (s *UserService) SuspendUser(ctx context.Context, userID string, reason string) error {
	if userID == "" {
		return fmt.Errorf("user ID is required")
	}

	s.logger.Info("Suspending Striga user", map[string]interface{}{
		"user_id": userID,
		"reason":  reason,
	})

	updateReq := striga.UpdateUserRequest{
		Metadata: map[string]interface{}{
			"suspension_reason": reason,
		},
	}

	endpoint := fmt.Sprintf("/v1/users/%s/suspend", userID)
	if err := s.client.Post(ctx, endpoint, updateReq, nil); err != nil {
		s.logger.Error("Failed to suspend Striga user", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		return fmt.Errorf("failed to suspend user: %w", err)
	}

	s.logger.Info("Striga user suspended successfully", map[string]interface{}{
		"user_id": userID,
	})

	return nil
}

// ReactivateUser реактивирует пользователя
func (s *UserService) ReactivateUser(ctx context.Context, userID string) error {
	if userID == "" {
		return fmt.Errorf("user ID is required")
	}

	s.logger.Info("Reactivating Striga user", map[string]interface{}{
		"user_id": userID,
	})

	endpoint := fmt.Sprintf("/v1/users/%s/reactivate", userID)
	if err := s.client.Post(ctx, endpoint, nil, nil); err != nil {
		s.logger.Error("Failed to reactivate Striga user", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		return fmt.Errorf("failed to reactivate user: %w", err)
	}

	s.logger.Info("Striga user reactivated successfully", map[string]interface{}{
		"user_id": userID,
	})

	return nil
}

// DeleteUser удаляет пользователя (обычно только в sandbox)
func (s *UserService) DeleteUser(ctx context.Context, userID string) error {
	if userID == "" {
		return fmt.Errorf("user ID is required")
	}

	s.logger.Warn("Deleting Striga user", map[string]interface{}{
		"user_id": userID,
	})

	endpoint := fmt.Sprintf("/v1/users/%s", userID)
	if err := s.client.Delete(ctx, endpoint, nil); err != nil {
		s.logger.Error("Failed to delete Striga user", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		return fmt.Errorf("failed to delete user: %w", err)
	}

	s.logger.Info("Striga user deleted successfully", map[string]interface{}{
		"user_id": userID,
	})

	return nil
}
