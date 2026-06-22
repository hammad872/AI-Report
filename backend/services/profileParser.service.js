// Best-effort regex extraction of athlete fields from VALD PDF text.
// Brittle by design — tune the patterns to your real PDFs (see logged text).

const firstMatch = (text, patterns) => {
    for (const re of patterns) {
      const m = text.match(re)
      if (m && m[1]) return m[1].trim()
    }
    return ''
  }
  
  const titleCase = s =>
    s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim()
  
  const parseLooseDate = (s) => {
    const num = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
    if (num) {
      let [, d, m, y] = num
      if (y.length === 2) y = '20' + y
      const date = new Date(Number(y), Number(m) - 1, Number(d)) // assumes day-first
      return isNaN(date) ? null : date
    }
    const t = Date.parse(s)
    return isNaN(t) ? null : new Date(t)
  }
  
  const parseProfileFromText = (text = '') => {
    const t = text.replace(/\r/g, '')
  
    const name = firstMatch(t, [
      /\b(?:athlete|client|name|player)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{1,60})/i,
    ])
  
    const dob = firstMatch(t, [
      /\b(?:date of birth|d\.?o\.?b\.?)\s*[:\-]\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      /\b(?:date of birth|d\.?o\.?b\.?)\s*[:\-]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
    ])
  
    let age = firstMatch(t, [/\bage\s*[:\-]\s*(\d{1,2})/i])
  
    const weight = firstMatch(t, [
      /\bweight\s*[:\-]\s*(\d{1,3}(?:\.\d)?\s*kg?)/i,
      /\bweight\s*[:\-]\s*(\d{1,3}(?:\.\d)?)/i,
    ])
  
    const sport = firstMatch(t, [/\bsport\s*[:\-]\s*([A-Za-z ]{2,30})/i])
  
    const testDate = firstMatch(t, [
      /\b(?:test date|assessment date|date of (?:test|assessment))\s*[:\-]\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      /\b(?:test date|assessment date)\s*[:\-]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
    ])
  
    if (!age && dob) {
      const d = parseLooseDate(dob)
      if (d) {
        const yrs = Math.floor((Date.now() - d.getTime()) / (365.25 * 864e5))
        if (yrs > 0 && yrs < 120) age = String(yrs)
      }
    }
  
    return { name, dob, age, weight, sport: sport ? titleCase(sport) : '', testDate }
  }
  
  module.exports = { parseProfileFromText }