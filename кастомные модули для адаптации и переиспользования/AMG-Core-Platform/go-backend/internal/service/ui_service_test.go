package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUIService_GetComponents_WithoutRepo(t *testing.T) {
	// Создание сервиса без репозитория (заглушка)
	service := NewUIService(nil, &MockLogger{})

	// Выполнение теста
	components, err := service.GetComponents(context.Background())

	// Проверки
	assert.NoError(t, err)
	assert.NotNil(t, components)
	assert.Len(t, components, 4) // Ожидаем 4 заглушки компонента

	// Проверяем конкретные компоненты
	componentNames := make(map[string]bool)
	for _, comp := range components {
		componentNames[comp.Name] = true
	}

	assert.True(t, componentNames["main-chat"])
	assert.True(t, componentNames["analytics-dashboard"])
	assert.True(t, componentNames["development-panel"])
	assert.True(t, componentNames["workflow-manager"])
}

func TestUIService_GetComponentByName(t *testing.T) {
	// Создание сервиса без репозитория (заглушка)
	service := NewUIService(nil, &MockLogger{})

	// Выполнение теста
	component, err := service.GetComponentByName(context.Background(), "main-chat")

	// Проверки
	assert.NoError(t, err)
	assert.NotNil(t, component)
	assert.Equal(t, "main-chat", component.Name)
	assert.Equal(t, "chat", component.Type)
	assert.NotEmpty(t, component.Schema)
}

func TestUIService_GetComponentByName_NotFound(t *testing.T) {
	// Создание сервиса без репозитория (заглушка)
	service := NewUIService(nil, &MockLogger{})

	// Выполнение теста
	component, err := service.GetComponentByName(context.Background(), "non-existent")

	// Проверки
	assert.Error(t, err)
	assert.Nil(t, component)
	assert.Contains(t, err.Error(), "UI component not found")
}

func TestUIService_GetForms(t *testing.T) {
	// Создание сервиса без репозитория (заглушка)
	service := NewUIService(nil, &MockLogger{})

	// Выполнение теста
	forms, err := service.GetForms(context.Background())

	// Проверки
	assert.NoError(t, err)
	assert.NotNil(t, forms)
	assert.Len(t, forms, 2) // Ожидаем 2 заглушки формы

	// Проверяем конкретные формы
	formNames := make(map[string]bool)
	for _, form := range forms {
		formNames[form.Name] = true
	}

	assert.True(t, formNames["chat-form"])
	assert.True(t, formNames["model-selection"])
}

func TestUIService_GetTabs(t *testing.T) {
	// Создание сервиса без репозитория (заглушка)
	service := NewUIService(nil, &MockLogger{})

	// Выполнение теста
	tabs, err := service.GetTabs(context.Background())

	// Проверки
	assert.NoError(t, err)
	assert.NotNil(t, tabs)
	assert.Len(t, tabs, 4) // Ожидаем 4 заглушки вкладки

	// Проверяем порядок вкладок
	assert.Equal(t, "chat-tab", tabs[0].Name)
	assert.Equal(t, 1, tabs[0].Order)
	assert.Equal(t, "analytics-tab", tabs[1].Name)
	assert.Equal(t, 2, tabs[1].Order)
}

func TestUIService_GetUISchema_MainApp(t *testing.T) {
	// Создание сервиса без репозитория (заглушка)
	service := NewUIService(nil, &MockLogger{})

	// Выполнение теста
	schema, err := service.GetUISchema(context.Background(), "main-app")

	// Проверки
	assert.NoError(t, err)
	assert.NotNil(t, schema)
	assert.Equal(t, "main-app", schema["name"])
	assert.Equal(t, "AMG Flow", schema["title"])
	assert.Equal(t, "tabs", schema["layout"])

	// Проверяем наличие вкладок
	tabs, ok := schema["tabs"].([]map[string]interface{})
	assert.True(t, ok)
	assert.Len(t, tabs, 4)

	// Проверяем первую вкладку
	firstTab := tabs[0]
	assert.Equal(t, "chat-tab", firstTab["id"])
	assert.Equal(t, "Chat", firstTab["title"])

	component, ok := firstTab["component"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "chat", component["type"])
}

func TestUIService_GetUISchema_Unknown(t *testing.T) {
	// Создание сервиса без репозитория (заглушка)
	service := NewUIService(nil, &MockLogger{})

	// Выполнение теста
	schema, err := service.GetUISchema(context.Background(), "unknown-schema")

	// Проверки
	assert.NoError(t, err)
	assert.NotNil(t, schema)
	assert.Equal(t, "unknown-schema", schema["name"])
	assert.Equal(t, "Dynamic UI Schema", schema["title"])
	assert.Contains(t, schema["description"], "unknown-schema")

	// Проверяем компонент
	component, ok := schema["component"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "container", component["type"])
}
