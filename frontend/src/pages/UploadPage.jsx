import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { generateReport, extractProfile } from '../services/api'
import { useReportStore } from '../store/reportStore'
import { useParamStore } from '../store/paramStore'
import { sanitizeInput } from '../utils/sanitize'


const SPORTS = [
  'Cricket', 'Football', 'Basketball', 'Athletics',
  'Swimming', 'Tennis', 'Rugby', 'Volleyball',
  'Martial Arts', 'General Fitness', 'Other',
]

const STEPS = [
  { num: 1, label: 'Upload files' },
  { num: 2, label: 'Athlete details' },
  { num: 3, label: 'Generate' },
]

export default function UploadPage({ onReportGenerated }) {
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [loadMsg, setLoadMsg]   = useState('')
  const [currentStep, setStep]  = useState(1)
  const setReport               = useReportStore(s => s.setReport)
  const enabledParams           = useParamStore(s => s.params.filter(p => p.enabled))

  const [form, setForm] = useState({
    name: '', age: '', sport: 'General Fitness',
    position: '', trainingLevel: 'Semi-Professional',
    knownInjuries: '',
  })

  const onDrop = useCallback(accepted => {
    const valid = accepted.filter(f =>
      f.type === 'application/pdf' || f.name.endsWith('.csv')
    )
    if (valid.length !== accepted.length) {
      toast.error('Please upload VALD PDF or CSV files only.')
    }
    if (valid.length > 3) {
      toast.error('Maximum 3 files allowed.')
      return
    }
    setFiles(prev => [...prev, ...valid].slice(0, 3))
    autofillFromPdf(valid.filter(f => f.type === 'application/pdf'))
    setStep(2)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/csv': ['.csv'] },
    maxFiles: 3,
  })

  const removeFile = idx =>
    setFiles(prev => prev.filter((_, i) => i !== idx))

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const validate = () => {
    if (files.length === 0) { toast.error('Please upload at least one VALD file.'); return false }
    if (!form.name.trim())  { toast.error('Athlete name is required.'); return false }
    if (!form.age)          { toast.error('Age is required.'); return false }
    if (!form.sport)        { toast.error('Sport is required.'); return false }
    // check required dynamic params
    for (const p of enabledParams) {
      if (p.required && !form[p.key]?.toString().trim()) {
        toast.error(`${p.label} is required.`)
        return false
      }
    }
    return true
  }

  const autofillFromPdf = async (pdfFiles) => {
    if (pdfFiles.length === 0) return
    try {
      const { profile } = await extractProfile(pdfFiles)
      setForm(prev => {
        const next = { ...prev }
        if (profile.name && !prev.name) next.name = profile.name
        if (profile.age && !prev.age)   next.age  = profile.age
        if (profile.sport) {
          const match = SPORTS.find(s => s.toLowerCase() === profile.sport.toLowerCase())
          if (match) next.sport = match
        }
        return next
      })
      const filled = [profile.name && 'name', profile.age && 'age', profile.sport && 'sport'].filter(Boolean)
      if (filled.length) toast.success(`Autofilled ${filled.join(', ')} from PDF`)
    } catch (err) {
      console.warn('Autofill failed:', err.message)  // best-effort, stays silent to the user
    }
  }

  const handleGenerate = async () => {
    if (!validate()) return
    setLoading(true)

    const messages = [
      'Extracting VALD data…',
      'Building AI prompt…',
      'Generating report…',
      'Almost done…',
    ]
    let i = 0
    setLoadMsg(messages[0])
    const iv = setInterval(() => {
      i = Math.min(i + 1, messages.length - 1)
      setLoadMsg(messages[i])
    }, 800)

    try {
      const sanitizedForm = {
        ...form,
        name:          sanitizeInput(form.name),
        knownInjuries: sanitizeInput(form.knownInjuries),
        position:      sanitizeInput(form.position),
      }
      const data = await generateReport(files, sanitizedForm)
      setReport(data)
      toast.success('Report generated!')
      onReportGenerated()
    } catch (err) {
      toast.error(err.message || 'Report generation failed. Please try again.')
    } finally {
      clearInterval(iv)
      setLoading(false)
    }
  }

  if (loading) return <LoadingScreen message={loadMsg} />

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Step bar */}
      <div className="card flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const done   = step.num < currentStep
          const active = step.num === currentStep
          return (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2.5">
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0
                  ${done   ? 'bg-pp-green text-white' : ''}
                  ${active ? 'bg-pp-green text-white' : ''}
                  ${!done && !active ? 'bg-gray-100 text-gray-400 border border-gray-200' : ''}
                `}>
                  {done ? '✓' : step.num}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-gray-900' : done ? 'text-pp-green' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-4 ${done ? 'bg-pp-green' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Upload zone */}
      <div className="card">
        <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
          📁 Upload VALD files
          <span className="text-xs text-gray-400 font-normal">(up to 3 files)</span>
        </h2>

        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${isDragActive
              ? 'border-pp-green bg-pp-greenLite'
              : 'border-gray-200 hover:border-pp-green hover:bg-pp-greenLite'}
          `}
        >
          <input {...getInputProps()} />
          <div className="text-3xl text-gray-300 mb-2">☁</div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            {isDragActive ? 'Drop files here' : 'Drag & drop VALD files here'}
          </p>
          <p className="text-xs text-gray-400">
            Supports PDF and CSV — HumanTrak & Dynamo exports
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-pp-green text-lg">📄</span>
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{file.name}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pp-greenLite text-pp-green">
                  {file.name.endsWith('.csv') ? 'CSV' : 'PDF'}
                </span>
                <button
                  onClick={() => removeFile(idx)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                  aria-label="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Athlete form */}
      <div className="card">
        <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
          👤 Athlete details
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Athlete name *</label>
            <input
              name="name" value={form.name} onChange={handleChange}
              className="inp" placeholder="Full name"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Age *</label>
            <input
              name="age" value={form.age} onChange={handleChange}
              type="number" min="1" max="99" className="inp" placeholder="Years"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Sport *</label>
            <select name="sport" value={form.sport} onChange={handleChange} className="inp">
              {SPORTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Position / role</label>
            <input
              name="position" value={form.position} onChange={handleChange}
              className="inp" placeholder="e.g. Fast Bowler"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Training level *</label>
            <select name="trainingLevel" value={form.trainingLevel} onChange={handleChange} className="inp">
              <option>Recreational</option>
              <option>Semi-Professional</option>
              <option>Elite</option>
            </select>
          </div>

          {/* ── Dynamic parameters from Admin settings ── */}
          {enabledParams.map(param => (
            <DynamicField
              key={param.key}
              param={param}
              value={form[param.key] ?? ''}
              onChange={val => setForm(prev => ({ ...prev, [param.key]: val }))}
            />
          ))}

          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-gray-500">Known injuries (optional)</label>
            <textarea
              name="knownInjuries" value={form.knownInjuries} onChange={handleChange}
              className="inp resize-none h-[72px]"
              placeholder="e.g. Previous left knee sprain (2024)"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          className="btn"
          onClick={() => {
            setFiles([])
            setForm({ name:'', age:'', sport:'General Fitness', position:'', trainingLevel:'Semi-Professional', knownInjuries:'' })
            setStep(1)
          }}
        >
          Clear
        </button>
        <button onClick={handleGenerate} className="btn btn-primary px-5 py-2.5 text-sm font-semibold">
          ⚡ Generate report
        </button>
      </div>

    </div>
  )
}

/* ── Dynamic field renderer ─────────────────────────────────── */
function DynamicField({ param, value, onChange }) {
  const label = (
    <label className="text-xs font-medium text-gray-500">
      {param.label} {param.required && <span className="text-red-500">*</span>}
    </label>
  )

  if (param.type === 'dropdown') {
    return (
      <div className="space-y-1">
        {label}
        <select
          className="inp"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {param.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  if (param.type === 'number') {
    return (
      <div className="space-y-1">
        {label}
        <input
          type="number" min="1"
          className="inp"
          placeholder={param.label}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    )
  }

  // default: text
  return (
    <div className="space-y-1 col-span-2">
      {label}
      <textarea
        className="inp resize-none h-[60px]"
        placeholder={param.label}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

function LoadingScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-pp-greenMid border-t-pp-green rounded-full animate-spin" />
      <p className="text-sm text-gray-600">{message}</p>
      <p className="text-xs text-gray-400">This usually takes 20–40 seconds</p>
    </div>
  )
}