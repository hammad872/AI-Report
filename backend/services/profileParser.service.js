// backend/services/profileParser.service.js
// Extracts athlete fields from VALD PDF text (HumanTrak / Dynamo).
// Tuned to the real VALD header, e.g.:
//   Ayla Benazir Farhan
//   DOB: 12 March 2009 (17 years)
//   Last test: 9 June 2026
//   Practitioner: Faraz Khawaja

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
    const date = new Date(Number(y), Number(m) - 1, Number(d)) // day-first
    return isNaN(date) ? null : date
  }
  const t = Date.parse(s) // handles "12 March 2009"
  return isNaN(t) ? null : new Date(t)
}

const cleanName = (raw) => {
  if (!raw) return ''
  let name = raw.replace(/\r/g, ' ').trim()
  // PDF text often glues "Last" onto the surname before "Last test:"
  name = name.replace(/([a-z])Last$/i, '$1').trim()
  // Keep only the final line if the match spilled over a newline
  // (e.g. "...Strength Assessment\nAyla Benazir Farhan" -> "Ayla Benazir Farhan")
  const lines = name.split(/\n+/).map(l => l.trim()).filter(Boolean)
  if (lines.length > 1) name = lines[lines.length - 1]
  // Drop leading report/section words that sometimes precede the name
  name = name.replace(
    /^(?:athlete performance report|movement (?:&|and) strength assessment|strength assessment|assessment|report)\s+/i,
    ''
  ).trim()
  return name
}

const parseName = (text) => {
  // 1) "Patient:" / "Athlete:" label (appears on VALD detail pages)
  let name = firstMatch(text, [
    /\b(?:[Pp]atient|[Aa]thlete|[Cc]lient|[Pp]layer|[Nn]ame)\s*[:\-]\s*([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,4})/,
  ])
  if (name) return cleanName(name)

  // 2) Capitalised name on the line immediately before "DOB:"
  //    Split on DOB, take the LAST line of the preceding block — that's the name,
  //    not the report title several lines above it.
  let header = (text.split(/\bDOB\s*[:\-]/i)[0] || '').trim()
  header = header.replace(/\s*Last\s+test\s*[:\-][\s\S]*$/i, '').trim()
  header = header.replace(/([a-z])Last(?=\s*test)/i, '$1').trim()

  const headerLines = header.split(/\n+/).map(l => l.trim()).filter(Boolean)
  const lastLine = headerLines[headerLines.length - 1] || header

  const m = lastLine.match(/([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,4})\s*$/)
  if (m) name = m[1].trim()
  return cleanName(name)
}

const parseProfileFromText = (text = '') => {
  const t = text.replace(/\r/g, ' ')

  const name = parseName(text) // pass original (with newlines) so line logic works

  // ── DOB ──  "DOB: 12 March 2009" or "DOB: 12/03/2009"
  const dob = firstMatch(t, [
    /\b(?:date of birth|d\.?o\.?b\.?)\s*[:\-]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i,
    /\b(?:date of birth|d\.?o\.?b\.?)\s*[:\-]\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  ])

  // ── Age ──  "(17 years)" or "Age: 17", else derive from DOB
  let age = firstMatch(t, [
    /\(\s*(\d{1,3})\s*years?\s*\)/i,
    /\bage\s*[:\-]\s*(\d{1,3})/i,
  ])
  if (!age && dob) {
    const d = parseLooseDate(dob)
    if (d) {
      const yrs = Math.floor((Date.now() - d.getTime()) / (365.25 * 864e5))
      if (yrs > 0 && yrs < 120) age = String(yrs)
    }
  }

  // ── Weight ──  "Weight: 37 kg"
  const weight = firstMatch(t, [
    /\bweight\s*[:\-]\s*(\d{1,3}(?:\.\d)?\s*kg)/i,
    /\bweight\s*[:\-]\s*(\d{1,3}(?:\.\d)?)/i,
  ])

  // ── Sport ──  (rarely present in VALD exports; matched only if explicit)
  const sport = firstMatch(t, [/\bsport\s*[:\-]\s*([A-Za-z ]{2,30})/i])

  // ── Test date ──  "Last test: 9 June 2026"
  const testDate = firstMatch(t, [
    /\b(?:last test|test date|assessment date|date of (?:test|assessment))\s*[:\-]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i,
    /\b(?:last test|test date|assessment date)\s*[:\-]\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  ])

  // ── Practitioner ──  "Practitioner: Faraz Khawaja"
  const practitioner = firstMatch(t, [
    /\b[Pp]ractitioner\s*[:\-]\s*([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2})/,
  ])

  return {
    name,
    dob,
    age,
    weight,
    sport: sport ? titleCase(sport) : '',
    testDate,
    practitioner,
  }
}

module.exports = { parseProfileFromText }