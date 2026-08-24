package handlers

import (
	"net/http"

	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// UIComponent представляет UI компонент
type UIComponent struct {
	ID     string                 `json:"id"`
	Name   string                 `json:"name"`
	Type   string                 `json:"type"`
	Schema map[string]interface{} `json:"schema"`
}

// UIForm представляет UI форму
type UIForm struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Schema      map[string]interface{} `json:"schema"`
	Validation  map[string]interface{} `json:"validation"`
}

// UITab представляет UI вкладку
type UITab struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Title       string `json:"title"`
	Description string `json:"description"`
	ComponentID string `json:"component_id"`
	Order       int    `json:"order"`
}

// GetUIComponents получает список UI компонентов
func (h *Handlers) GetUIComponents(c *gin.Context) {
	// Создаем UI сервис (в реальной реализации здесь будет DI)
	uiService := service.NewUIService(nil, h.logger)

	// Получаем компоненты
	components, err := uiService.GetComponents(c.Request.Context())
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
	// Здесь должна быть логика получения форм из базы данных
	// Пока возвращаем заглушку
	forms := []UIForm{
		{
			ID:          "1",
			Name:        "user-settings",
			Title:       "User Settings",
			Description: "User account settings form",
			Schema: map[string]interface{}{
				"fields": []map[string]interface{}{
					{
						"name":        "email",
						"type":        "email",
						"label":       "Email",
						"required":    true,
						"placeholder": "Enter your email",
					},
					{
						"name":        "name",
						"type":        "text",
						"label":       "Full Name",
						"required":    true,
						"placeholder": "Enter your full name",
					},
				},
			},
			Validation: map[string]interface{}{
				"email": map[string]interface{}{
					"type":     "email",
					"required": true,
					"message":  "Please enter a valid email address",
				},
			},
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"forms": forms,
		"total": len(forms),
	})
}

// GetUITabs получает список UI вкладок
func (h *Handlers) GetUITabs(c *gin.Context) {
	// Здесь должна быть логика получения вкладок из базы данных
	// Пока возвращаем заглушку
	tabs := []UITab{
		{
			ID:          "1",
			Name:        "chat",
			Title:       "Chat",
			Description: "Main chat interface",
			ComponentID: "1",
			Order:       1,
		},
		{
			ID:          "2",
			Name:        "analytics",
			Title:       "Analytics",
			Description: "Analytics dashboard",
			ComponentID: "2",
			Order:       2,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"tabs":  tabs,
		"total": len(tabs),
	})
}

// GetUISchema получает схему UI по имени
func (h *Handlers) GetUISchema(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Schema name is required",
		})
		return
	}

	// Здесь должна быть логика получения схемы из базы данных
	// Пока возвращаем заглушку
	schema := map[string]interface{}{
		"name":        name,
		"title":       "Dynamic UI Schema",
		"description": "Generated UI schema for " + name,
		"components": []map[string]interface{}{
			{
				"type": "container",
				"children": []map[string]interface{}{
					{
						"type": "header",
						"text": "Welcome to " + name,
					},
					{
						"type": "content",
						"text": "This is dynamically generated content",
					},
				},
			},
		},
	}

	c.JSON(http.StatusOK, schema)
}
