// Package openapi loads OpenAPI YAML and validates JSON documents against named component schemas.
package openapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v5"
	"gopkg.in/yaml.v3"
)

const formsResourceURL = "https://viletech.local/openapi/forms.json"

// Document holds compiled JSON Schema definitions derived from OpenAPI components.schemas.
type Document struct {
	compiler *jsonschema.Compiler
}

// Load reads an OpenAPI YAML file and prepares named component schemas for validation.
func Load(path string) (*Document, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read openapi: %w", err)
	}
	return LoadBytes(raw)
}

// LoadBytes parses OpenAPI YAML bytes and prepares named component schemas for validation.
func LoadBytes(raw []byte) (*Document, error) {
	var root map[string]any
	if err := yaml.Unmarshal(raw, &root); err != nil {
		return nil, fmt.Errorf("parse openapi yaml: %w", err)
	}
	components, ok := root["components"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("components missing")
	}
	schemas, ok := components["schemas"].(map[string]any)
	if !ok || len(schemas) == 0 {
		return nil, fmt.Errorf("components.schemas missing")
	}
	defs := rewriteComponentRefs(schemas)
	schemaDoc := map[string]any{
		"$id":   formsResourceURL,
		"$defs": defs,
	}
	encoded, err := json.Marshal(schemaDoc)
	if err != nil {
		return nil, fmt.Errorf("encode schema document: %w", err)
	}
	compiler := jsonschema.NewCompiler()
	compiler.Draft = jsonschema.Draft2020
	if err := compiler.AddResource(formsResourceURL, bytes.NewReader(encoded)); err != nil {
		return nil, fmt.Errorf("add schema resource: %w", err)
	}
	return &Document{compiler: compiler}, nil
}

// ValidateNamedSchema checks that document JSON conforms to components.schemas[name].
func (d *Document) ValidateNamedSchema(name string, document []byte) error {
	if d == nil || d.compiler == nil {
		return fmt.Errorf("openapi document is nil")
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("schema name required")
	}
	schemaURL := formsResourceURL + "#/$defs/" + name
	schema, err := d.compiler.Compile(schemaURL)
	if err != nil {
		return fmt.Errorf("compile schema %q: %w", name, err)
	}
	var value any
	if err := json.Unmarshal(document, &value); err != nil {
		return fmt.Errorf("parse document json: %w", err)
	}
	if err := schema.Validate(value); err != nil {
		return fmt.Errorf("schema %q: %w", name, err)
	}
	return nil
}

func rewriteComponentRefs(node any) any {
	switch typed := node.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, value := range typed {
			if key == "$ref" {
				if ref, ok := value.(string); ok {
					out[key] = rewriteRef(ref)
					continue
				}
			}
			out[key] = rewriteComponentRefs(value)
		}
		return out
	case []any:
		out := make([]any, len(typed))
		for i, value := range typed {
			out[i] = rewriteComponentRefs(value)
		}
		return out
	default:
		return node
	}
}

func rewriteRef(ref string) string {
	const prefix = "#/components/schemas/"
	if strings.HasPrefix(ref, prefix) {
		return "#/$defs/" + strings.TrimPrefix(ref, prefix)
	}
	return ref
}
