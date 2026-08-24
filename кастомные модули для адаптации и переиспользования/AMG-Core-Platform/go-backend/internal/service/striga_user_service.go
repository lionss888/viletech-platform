package service

import (
	"encoding/json"
	"fmt"

	"amg-flow-backend/pkg/logger"
)

// StrigaUserService предоставляет методы для работы с пользователями Striga
type StrigaUserService struct {
	client *StrigaClient
	logger logger.Logger
}

// NewStrigaUserService создает новый сервис для работы с пользователями
func NewStrigaUserService(client *StrigaClient, logger logger.Logger) *StrigaUserService {
	return &StrigaUserService{
		client: client,
		logger: logger,
	}
}

// CreateUser создает нового пользователя
func (s *StrigaUserService) CreateUser(req *CreateUserRequest) (*User, error) {
	s.logger.Infof("Creating user with email: %s", req.Email)

	resp, err := s.client.Post("/v1/users", req)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	user := &User{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user data: %w", err)
	}

	s.logger.Infof("User created successfully with ID: %s", user.ID)
	return user, nil
}

// GetUser получает пользователя по ID
func (s *StrigaUserService) GetUser(userID string) (*User, error) {
	s.logger.Infof("Getting user with ID: %s", userID)

	resp, err := s.client.Get(fmt.Sprintf("/v1/users/%s", userID))
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	user := &User{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user data: %w", err)
	}

	return user, nil
}

// UpdateUser обновляет данные пользователя
func (s *StrigaUserService) UpdateUser(userID string, req *UpdateUserRequest) (*User, error) {
	s.logger.Infof("Updating user with ID: %s", userID)

	resp, err := s.client.Put(fmt.Sprintf("/v1/users/%s", userID), req)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	user := &User{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user data: %w", err)
	}

	s.logger.Infof("User updated successfully with ID: %s", user.ID)
	return user, nil
}

// ListUsers получает список пользователей с пагинацией
func (s *StrigaUserService) ListUsers(page, limit int) (*UserListResponse, error) {
	s.logger.Infof("Listing users - page: %d, limit: %d", page, limit)

	path := fmt.Sprintf("/v1/users?page=%d&limit=%d", page, limit)
	resp, err := s.client.Get(path)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	userList := &UserListResponse{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), userList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user list data: %w", err)
	}

	return userList, nil
}

// DeleteUser удаляет пользователя
func (s *StrigaUserService) DeleteUser(userID string) error {
	s.logger.Infof("Deleting user with ID: %s", userID)

	_, err := s.client.Delete(fmt.Sprintf("/v1/users/%s", userID))
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	s.logger.Infof("User deleted successfully with ID: %s", userID)
	return nil
}

// GetUserByEmail получает пользователя по email
func (s *StrigaUserService) GetUserByEmail(email string) (*User, error) {
	s.logger.Infof("Getting user by email: %s", email)

	resp, err := s.client.Get(fmt.Sprintf("/v1/users/email/%s", email))
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	user := &User{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user data: %w", err)
	}

	return user, nil
}

// VerifyUser выполняет верификацию пользователя
func (s *StrigaUserService) VerifyUser(userID string) (*User, error) {
	s.logger.Infof("Verifying user with ID: %s", userID)

	resp, err := s.client.Post(fmt.Sprintf("/v1/users/%s/verify", userID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to verify user: %w", err)
	}

	user := &User{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user data: %w", err)
	}

	s.logger.Infof("User verified successfully with ID: %s", user.ID)
	return user, nil
}
