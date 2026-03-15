import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { CheckSquare, Square, Star, Zap, Shield, Brain, ArrowRight, Github, Code2, Layers, ChevronDown, ExternalLink } from 'lucide-react'

/* ── data ─────────────────────────────────────────────────────────────── */

const LAYERS = [
  { color: '#3b82f6', label: 'Adaptive RAG', icon: Layers, desc: 'Routes each query to the right tier — LLM direct, vector store, or web search — before retrieving anything.' },
  { color: '#10b981', label: 'Corrective RAG', icon: Shield, desc: 'Grades every retrieved chunk for relevance. If irrelevant, rewrites the query and retries or falls back to web search.' },
  { color: '#f59e0b', label: 'Self-RAG', icon: Brain, desc: 'After generating an answer, checks for hallucinations and usefulness. Retries up to 3× if the answer fails.' },
]

const CHECKLIST = [
  { id: 1,  text: 'Ingest documents',      detail: 'Load ≥ 3 docs, chunk, embed, store in a vector DB', color: '#64748b', layer: 'Base' },
  { id: 2,  text: 'Query Router',          detail: 'Classify query as llm_direct / vectorstore / web_search via structured LLM output', color: '#3b82f6', layer: 'Adaptive' },
  { id: 3,  text: 'Retrieve Top-K',        detail: 'Fetch relevant chunks from vector store', color: '#3b82f6', layer: 'Adaptive' },
  { id: 4,  text: 'Grade Documents',       detail: 'Binary relevance score (yes/no) per chunk via LLM', color: '#10b981', layer: 'Corrective' },
  { id: 5,  text: 'Query Rewriter',        detail: 'If all chunks irrelevant, reformulate and retry', color: '#10b981', layer: 'Corrective' },
  { id: 6,  text: 'Fallback',              detail: 'Web search (Tavily) or LLM parametric knowledge if retry fails', color: '#10b981', layer: 'Corrective' },
  { id: 7,  text: 'Generate Answer',       detail: 'Synthesise context into a grounded response', color: '#64748b', layer: 'Base' },
  { id: 8,  text: 'Hallucination Grader',  detail: 'Is the answer supported by source documents?', color: '#f59e0b', layer: 'Self-RAG' },
  { id: 9,  text: 'Answer Quality Grader', detail: 'Does the answer actually address the question?', color: '#f59e0b', layer: 'Self-RAG' },
  { id: 10, text: 'Loop Control',          detail: 'Max 3 retry iterations — system must terminate gracefully', color: '#64748b', layer: 'Base' },
  { id: 11, text: 'End-to-End Demo',       detail: 'Notebook or CLI covering all 3 pipeline branches with source citations', color: '#a855f7', layer: 'Demo' },
]

const BONUS = [
  { pts: '+10', label: 'Advanced Chunking',  desc: 'Semantic / hierarchical / proposition chunking with ablation table', color: '#3b82f6' },
  { pts: '+10', label: 'Semantic Cache',     desc: 'Skip pipeline on similar past queries (cosine sim ≥ 0.92)', color: '#10b981' },
  { pts: '+10', label: 'Pipeline Tiers',     desc: 'Tier 0 LLM only · Tier 1 basic RAG · Tier 2 multi-hop RAG', color: '#a855f7' },
  { pts: '+15', label: 'Own Implementation', desc: 'No LangGraph — custom state machine, multi-agent, streaming', color: '#f59e0b' },
  { pts: '+15', label: 'Architecture Diagram', desc: 'Professional diagram with AWS icons, draw.io or Excalidraw', color: '#ef4444' },
]

const GRADING = [
  { item: 'Document ingestion',                       pts: 15,  color: '#64748b' },
  { item: 'Adaptive RAG router',                      pts: 20,  color: '#3b82f6' },
  { item: 'Corrective RAG - grader',                  pts: 20,  color: '#10b981' },
  { item: 'Corrective RAG - rewriter + fallback',     pts: 30,  color: '#10b981' },
  { item: 'Self-RAG - hallucination + quality graders', pts: 25, color: '#f59e0b' },
  { item: 'Graph assembly + loop control',            pts: 30,  color: '#a855f7' },
  { item: 'Code quality',                             pts: 30,  color: '#3b82f6' },
  { item: 'Evaluation (3+ test cases + metrics)',     pts: 30,  color: '#ec4899' },
]

const RESOURCES = [
  { label: 'LangGraph Agentic RAG',  url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_agentic_rag/', tag: 'Tutorial' },
  { label: 'LangGraph CRAG',         url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_crag/', tag: 'Tutorial' },
  { label: 'LangGraph Self-RAG',     url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_self_rag/', tag: 'Tutorial' },
  { label: 'LangGraph Adaptive RAG', url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_adaptive_rag/', tag: 'Tutorial' },
  { label: 'Self-RAG Paper',         url: 'https://arxiv.org/abs/2310.11511', tag: 'Paper' },
  { label: 'CRAG Paper',             url: 'https://arxiv.org/abs/2401.15884', tag: 'Paper' },
  { label: 'Adaptive RAG Paper',     url: 'https://arxiv.org/abs/2403.14403', tag: 'Paper' },
  { label: 'RAGAS Evaluation',       url: 'https://docs.ragas.io', tag: 'Tool' },
]

/* ── helpers ──────────────────────────────────────────────────────────── */

const vin = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const VP = { once: true, amount: 0.05 }   // very low threshold — fires as soon as 5% is visible

function Orb({ style }) {
  return (
    <div style={{
      position: 'absolute', borderRadius: '50%',
      filter: 'blur(90px)', opacity: 0.14,
      pointerEvents: 'none', zIndex: 0,
      ...style,
    }} />
  )
}

function Label({ children, color = '#3b82f6' }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color, marginBottom: 14 }}>
      {children}
    </div>
  )
}

function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color, background: `${color}18`, border: `1px solid ${color}35`,
      borderRadius: 6, padding: '2px 8px', flexShrink: 0,
    }}>
      {children}
    </span>
  )
}

/* ── Gradient text helper ─────────────────────────────────────────────── */
function GradText({ children, from = '#3b82f6', via = '#a855f7', to = '#ec4899', style = {} }) {
  return (
    <span style={{
      background: `linear-gradient(135deg, ${from}, ${via}, ${to})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent',
      display: 'inline',
      ...style,
    }}>
      {children}
    </span>
  )
}

/* ── Countdown ─────────────────────────────────────────────────────────── */
function Countdown() {
  const deadline = new Date('2026-03-22T23:59:00')
  const [diff, setDiff] = useState(Math.max(0, deadline - Date.now()))
  useEffect(() => {
    const t = setInterval(() => setDiff(Math.max(0, deadline - Date.now())), 1000)
    return () => clearInterval(t)
  }, [])
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const urgent = d < 3

  return (
    <div>
      <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 14 }}>
        Time remaining
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[['Days', d], ['Hrs', h], ['Min', m], ['Sec', s]].map(([l, v]) => (
          <div key={l} style={{
            background: urgent ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 14, padding: '18px 24px', minWidth: 80, textAlign: 'center',
          }}>
            <div style={{ fontSize: 38, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: urgent ? '#ef4444' : '#f1f5f9' }}>
              {String(v).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── CheckItem ─────────────────────────────────────────────────────────── */
function CheckItem({ item, index }) {
  const [done, setDone] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={VP}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      onClick={() => setDone(d => !d)}
      whileHover={{ x: 4 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
        borderRadius: 12, cursor: 'pointer',
        background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
        opacity: done ? 0.5 : 1,
        transition: 'background 0.2s, border 0.2s, opacity 0.2s',
      }}
    >
      <div style={{ marginTop: 2, flexShrink: 0, color: done ? '#10b981' : '#334155' }}>
        {done ? <CheckSquare size={18} /> : <Square size={18} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ textDecoration: done ? 'line-through' : 'none', color: done ? '#475569' : '#e2e8f0' }}>{item.text}</span>
          <Tag color={item.color}>{item.layer}</Tag>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.6 }}>{item.detail}</div>
      </div>
    </motion.div>
  )
}

/* ── DiagramViewer ─────────────────────────────────────────────────────── */
const DIAGRAMS = [
  {
    id: 0, title: 'Target Architecture', subtitle: 'What you need to build — AWS-style pipeline', src: `${import.meta.env.BASE_URL}architecture_aws.png`,
    legend: [
      { color: '#ef4444', label: 'Cache' }, { color: '#3b82f6', label: 'Adaptive RAG' },
      { color: '#10b981', label: 'Corrective RAG' }, { color: '#f59e0b', label: 'Self-RAG' }, { color: '#a855f7', label: 'Direct LLM' },
    ],
    dark: true,
  },
  { id: 1, title: 'LangGraph Baseline', subtitle: 'Reference graph from LangGraph tutorial — extend this', src: `${import.meta.env.BASE_URL}langgraph-baseline.avif`, legend: null, dark: false },
]

function DiagramViewer() {
  const [active, setActive] = useState(0)
  const d = DIAGRAMS[active]
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
        {DIAGRAMS.map((tab, i) => (
          <button key={tab.id} onClick={() => setActive(i)} style={{
            padding: '10px 26px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            border: active === i ? 'none' : '1px solid rgba(255,255,255,0.1)',
            background: active === i ? 'linear-gradient(135deg, #3b82f6, #a855f7)' : 'rgba(255,255,255,0.04)',
            color: active === i ? '#fff' : '#64748b', transition: 'all 0.2s',
          }}>
            {tab.title}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={active}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, overflow: 'hidden' }}
        >
          <div style={{ padding: '18px 26px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0', marginBottom: 3 }}>{d.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{d.subtitle}</div>
            </div>
            {d.legend && (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {d.legend.map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                    {l.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding: 28, background: d.dark ? 'rgba(0,0,0,0.35)' : '#f8fafc', display: 'flex', justifyContent: 'center' }}>
            <img src={d.src} alt={d.title} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 10, display: 'block' }} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ── main ─────────────────────────────────────────────────────────────── */
export default function App() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', overflow: 'hidden' }}>
        {/* background orbs — zIndex 0, content is zIndex 1 */}
        <Orb style={{ width: 700, height: 700, top: -200, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, #3b82f6, #6d28d9)' }} />
        <Orb style={{ width: 420, height: 420, bottom: 0, left: -120, background: '#10b981' }} />
        <Orb style={{ width: 320, height: 320, bottom: 80, right: -60, background: '#f59e0b' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity, textAlign: 'center', maxWidth: 860, position: 'relative', zIndex: 1, width: '100%' }}>

          {/* course badge */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: 999, padding: '8px 22px', marginBottom: 36,
            }}>
              <Zap size={14} color="#3b82f6" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.06em' }}>
                RAG Architect 2026 — Assignment 3
              </span>
            </div>
          </motion.div>

          {/* main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1 }}
            style={{ fontSize: 'clamp(42px, 8vw, 90px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.035em', marginBottom: 28, color: '#f1f5f9' }}
          >
            Build an{' '}
            <GradText from="#3b82f6" via="#a855f7" to="#ec4899">Agentic RAG</GradText>
            {' '}System
          </motion.h1>

          {/* sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.75, maxWidth: 620, margin: '0 auto 44px' }}
          >
            Combine Self-RAG, Corrective RAG, and Adaptive RAG into one pipeline that routes queries, fixes bad retrievals, and verifies its own answers.
          </motion.p>

          {/* pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}
          >
            {[['200 pts base', '#3b82f6'], ['+60 bonus', '#10b981'], ['Due Mar 22, 2026', '#f59e0b']].map(([t, c]) => (
              <span key={t} style={{ background: `${c}14`, border: `1px solid ${c}40`, borderRadius: 999, padding: '10px 24px', fontSize: 15, fontWeight: 700, color: c }}>
                {t}
              </span>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Countdown />
          </motion.div>
        </motion.div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', color: '#334155', zIndex: 1 }}>
          <ChevronDown size={26} />
        </motion.div>
      </section>

      {/* ── THREE LAYERS ─────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} style={{ textAlign: 'center', marginBottom: 60 }}>
          <Label>The Challenge</Label>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 16 }}>
            Three layers.{' '}<GradText from="#3b82f6" via="#10b981" to="#f59e0b">One pipeline.</GradText>
          </h2>
          <p style={{ color: '#64748b', maxWidth: 560, margin: '0 auto', lineHeight: 1.75, fontSize: 15 }}>
            Standard RAG blindly passes retrieved docs to an LLM — no routing, no relevance check, no self-correction. You are fixing all three.
          </p>
        </motion.div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {LAYERS.map((l, i) => (
            <motion.div key={l.label}
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, boxShadow: `0 28px 60px ${l.color}20` }}
              style={{
                flex: '1 1 280px',
                background: `linear-gradient(145deg, ${l.color}0a, rgba(255,255,255,0.01))`,
                border: `1px solid ${l.color}28`, borderRadius: 24, padding: '36px 30px',
                position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.3s, transform 0.3s',
              }}
            >
              <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: `${l.color}0e`, filter: 'blur(40px)' }} />
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${l.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: `1px solid ${l.color}28` }}>
                <l.icon size={24} color={l.color} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: l.color }}>{l.label}</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.75 }}>{l.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── ARCHITECTURE DIAGRAMS ────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} style={{ textAlign: 'center', marginBottom: 44 }}>
          <Label color="#a855f7">Architecture</Label>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>Pipeline diagrams</h2>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            The target architecture you need to build, and the LangGraph baseline to extend from.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} transition={{ delay: 0.1 }}>
          <DiagramViewer />
        </motion.div>
      </section>

      {/* ── PIPELINE FLOW ───────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} style={{ textAlign: 'center', marginBottom: 44 }}>
          <Label color="#10b981">Flow</Label>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 38px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Step by step</h2>
        </motion.div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'User Query',        color: '#64748b', icon: Code2,   sub: 'Input' },
            { label: 'Semantic Cache',    color: '#ef4444', icon: Zap,     sub: 'Bonus' },
            { label: 'Query Router',      color: '#3b82f6', icon: Layers,  sub: 'Adaptive' },
            { label: 'Retrieve + Grade',  color: '#10b981', icon: Shield,  sub: 'Corrective' },
            { label: 'Generate + Reflect',color: '#f59e0b', icon: Brain,   sub: 'Self-RAG' },
            { label: 'Final Answer',      color: '#a855f7', icon: Star,    sub: 'Output' },
          ].map((node, i, arr) => (
            <div key={node.label} style={{ display: 'flex', alignItems: 'center' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={VP} transition={{ delay: i * 0.07, duration: 0.4 }}
                whileHover={{ y: -5 }}
                style={{
                  background: `linear-gradient(145deg, ${node.color}0e, rgba(255,255,255,0.01))`,
                  border: `1px solid ${node.color}30`, borderRadius: 16,
                  padding: '18px 18px', width: 138, textAlign: 'center',
                  boxShadow: `0 0 24px ${node.color}0d`,
                }}
              >
                <node.icon size={20} color={node.color} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: node.color, marginBottom: 3 }}>{node.label}</div>
                <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{node.sub}</div>
              </motion.div>
              {i < arr.length - 1 && (
                <div style={{ padding: '0 4px' }}>
                  <ArrowRight size={14} color="#2d3748" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CHECKLIST ─────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 860, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} style={{ textAlign: 'center', marginBottom: 48 }}>
          <Label color="#3b82f6">Implementation</Label>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>What you need to build</h2>
          <p style={{ color: '#64748b', fontSize: 14 }}>Click each item as you complete it.</p>
        </motion.div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHECKLIST.map((item, i) => <CheckItem key={item.id} item={item} index={i} />)}
        </div>
      </section>

      {/* ── BONUS ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} style={{ textAlign: 'center', marginBottom: 52 }}>
          <Label color="#f59e0b">Optional</Label>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Bonus points{' '}<GradText from="#f59e0b" via="#ef4444" to="#a855f7">+60</GradText>
          </h2>
        </motion.div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {BONUS.map((b, i) => (
            <motion.div key={b.label}
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              whileHover={{ y: -6 }}
              style={{
                flex: '1 1 180px',
                background: `linear-gradient(145deg, ${b.color}0b, rgba(255,255,255,0.01))`,
                border: `1px solid ${b.color}25`, borderRadius: 20, padding: '28px 24px',
                transition: 'transform 0.25s',
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 12 }}>
                <GradText from={b.color} via={b.color} to={`${b.color}88`}>{b.pts}</GradText>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#e2e8f0' }}>{b.label}</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65 }}>{b.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── GRADING ──────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 800, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} style={{ textAlign: 'center', marginBottom: 48 }}>
          <Label color="#a855f7">Rubric</Label>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 800, letterSpacing: '-0.02em' }}>How you are graded</h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP}
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}
        >
          {GRADING.map((g, i) => (
            <div key={g.item} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: i < GRADING.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ flex: 1, fontSize: 14, color: '#94a3b8' }}>{g.item}</span>
              <div style={{ width: 110, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
                <motion.div
                  initial={{ width: 0 }} whileInView={{ width: `${(g.pts / 200) * 100}%` }}
                  viewport={VP} transition={{ duration: 0.9, delay: i * 0.06 }}
                  style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${g.color}, ${g.color}77)` }}
                />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: g.color, minWidth: 28, textAlign: 'right' }}>{g.pts}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 900 }}><GradText from="#3b82f6" to="#a855f7">200 pts</GradText></span>
          </div>
        </motion.div>
      </section>

      {/* ── SUBMISSION ───────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 860, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} style={{ textAlign: 'center', marginBottom: 48 }}>
          <Label color="#10b981">Submission</Label>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 800, letterSpacing: '-0.02em' }}>What to hand in</h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP}
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Github size={15} color="#64748b" />
            <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace' }}>your-repo/</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>GitHub repo — public or shared</span>
          </div>
          {[
            ['README.md', 'Framework choice · chunking strategy · design decisions', '#3b82f6'],
            ['requirements.txt', 'All dependencies pinned', '#64748b'],
            ['.env.example', 'Required env vars — no real keys', '#64748b'],
            ['src/ingestion/', 'loader.py · chunker.py · indexer.py', '#10b981'],
            ['src/nodes/', 'router · retriever · grader · rewriter · generator · fallback', '#10b981'],
            ['src/graph.py', 'Full pipeline assembly', '#10b981'],
            ['notebooks/demo.ipynb', 'End-to-end demo covering all 3 branches', '#f59e0b'],
            ['evaluation/results.md', '3+ test questions + scores + metrics', '#a855f7'],
          ].map(([file, desc, color]) => (
            <div key={file} style={{ display: 'flex', gap: 16, padding: '13px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color, minWidth: 210, flexShrink: 0 }}>{file}</span>
              <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </motion.div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#475569' }}>
          Late policy: -10 pts per day. Email before the deadline for extensions.
        </p>
      </section>

      {/* ── RESOURCES ────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 120px', maxWidth: 860, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} style={{ textAlign: 'center', marginBottom: 48 }}>
          <Label color="#ec4899">Resources</Label>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Papers & tutorials</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {RESOURCES.map((r, i) => {
            const tagColor = r.tag === 'Paper' ? '#f59e0b' : r.tag === 'Tool' ? '#10b981' : '#3b82f6'
            return (
              <motion.a key={r.label}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP}
                transition={{ delay: i * 0.05 }}
                href={r.url} target="_blank" rel="noopener noreferrer"
                whileHover={{ y: -3 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, textDecoration: 'none', transition: 'border-color 0.2s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Tag color={tagColor}>{r.tag}</Tag>
                  <ExternalLink size={11} color="#334155" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', lineHeight: 1.4 }}>{r.label}</span>
              </motion.a>
            )
          })}
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px', textAlign: 'center', fontSize: 13, color: '#334155' }}>
        <GradText from="#3b82f6" to="#a855f7"><strong>RAG Architect 2026</strong></GradText>
        &nbsp;·&nbsp; Assignment 3 &nbsp;·&nbsp; Due March 22, 2026
      </footer>
    </div>
  )
}
