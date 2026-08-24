package saga

import (
	"context"
	"fmt"

	"amg-flow-backend/pkg/logger"
)

// UserRegistrationSaga handles the complete user registration process
type UserRegistrationSaga struct {
	orchestrator *Orchestrator
	logger       logger.Logger
}

// UserRegistrationData represents the data for user registration saga
type UserRegistrationData struct {
	UserID      string `json:"user_id"`
	Email       string `json:"email"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Phone       string `json:"phone"`
	Password    string `json:"password"`
	Currency    string `json:"currency"`
	BankName    string `json:"bank_name"`
	AccountType string `json:"account_type"`
}

// NewUserRegistrationSaga creates a new user registration saga
func NewUserRegistrationSaga(orchestrator *Orchestrator, logger logger.Logger) *UserRegistrationSaga {
	return &UserRegistrationSaga{
		orchestrator: orchestrator,
		logger:       logger,
	}
}

// StartUserRegistration starts the user registration saga
func (s *UserRegistrationSaga) StartUserRegistration(ctx context.Context, data UserRegistrationData) (*Saga, error) {
	s.logger.Infof("Starting user registration saga for email: %s", data.Email)

	// Start saga
	saga, err := s.orchestrator.StartSaga(ctx, "user_registration", data.Email, data)
	if err != nil {
		s.logger.Errorf("Failed to start user registration saga: %v", err)
		return nil, fmt.Errorf("failed to start user registration saga: %w", err)
	}

	// Execute steps
	steps := []struct {
		name string
		data interface{}
	}{
		{"create_user", data},
		{"create_wallet", data},
		{"create_bank_account", data},
		{"set_limits", data},
		{"send_welcome_email", data},
	}

	for _, step := range steps {
		if err := s.orchestrator.ExecuteStep(ctx, saga.ID, step.name, step.data); err != nil {
			s.logger.Errorf("Failed to execute step %s: %v", step.name, err)

			// Compensate saga on failure
			if compErr := s.orchestrator.CompensateSaga(ctx, saga.ID); compErr != nil {
				s.logger.Errorf("Failed to compensate saga: %v", compErr)
			}

			return nil, fmt.Errorf("failed to execute step %s: %w", step.name, err)
		}
	}

	s.logger.Infof("User registration saga completed successfully: %s", saga.ID)
	return saga, nil
}

// CreateUserStep handles user creation
func (s *UserRegistrationSaga) CreateUserStep(ctx context.Context, data UserRegistrationData) error {
	s.logger.Infof("Creating user: %s", data.Email)

	// TODO: Call UserService to create user
	// This would typically call the gRPC UserService

	s.logger.Infof("User created successfully: %s", data.Email)
	return nil
}

// CreateWalletStep handles wallet creation
func (s *UserRegistrationSaga) CreateWalletStep(ctx context.Context, data UserRegistrationData) error {
	s.logger.Infof("Creating wallet for user: %s", data.UserID)

	// TODO: Call PaymentService to create wallet
	// This would typically call the gRPC PaymentService

	s.logger.Infof("Wallet created successfully for user: %s", data.UserID)
	return nil
}

// CreateBankAccountStep handles bank account creation
func (s *UserRegistrationSaga) CreateBankAccountStep(ctx context.Context, data UserRegistrationData) error {
	s.logger.Infof("Creating bank account for user: %s", data.UserID)

	// TODO: Call BankingService to create bank account
	// This would typically call the gRPC BankingService

	s.logger.Infof("Bank account created successfully for user: %s", data.UserID)
	return nil
}

// SetLimitsStep handles setting user limits
func (s *UserRegistrationSaga) SetLimitsStep(ctx context.Context, data UserRegistrationData) error {
	s.logger.Infof("Setting limits for user: %s", data.UserID)

	// TODO: Call BankingService to set limits
	// This would typically call the gRPC BankingService

	s.logger.Infof("Limits set successfully for user: %s", data.UserID)
	return nil
}

// SendWelcomeEmailStep handles sending welcome email
func (s *UserRegistrationSaga) SendWelcomeEmailStep(ctx context.Context, data UserRegistrationData) error {
	s.logger.Infof("Sending welcome email to: %s", data.Email)

	// TODO: Call NotificationService to send email
	// This would typically call the gRPC NotificationService

	s.logger.Infof("Welcome email sent successfully to: %s", data.Email)
	return nil
}

// CompensateUserCreation compensates user creation
func (s *UserRegistrationSaga) CompensateUserCreation(ctx context.Context, data UserRegistrationData) error {
	s.logger.Infof("Compensating user creation: %s", data.UserID)

	// TODO: Delete user from UserService
	// This would typically call the gRPC UserService to delete user

	s.logger.Infof("User creation compensated successfully: %s", data.UserID)
	return nil
}

// CompensateWalletCreation compensates wallet creation
func (s *UserRegistrationSaga) CompensateWalletCreation(ctx context.Context, data UserRegistrationData) error {
	s.logger.Infof("Compensating wallet creation: %s", data.UserID)

	// TODO: Delete wallet from PaymentService
	// This would typically call the gRPC PaymentService to delete wallet

	s.logger.Infof("Wallet creation compensated successfully: %s", data.UserID)
	return nil
}

// CompensateBankAccountCreation compensates bank account creation
func (s *UserRegistrationSaga) CompensateBankAccountCreation(ctx context.Context, data UserRegistrationData) error {
	s.logger.Infof("Compensating bank account creation: %s", data.UserID)

	// TODO: Delete bank account from BankingService
	// This would typically call the gRPC BankingService to delete account

	s.logger.Infof("Bank account creation compensated successfully: %s", data.UserID)
	return nil
}
