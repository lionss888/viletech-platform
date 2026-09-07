package format

import "testing"

func TestDetect(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		file string
		mime string
		want Kind
	}{
		{"pdf", "a.pdf", "", KindPDF},
		{"txt", "a.txt", "", KindTXT},
		{"docx", "a.docx", "", KindDOCX},
		{"xlsx", "a.xlsx", "", KindXLSX},
		{"mime", "x", "application/pdf", KindPDF},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := Detect(tc.file, tc.mime, nil); got != tc.want {
				t.Fatalf("got %s want %s", got, tc.want)
			}
		})
	}
	if Detect("", "", []byte("%PDF-1.4")) != KindPDF {
		t.Fatal("magic")
	}
}
