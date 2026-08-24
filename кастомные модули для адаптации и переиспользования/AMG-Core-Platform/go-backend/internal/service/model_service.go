package service

import (
	"context"
	"fmt"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"
	"amg-flow-backend/pkg/logger"
)

// ModelService сервис для работы с моделями
type ModelService struct {
	modelRepo    domain.ModelRepository
	pythonClient *PythonAnalyticsClient
	logger       logger.Logger
}

// NewModelService создает новый сервис моделей
func NewModelService(pythonClient *PythonAnalyticsClient, logger logger.Logger) *ModelService {
	return &ModelService{
		pythonClient: pythonClient,
		logger:       logger,
	}
}

// ModelInfo представляет информацию о модели
type ModelInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
	Size        int64  `json:"size,omitempty"`
	ModifiedAt  string `json:"modified_at,omitempty"`
}

// CreateModelRequest представляет запрос на создание модели
type CreateModelRequest struct {
	Name        string `json:"name" binding:"required"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	Size        int64  `json:"size"`
}

// UpdateModelRequest представляет запрос на обновление модели
type UpdateModelRequest struct {
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

// GetAvailableModels получает список доступных моделей из Python сервиса
func (s *ModelService) GetAvailableModels(ctx context.Context) ([]ModelInfo, error) {
	// Получаем модели из Python сервиса через Ollama API
	pythonModels, err := s.pythonClient.GetModels(ctx)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodePythonService, "Failed to get models from Python service")
	}

	// Конвертируем в наш формат
	var models []ModelInfo
	for _, pythonModel := range pythonModels {
		model := ModelInfo{
			ID:          pythonModel.Name,
			Name:        pythonModel.Name,
			DisplayName: s.generateDisplayName(pythonModel.Name),
			Description: s.generateDescription(pythonModel.Name),
			IsActive:    true,
			Size:        pythonModel.Size,
			ModifiedAt:  pythonModel.ModifiedAt,
		}
		models = append(models, model)
	}

	return models, nil
}

// CreateModel создает новую модель
func (s *ModelService) CreateModel(ctx context.Context, req *CreateModelRequest) (*ModelInfo, error) {
	// Валидация
	if req.Name == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Model name is required")
	}

	// Создаем модель в базе данных (если есть репозиторий)
	if s.modelRepo != nil {
		model := &domain.Model{
			Name:        req.Name,
			DisplayName: req.DisplayName,
			Description: req.Description,
			Size:        req.Size,
			IsActive:    true,
		}

		if err := s.modelRepo.Create(ctx, model); err != nil {
			return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create model")
		}

		return &ModelInfo{
			ID:          model.ID.String(),
			Name:        model.Name,
			DisplayName: model.DisplayName,
			Description: model.Description,
			IsActive:    model.IsActive,
			Size:        model.Size,
		}, nil
	}

	// Заглушка для случая без репозитория
	return &ModelInfo{
		ID:          req.Name,
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		IsActive:    true,
		Size:        req.Size,
	}, nil
}

// UpdateModel обновляет модель
func (s *ModelService) UpdateModel(ctx context.Context, modelID string, req *UpdateModelRequest) (*ModelInfo, error) {
	// Валидация
	if modelID == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Model ID is required")
	}

	// Обновляем модель в базе данных (если есть репозиторий)
	if s.modelRepo != nil {
		model, err := s.modelRepo.GetByID(ctx, modelID)
		if err != nil {
			return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get model")
		}

		if req.DisplayName != "" {
			model.DisplayName = req.DisplayName
		}
		if req.Description != "" {
			model.Description = req.Description
		}
		if req.IsActive != nil {
			model.IsActive = *req.IsActive
		}

		if err := s.modelRepo.Update(ctx, model); err != nil {
			return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to update model")
		}

		return &ModelInfo{
			ID:          model.ID.String(),
			Name:        model.Name,
			DisplayName: model.DisplayName,
			Description: model.Description,
			IsActive:    model.IsActive,
			Size:        model.Size,
		}, nil
	}

	// Заглушка для случая без репозитория
	return &ModelInfo{
		ID:          modelID,
		Name:        modelID,
		DisplayName: req.DisplayName,
		Description: req.Description,
		IsActive:    true,
	}, nil
}

// DeleteModel удаляет модель
func (s *ModelService) DeleteModel(ctx context.Context, modelID string) error {
	// Валидация
	if modelID == "" {
		return errors.New(errors.ErrCodeValidation, "Model ID is required")
	}

	// Удаляем модель из базы данных (если есть репозиторий)
	if s.modelRepo != nil {
		if err := s.modelRepo.Delete(ctx, modelID); err != nil {
			return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to delete model")
		}
	}

	return nil
}

// generateDisplayName генерирует отображаемое имя модели
func (s *ModelService) generateDisplayName(name string) string {
	// Простая логика для генерации отображаемого имени
	switch {
	case contains(name, "llama3.2"):
		return "Llama 3.2"
	case contains(name, "llama3.1"):
		return "Llama 3.1"
	case contains(name, "llama3"):
		return "Llama 3"
	case contains(name, "codellama"):
		return "Code Llama"
	case contains(name, "mistral"):
		return "Mistral"
	case contains(name, "gemma"):
		return "Gemma"
	default:
		return name
	}
}

// generateDescription генерирует описание модели
func (s *ModelService) generateDescription(name string) string {
	// Простая логика для генерации описания
	switch {
	case contains(name, "instruct"):
		return "Instruction-tuned model for following directions"
	case contains(name, "chat"):
		return "Chat-optimized model for conversations"
	case contains(name, "code"):
		return "Code generation and programming assistance"
	case contains(name, "3b"):
		return "3 billion parameter model - fast and efficient"
	case contains(name, "7b"):
		return "7 billion parameter model - balanced performance"
	case contains(name, "13b"):
		return "13 billion parameter model - high quality"
	default:
		return "AI model for various tasks"
	}
}

// contains проверяет, содержит ли строка подстроку
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || 
		(len(s) > len(substr) && (s[:len(substr)] == substr || 
		s[len(s)-len(substr):] == substr || 
		containsHelper(s, substr))))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
