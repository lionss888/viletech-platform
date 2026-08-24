package handlers

import (
	"net/http"
	"strconv"

	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// GetWorkflows получает список рабочих процессов
func (h *Handlers) GetWorkflows(c *gin.Context) {
	// Получаем параметры пагинации
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Создаем сервис workflow (в реальной реализации здесь будет DI)
	workflowService := service.NewWorkflowService(nil, nil, h.logger)

	// Получаем workflow
	workflows, total, err := workflowService.GetWorkflows(c.Request.Context(), limit, offset)
	if err != nil {
		appErr, ok := err.(*errors.AppError)
		if ok {
			c.JSON(appErr.StatusCode, gin.H{
				"error": appErr.Error(),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Internal server error",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"workflows": workflows,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	})
}

// CreateWorkflow создает новый рабочий процесс
func (h *Handlers) CreateWorkflow(c *gin.Context) {
	var req service.CreateWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": errors.New(errors.ErrCodeValidation, "Invalid request format").Error(),
		})
		return
	}

	// Создаем сервис workflow
	workflowService := service.NewWorkflowService(nil, nil, h.logger)

	// Создаем workflow
	workflow, err := workflowService.CreateWorkflow(c.Request.Context(), &req)
	if err != nil {
		appErr, ok := err.(*errors.AppError)
		if ok {
			c.JSON(appErr.StatusCode, gin.H{
				"error": appErr.Error(),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Internal server error",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, workflow)
}

// RunWorkflow выполняет рабочий процесс
func (h *Handlers) RunWorkflow(c *gin.Context) {
	workflowID := c.Param("id")
	if workflowID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Workflow ID is required",
		})
		return
	}

	var req service.RunWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": errors.New(errors.ErrCodeValidation, "Invalid request format").Error(),
		})
		return
	}

	req.WorkflowID = workflowID

	// Создаем сервис workflow
	workflowService := service.NewWorkflowService(nil, nil, h.logger)

	// Выполняем workflow
	response, err := workflowService.RunWorkflow(c.Request.Context(), &req)
	if err != nil {
		appErr, ok := err.(*errors.AppError)
		if ok {
			c.JSON(appErr.StatusCode, gin.H{
				"error": appErr.Error(),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Internal server error",
			})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}