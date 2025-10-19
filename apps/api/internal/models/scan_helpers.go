package models

// Helper methods to compute aggregate stats from ScanLangs

// GetTotal returns total lines across all languages
func (s *Scan) GetTotal() int {
	total := 0
	for _, lang := range s.ScanLangs {
		total += lang.Total
	}
	return total
}

// GetCode returns total code lines (computed as Total - Comment - Blank for each lang)
func (s *Scan) GetCode() int {
	code := 0
	for _, lang := range s.ScanLangs {
		code += lang.GetCode()
	}
	return code
}

// GetComment returns total comment lines
func (s *Scan) GetComment() int {
	comment := 0
	for _, lang := range s.ScanLangs {
		comment += lang.Comment
	}
	return comment
}

// GetBlank returns total blank lines
func (s *Scan) GetBlank() int {
	blank := 0
	for _, lang := range s.ScanLangs {
		blank += lang.Blank
	}
	return blank
}

// GetCommentRatio returns comment / code ratio
func (s *Scan) GetCommentRatio() float64 {
	code := s.GetCode()
	if code == 0 {
		return 0
	}
	return float64(s.GetComment()) / float64(code)
}

// GetCoreCodeLines returns code minus info lines (simplified heuristic)
func (s *Scan) GetCoreCodeLines() int {
	return s.GetCode()
}

// GetInfoLines returns info lines (comment + blank as heuristic)
func (s *Scan) GetInfoLines() int {
	return s.GetComment() + s.GetBlank()
}

// GetCode returns code lines for a language (Total - Comment - Blank)
func (sl *ScanLang) GetCode() int {
	return sl.Total - sl.Comment - sl.Blank
}
