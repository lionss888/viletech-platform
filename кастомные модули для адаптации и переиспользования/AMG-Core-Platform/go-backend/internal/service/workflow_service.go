package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"
	"amg-flow-backend/pkg/logger"
	"github.com/google/uuid"
)

// WorkflowService сервис для работы с рабочими процессами
type WorkflowService struct {
	workflowRepo domain.WorkflowRepository
	executionRepo domain.WorkflowExecutionRepository
	logger       logger.Logger
}

// NewWorkflowService создает новый сервис workflow
func NewWorkflowService(
	workflowRepo domain.WorkflowRepository,
	executionRepo domain.WorkflowExecutionRepository,
	logger logger.Logger,
) *WorkflowService {
	return &WorkflowService{
		workflowRepo:  workflowRepo,
		executionRepo: executionRepo,
		logger:        logger,
	}
}

// WorkflowInfo представляет информацию о рабочем процессе
type WorkflowInfo struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Definition  map[string]interface{} `json:"definition"`
	IsActive    bool                   `json:"is_active"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// WorkflowExecution представляет выполнение рабочего процесса
type WorkflowExecution struct {
	ID         string                 `json:"id"`
	WorkflowID string                 `json:"workflow_id"`
	Status     string                 `json:"status"`
	Input      map[string]interface{} `json:"input"`
	Output     map[string]interface{} `json:"output"`
	Error      string                 `json:"error,omitempty"`
	StartedAt  time.Time              `json:"started_at"`
	CompletedAt *time.Time            `json:"completed_at,omitempty"`
}

// CreateWorkflowRequest представляет запрос на создание workflow
type CreateWorkflowRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Description string                 `json:"description"`
	Definition  map[string]interface{} `json:"definition" binding:"required"`
}

// UpdateWorkflowRequest представляет запрос на обновление workflow
type UpdateWorkflowRequest struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Definition  map[string]interface{} `json:"definition"`
	IsActive    *bool                  `json:"is_active"`
}

// RunWorkflowRequest представляет запрос на выполнение workflow
type RunWorkflowRequest struct {
	WorkflowID string                 `json:"workflow_id" binding:"required"`
	Input      map[string]interface{} `json:"input"`
	Params     map[string]interface{} `json:"params"`
}

// RunWorkflowResponse представляет ответ выполнения workflow
type RunWorkflowResponse struct {
	ExecutionID string                 `json:"execution_id"`
	WorkflowID  string                 `json:"workflow_id"`
	Status      string                 `json:"status"`
	Result      map[string]interface{} `json:"result"`
	RequestID   string                 `json:"request_id"`
}

// GetWorkflows получает список рабочих процессов
func (s *WorkflowService) GetWorkflows(ctx context.Context, limit, offset int) ([]WorkflowInfo, int, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	// Получаем workflow из репозитория
	workflows, err := s.workflowRepo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get workflows")
	}

	// Получаем общее количество
	total, err := s.workflowRepo.Count(ctx)
	if err != nil {
		s.logger.Errorf("Failed to count workflows: %v", err)
		total = len(workflows) // Fallback
	}

	// Конвертируем в WorkflowInfo
	var workflowInfos []WorkflowInfo
	for _, workflow := range workflows {
		workflowInfos = append(workflowInfos, s.convertWorkflowToInfo(workflow))
	}

	return workflowInfos, total, nil
}

// CreateWorkflow создает новый рабочий процесс
func (s *WorkflowService) CreateWorkflow(ctx context.Context, req *CreateWorkflowRequest) (*WorkflowInfo, error) {
	// Валидация
	if req.Name == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Workflow name is required")
	}
	if req.Definition == nil {
		return nil, errors.New(errors.ErrCodeValidation, "Workflow definition is required")
	}

	// Валидируем определение workflow
	if err := s.validateWorkflowDefinition(req.Definition); err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeValidation, "Invalid workflow definition")
	}

	// Создаем workflow
	workflow := &domain.Workflow{
		Name:        req.Name,
		Description: req.Description,
		Definition:  s.marshalDefinition(req.Definition),
		IsActive:    true,
	}

	if err := s.workflowRepo.Create(ctx, workflow); err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create workflow")
	}

	return s.convertWorkflowToInfo(workflow), nil
}

// UpdateWorkflow обновляет рабочий процесс
func (s *WorkflowService) UpdateWorkflow(ctx context.Context, workflowID string, req *UpdateWorkflowRequest) (*WorkflowInfo, error) {
	// Валидация
	if workflowID == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Workflow ID is required")
	}

	// Получаем существующий workflow
	workflow, err := s.workflowRepo.GetByID(ctx, workflowID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get workflow")
	}

	if workflow == nil {
		return nil, errors.New(errors.ErrCodeNotFound, "Workflow not found")
	}

	// Обновляем поля
	if req.Name != "" {
		workflow.Name = req.Name
	}
	if req.Description != "" {
		workflow.Description = req.Description
	}
	if req.Definition != nil {
		if err := s.validateWorkflowDefinition(req.Definition); err != nil {
			return nil, errors.Wrap(err, errors.ErrCodeValidation, "Invalid workflow definition")
		}
		workflow.Definition = s.marshalDefinition(req.Definition)
	}
	if req.IsActive != nil {
		workflow.IsActive = *req.IsActive
	}

	workflow.UpdatedAt = time.Now()

	if err := s.workflowRepo.Update(ctx, workflow); err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to update workflow")
	}

	return s.convertWorkflowToInfo(workflow), nil
}

// DeleteWorkflow удаляет рабочий процесс
func (s *WorkflowService) DeleteWorkflow(ctx context.Context, workflowID string) error {
	// Валидация
	if workflowID == "" {
		return errors.New(errors.ErrCodeValidation, "Workflow ID is required")
	}

	// Проверяем, что workflow существует
	workflow, err := s.workflowRepo.GetByID(ctx, workflowID)
	if err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get workflow")
	}

	if workflow == nil {
		return errors.New(errors.ErrCodeNotFound, "Workflow not found")
	}

	// Удаляем workflow
	if err := s.workflowRepo.Delete(ctx, workflowID); err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to delete workflow")
	}

	return nil
}

// RunWorkflow выполняет рабочий процесс
func (s *WorkflowService) RunWorkflow(ctx context.Context, req *RunWorkflowRequest) (*RunWorkflowResponse, error) {
	// Валидация
	if req.WorkflowID == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Workflow ID is required")
	}

	// Получаем workflow
	workflow, err := s.workflowRepo.GetByID(ctx, req.WorkflowID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get workflow")
	}

	if workflow == nil {
		return nil, errors.New(errors.ErrCodeNotFound, "Workflow not found")
	}

	if !workflow.IsActive {
		return nil, errors.New(errors.ErrCodeValidation, "Workflow is not active")
	}

	// Создаем запись выполнения
	execution := &domain.WorkflowExecution{
		WorkflowID: workflow.ID,
		Status:     "running",
		Input:      s.marshalInput(req.Input),
		StartedAt:  time.Now(),
	}

	if err := s.executionRepo.Create(ctx, execution); err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create workflow execution")
	}

	// Выполняем workflow (здесь будет логика выполнения)
	result, err := s.executeWorkflow(ctx, workflow, req.Input, req.Params)
	
	// Обновляем статус выполнения
	if err != nil {
		execution.Status = "failed"
		execution.Error = err.Error()
	} else {
		execution.Status = "completed"
		execution.Output = s.marshalOutput(result)
	}
	
	now := time.Now()
	execution.CompletedAt = &now

	if updateErr := s.executionRepo.Update(ctx, execution); updateErr != nil {
		s.logger.Errorf("Failed to update workflow execution: %v", updateErr)
	}

	// Генерируем request ID
	requestID := fmt.Sprintf("workflow-%s-%d", workflow.ID.String(), time.Now().UnixNano())

	return &RunWorkflowResponse{
		ExecutionID: execution.ID.String(),
		WorkflowID:  req.WorkflowID,
		Status:      execution.Status,
		Result:      result,
		RequestID:   requestID,
	}, err
}

// executeWorkflow выполняет логику workflow
func (s *WorkflowService) executeWorkflow(ctx context.Context, workflow *domain.Workflow, input, params map[string]interface{}) (map[string]interface{}, error) {
	// Здесь должна быть логика выполнения workflow
	// Пока возвращаем заглушку
	
	// Парсим определение workflow
	var definition map[string]interface{}
	if err := json.Unmarshal([]byte(workflow.Definition), &definition); err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to parse workflow definition")
	}

	// Простая логика выполнения
	result := map[string]interface{}{
		"workflow_name": workflow.Name,
		"input":         input,
		"params":        params,
		"steps_executed": 1,
		"status":        "completed",
		"timestamp":     time.Now().Format(time.RFC3339),
	}

	return result, nil
}

// validateWorkflowDefinition валидирует определение workflow
func (s *WorkflowService) validateWorkflowDefinition(definition map[string]interface{}) error {
	// Проверяем наличие обязательных полей
	if _, ok := definition["steps"]; !ok {
		return errors.New(errors.ErrCodeValidation, "Workflow definition must contain 'steps'")
	}

	steps, ok := definition["steps"].([]interface{})
	if !ok {
		return errors.New(errors.ErrCodeValidation, "Workflow steps must be an array")
	}

	if len(steps) == 0 {
		return errors.New(errors.ErrCodeValidation, "Workflow must have at least one step")
	}

	// Валидируем каждый шаг
	for i, step := range steps {
		stepMap, ok := step.(map[string]interface{})
		if !ok {
			return errors.New(errors.ErrCodeValidation, fmt.Sprintf("Step %d must be an object", i))
		}

		if _, ok := stepMap["name"]; !ok {
			return errors.New(errors.ErrCodeValidation, fmt.Sprintf("Step %d must have a 'name'", i))
		}

		if _, ok := stepMap["type"]; !ok {
			return errors.New(errors.ErrCodeValidation, fmt.Sprintf("Step %d must have a 'type'", i))
		}
	}

	return nil
}

// convertWorkflowToInfo конвертирует доменный workflow в WorkflowInfo
func (s *WorkflowService) convertWorkflowToInfo(workflow *domain.Workflow) WorkflowInfo {
	// Парсим определение обратно в map
	var definition map[string]interface{}
	if err := json.Unmarshal([]byte(workflow.Definition), &definition); err != nil {
		s.logger.Errorf("Failed to parse workflow definition: %v", err)
		definition = make(map[string]interface{})
	}

	return WorkflowInfo{
		ID:          workflow.ID.String(),
		Name:        workflow.Name,
		Description: workflow.Description,
		Definition:  definition,
		IsActive:    workflow.IsActive,
		CreatedAt:   workflow.CreatedAt,
		UpdatedAt:   workflow.UpdatedAt,
	}
}

// marshalDefinition маршалит определение workflow в JSON
func (s *WorkflowService) marshalDefinition(definition map[string]interface{}) string {
	data, err := json.Marshal(definition)
	if err != nil {
		s.logger.Errorf("Failed to marshal workflow definition: %v", err)
		return "{}"
	}
	return string(data)
}

// marshalInput маршалит входные данные в JSON
func (s *WorkflowService) marshalInput(input map[string]interface{}) string {
	if input == nil {
		return "{}"
	}
	
	data, err := json.Marshal(input)
	if err != nil {
		s.logger.Errorf("Failed to marshal workflow input: %v", err)
		return "{}"
	}
	return string(data)
}

// marshalOutput маршалит выходные данные в JSON
func (s *WorkflowService) marshalOutput(output map[string]interface{}) string {
	if output == nil {
		return "{}"
	}
	
	data, err := json.Marshal(output)
	if err != nil {
		s.logger.Errorf("Failed to marshal workflow output: %v", err)
		return "{}"
	}
	return string(data)
}
