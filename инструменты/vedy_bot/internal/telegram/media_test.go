package telegram

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestDeleteAndGetFile(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/botTOK/deleteMessage":
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})
		case r.URL.Path == "/botTOK/getFile":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"ok": true, "result": map[string]any{"file_id": "f1", "file_path": "photos/x.jpg", "file_size": 3},
			})
		case r.URL.Path == "/file/botTOK/photos/x.jpg":
			_, _ = w.Write([]byte("img"))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	c := New("TOK", time.Second)
	c.SetBaseURL(srv.URL)
	if err := c.DeleteMessage(context.Background(), -1, 5); err != nil {
		t.Fatal(err)
	}
	meta, err := c.GetFile(context.Background(), "f1")
	if err != nil || meta.FilePath == "" {
		t.Fatalf("meta=%v err=%v", meta, err)
	}
	b, err := c.DownloadFile(context.Background(), meta.FilePath)
	if err != nil || string(b) != "img" {
		t.Fatalf("b=%q err=%v", b, err)
	}
}

func TestPrimaryTextAndPhoto(t *testing.T) {
	t.Parallel()
	m := &Message{Caption: "cap", Photo: []PhotoSize{{FileID: "a", FileSize: 1}, {FileID: "b", FileSize: 9}}}
	if m.PrimaryText() != "cap" {
		t.Fatal(m.PrimaryText())
	}
	if m.BestPhotoFileID() != "b" {
		t.Fatal(m.BestPhotoFileID())
	}
}
