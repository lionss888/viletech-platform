package format

import (
	"bytes"
	"path"
	"strings"
)

// Kind is a routed input format.
type Kind string

const (
	KindPDF  Kind = "pdf"
	KindTXT  Kind = "txt"
	KindDOCX Kind = "docx"
	KindXLSX Kind = "xlsx"
	KindImage Kind = "image"
	KindUnknown Kind = "unknown"
)

// Detect returns format from filename and optional mime / magic bytes.
func Detect(fileName, mime string, content []byte) Kind {
	ext := strings.ToLower(path.Ext(fileName))
	switch ext {
	case ".pdf":
		return KindPDF
	case ".txt", ".text", ".csv":
		return KindTXT
	case ".docx":
		return KindDOCX
	case ".xlsx", ".xls":
		return KindXLSX
	case ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff":
		return KindImage
	}
	mime = strings.ToLower(mime)
	switch {
	case strings.Contains(mime, "pdf"):
		return KindPDF
	case strings.Contains(mime, "word") || strings.Contains(mime, "docx"):
		return KindDOCX
	case strings.Contains(mime, "sheet") || strings.Contains(mime, "excel"):
		return KindXLSX
	case strings.HasPrefix(mime, "text/"):
		return KindTXT
	case strings.HasPrefix(mime, "image/"):
		return KindImage
	}
	if len(content) >= 4 && bytes.HasPrefix(content, []byte("%PDF")) {
		return KindPDF
	}
	if len(content) >= 2 && content[0] == 'P' && content[1] == 'K' {
		// zip-based office; prefer unknown over wrong branch without ext
		return KindUnknown
	}
	if looksLikeText(content) {
		return KindTXT
	}
	return KindUnknown
}

func looksLikeText(b []byte) bool {
	if len(b) == 0 {
		return false
	}
	n := len(b)
	if n > 512 {
		n = 512
	}
	for i := 0; i < n; i++ {
		c := b[i]
		if c == 0 {
			return false
		}
	}
	return true
}
