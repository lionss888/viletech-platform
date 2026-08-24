package handlers

import (
	"net/http"

	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// GetUIComponents получает список UI компонентов
func (h *Handlers) GetUIComponents(c *gin.Context) {
	// Создаем сервис UI
	uiService := service.NewUIService(h.logger)

	// Получаем компоненты
	components, err := uiService.GetUIComponents(c.Request.Context())
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
		"components": components,
		"total":      len(components),
	})
}

// GetUIForms получает список UI форм
func (h *Handlers) GetUIForms(c *gin.Context) {
	// Создаем сервис UI
	uiService := service.NewUIService(h.logger)

	// Получаем формы
	forms, err := uiService.GetUIForms(c.Request.Context())
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
		"forms": forms,
		"total": len(forms),
	})
}

// GetUITabs получает список UI вкладок
func (h *Handlers) GetUITabs(c *gin.Context) {
	// Создаем сервис UI
	uiService := service.NewUIService(h.logger)

	// Получаем вкладки
	tabs, err := uiService.GetUITabs(c.Request.Context())
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
		"tabs":  tabs,
		"total": len(tabs),
	})
}

// GetUISchema получает UI схему по имени
func (h *Handlers) GetUISchema(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Schema name is required",
		})
		return
	}

	// Создаем сервис UI
	uiService := service.NewUIService(h.logger)

	// Получаем схему
	schema, err := uiService.GetUISchema(c.Request.Context(), name)
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

	c.JSON(http.StatusOK, schema)
}

// CreateUIComponent создает новый UI компонент
func (h *Handlers) CreateUIComponent(c *gin.Context) {
	var component service.UIComponent
	if err := c.ShouldBindJSON(&component); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid JSON format",
		})
		return
	}

	uiService := service.NewUIService(h.logger)
	createdComponent, err := uiService.CreateUIComponent(c.Request.Context(), component)
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

	c.JSON(http.StatusCreated, createdComponent)
}

// UpdateUIComponent обновляет UI компонент
func (h *Handlers) UpdateUIComponent(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Component ID is required",
		})
		return
	}

	var component service.UIComponent
	if err := c.ShouldBindJSON(&component); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid JSON format",
		})
		return
	}

	uiService := service.NewUIService(h.logger)
	updatedComponent, err := uiService.UpdateUIComponent(c.Request.Context(), id, component)
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

	c.JSON(http.StatusOK, updatedComponent)
}

// DeleteUIComponent удаляет UI компонент
func (h *Handlers) DeleteUIComponent(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Component ID is required",
		})
		return
	}

	uiService := service.NewUIService(h.logger)
	err := uiService.DeleteUIComponent(c.Request.Context(), id)
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

	c.JSON(http.StatusNoContent, nil)
}

// ValidateForm валидирует форму
func (h *Handlers) ValidateForm(c *gin.Context) {
	var request struct {
		FormData map[string]interface{} `json:"form_data"`
		FormName string                 `json:"form_name"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid JSON format",
		})
		return
	}

	// Получаем схему формы
	uiService := service.NewUIService(h.logger)
	schema, err := uiService.GetUISchema(c.Request.Context(), request.FormName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Form schema not found",
		})
		return
	}

	// Создаем движок валидации
	validationEngine := service.NewValidationEngine(h.logger)

	// Валидируем форму
	result := validationEngine.ValidateForm(c.Request.Context(), request.FormData, schema.Forms[0])

	c.JSON(http.StatusOK, result)
}

// GenerateForm генерирует форму из шаблона
func (h *Handlers) GenerateForm(c *gin.Context) {
	var request struct {
		TemplateName string `json:"template_name"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid JSON format",
		})
		return
	}

	schemaBuilder := service.NewSchemaBuilder(h.logger)

	var form *service.UIForm
	var err error

	switch request.TemplateName {
	case "loan-application":
		form, err = schemaBuilder.CreateLoanApplicationForm(c.Request.Context())
	case "user-profile":
		form, err = schemaBuilder.CreateUserProfileForm(c.Request.Context())
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Unknown template name",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate form",
		})
		return
	}

	c.JSON(http.StatusOK, form)
}
