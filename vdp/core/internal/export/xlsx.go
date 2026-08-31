package export

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// MinimalXLSX builds a tiny OOXML workbook (Nest Content-Type compatible).
func MinimalXLSX(sheetName string, headers []string, rows [][]string) ([]byte, error) {
	if sheetName == "" {
		sheetName = "Sheet1"
	}
	var shared []string
	cell := func(v string) string {
		shared = append(shared, v)
		return fmt.Sprintf(`<c t="s"><v>%d</v></c>`, len(shared)-1)
	}
	var sheet strings.Builder
	sheet.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`)
	sheet.WriteString(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>`)
	writeRow := func(ridx int, cols []string) {
		sheet.WriteString(fmt.Sprintf(`<row r="%d">`, ridx))
		for _, c := range cols {
			sheet.WriteString(cell(c))
		}
		sheet.WriteString(`</row>`)
	}
	writeRow(1, headers)
	for i, row := range rows {
		writeRow(i+2, row)
	}
	sheet.WriteString(`</sheetData></worksheet>`)

	var sst strings.Builder
	sst.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`)
	sst.WriteString(fmt.Sprintf(`<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%d" uniqueCount="%d">`, len(shared), len(shared)))
	for _, s := range shared {
		sst.WriteString(`<si><t>`)
		sst.WriteString(xmlEscape(s))
		sst.WriteString(`</t></si>`)
	}
	sst.WriteString(`</sst>`)

	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	files := map[string]string{
		"[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`,
		"_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
		"xl/workbook.xml": fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="%s" sheetId="1" r:id="rId1"/></sheets>
</workbook>`, xmlEscape(sheetName)),
		"xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`,
		"xl/worksheets/sheet1.xml": sheet.String(),
		"xl/sharedStrings.xml":     sst.String(),
	}
	for name, body := range files {
		w, err := zw.Create(name)
		if err != nil {
			return nil, err
		}
		if _, err := w.Write([]byte(body)); err != nil {
			return nil, err
		}
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func xmlEscape(s string) string {
	var b strings.Builder
	_ = xml.EscapeText(&b, []byte(s))
	return b.String()
}

// ParseSheetRows reads the first worksheet of a MinimalXLSX-compatible workbook.
func ParseSheetRows(data []byte) ([][]string, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("xlsx zip: %w", err)
	}
	shared, err := readSharedStrings(zr)
	if err != nil {
		return nil, err
	}
	var sheetXML []byte
	for _, f := range zr.File {
		if f.Name == "xl/worksheets/sheet1.xml" {
			rc, err := f.Open()
			if err != nil {
				return nil, err
			}
			sheetXML, err = io.ReadAll(rc)
			_ = rc.Close()
			if err != nil {
				return nil, err
			}
			break
		}
	}
	if len(sheetXML) == 0 {
		return nil, fmt.Errorf("xlsx: sheet1 missing")
	}
	return parseSheetData(sheetXML, shared)
}

func readSharedStrings(zr *zip.Reader) ([]string, error) {
	for _, f := range zr.File {
		if f.Name != "xl/sharedStrings.xml" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		raw, err := io.ReadAll(rc)
		_ = rc.Close()
		if err != nil {
			return nil, err
		}
		type si struct {
			T string `xml:"t"`
		}
		type sst struct {
			SI []si `xml:"si"`
		}
		var doc sst
		if err := xml.Unmarshal(raw, &doc); err != nil {
			return nil, err
		}
		out := make([]string, len(doc.SI))
		for i, s := range doc.SI {
			out[i] = s.T
		}
		return out, nil
	}
	return nil, nil
}

func parseSheetData(sheetXML []byte, shared []string) ([][]string, error) {
	type cell struct {
		T string `xml:"t,attr"`
		V string `xml:"v"`
	}
	type row struct {
		C []cell `xml:"c"`
	}
	type worksheet struct {
		Rows []row `xml:"sheetData>row"`
	}
	var ws worksheet
	if err := xml.Unmarshal(sheetXML, &ws); err != nil {
		return nil, err
	}
	out := make([][]string, 0, len(ws.Rows))
	for _, r := range ws.Rows {
		line := make([]string, 0, len(r.C))
		for _, c := range r.C {
			if c.T == "s" {
				idx, _ := strconv.Atoi(c.V)
				if idx >= 0 && idx < len(shared) {
					line = append(line, shared[idx])
					continue
				}
			}
			line = append(line, c.V)
		}
		out = append(out, line)
	}
	return out, nil
}
