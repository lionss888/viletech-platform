package textx

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"io"
	"strings"

	"github.com/viletech/vdp/extraction/internal/format"
)

// ExtractLayout pulls plain text / table-ish text for IE.
func ExtractLayout(kind format.Kind, content []byte, fileName string) (string, error) {
	switch kind {
	case format.KindTXT:
		return string(content), nil
	case format.KindDOCX:
		return extractDOCX(content)
	case format.KindXLSX:
		return extractXLSXSharedStrings(content)
	case format.KindPDF:
		// Prefer embedded text heuristics; Vision OCR used when empty/short.
		s := extractPDFTextHeuristic(content)
		return s, nil
	default:
		if len(content) > 0 && content[0] != 0 && content[0] != '%' && content[0] != 'P' {
			return string(content), nil
		}
		return "", nil
	}
}

func extractPDFTextHeuristic(content []byte) string {
	// Minimal: pull printable sequences between BT/ET is too heavy; return empty to force OCR for scans.
	if !bytes.Contains(content, []byte("%PDF")) {
		return ""
	}
	var b strings.Builder
	inParen := false
	escaped := false
	for i := 0; i < len(content); i++ {
		c := content[i]
		if escaped {
			escaped = false
			if inParen && c >= 32 && c < 127 {
				b.WriteByte(c)
			}
			continue
		}
		if c == '\\' && inParen {
			escaped = true
			continue
		}
		if c == '(' {
			inParen = true
			continue
		}
		if c == ')' {
			inParen = false
			b.WriteByte(' ')
			continue
		}
		if inParen && c >= 32 && c < 127 {
			b.WriteByte(c)
		}
	}
	out := strings.TrimSpace(b.String())
	if len(out) < 40 {
		return ""
	}
	return out
}

func extractDOCX(content []byte) (string, error) {
	zr, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return "", err
	}
	var parts []string
	for _, f := range zr.File {
		if f.Name != "word/document.xml" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return "", err
		}
		data, err := io.ReadAll(rc)
		_ = rc.Close()
		if err != nil {
			return "", err
		}
		parts = append(parts, stripXMLTags(string(data)))
	}
	return strings.TrimSpace(strings.Join(parts, "\n")), nil
}

func extractXLSXSharedStrings(content []byte) (string, error) {
	zr, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return "", err
	}
	var parts []string
	for _, f := range zr.File {
		if f.Name != "xl/sharedStrings.xml" && !strings.HasPrefix(f.Name, "xl/worksheets/") {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			continue
		}
		data, err := io.ReadAll(rc)
		_ = rc.Close()
		if err != nil {
			continue
		}
		parts = append(parts, stripXMLTags(string(data)))
	}
	return strings.TrimSpace(strings.Join(parts, "\n")), nil
}

func stripXMLTags(s string) string {
	dec := xml.NewDecoder(strings.NewReader(s))
	var b strings.Builder
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		if ch, ok := tok.(xml.CharData); ok {
			t := strings.TrimSpace(string(ch))
			if t != "" {
				if b.Len() > 0 {
					b.WriteByte(' ')
				}
				b.WriteString(t)
			}
		}
	}
	return b.String()
}
