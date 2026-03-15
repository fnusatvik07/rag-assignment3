import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { CheckSquare, Square, Star, Zap, Shield, Brain, ArrowRight, Github, Clock, Trophy, BookOpen, Code2, Layers, ChevronDown, ExternalLink, Image } from 'lucide-react'

/* ── data ─────────────────────────────────────────────────────────────── */

const LAYERS = [
  { color: '#3b82f6', label: 'Adaptive RAG', icon: Layers, desc: 'Routes each query to the right tier — LLM direct, vector store, or web search — before retrieving anything.' },
  { color: '#10b981', label: 'Corrective RAG', icon: Shield, desc: 'Grades every retrieved chunk for relevance. If irrelevant, rewrites the query and retries, or falls back to web search.' },
  { color: '#f59e0b', label: 'Self-RAG', icon: Brain, desc: 'After generating an answer, checks for hallucinations and usefulness. Retries up to 3× if the answer fails.' },
]

const CHECKLIST = [
  { id: 1, text: 'Ingest documents', detail: 'Load ≥ 3 docs, chunk, embed, store in a vector DB', color: '#64748b', layer: 'Base' },
  { id: 2, text: 'Query Router', detail: 'Classify query as llm_direct / vectorstore / web_search via structured LLM output', color: '#3b82f6', layer: 'Adaptive' },
  { id: 3, text: 'Retrieve Top-K', detail: 'Fetch relevant chunks from vector store', color: '#3b82f6', layer: 'Adaptive' },
  { id: 4, text: 'Grade Documents', detail: 'Binary relevance score (yes/no) per chunk via LLM', color: '#10b981', layer: 'Corrective' },
  { id: 5, text: 'Query Rewriter', detail: 'If all chunks irrelevant, reformulate and retry', color: '#10b981', layer: 'Corrective' },
  { id: 6, text: 'Fallback', detail: 'Web search (Tavily) or LLM parametric knowledge if retry fails', color: '#10b981', layer: 'Corrective' },
  { id: 7, text: 'Generate Answer', detail: 'Synthesise context into a grounded response', color: '#64748b', layer: 'Base' },
  { id: 8, text: 'Hallucination Grader', detail: 'Is the answer supported by source documents?', color: '#f59e0b', layer: 'Self' },
  { id: 9, text: 'Answer Quality Grader', detail: 'Does the answer actually address the question?', color: '#f59e0b', layer: 'Self' },
  { id: 10, text: 'Loop Control', detail: 'Max 3 retry iterations — system must terminate gracefully', color: '#64748b', layer: 'Base' },
  { id: 11, text: 'End-to-End Demo', detail: 'Notebook or CLI covering all 3 pipeline branches with source citations', color: '#a855f7', layer: 'Demo' },
]

const BONUS = [
  { pts: '+10', label: 'Advanced Chunking', desc: 'Semantic / hierarchical / proposition chunking with ablation table', color: '#3b82f6' },
  { pts: '+10', label: 'Semantic Cache', desc: 'Skip pipeline on similar past queries (cosine sim ≥ 0.92)', color: '#10b981' },
  { pts: '+10', label: 'Pipeline Tiers', desc: 'Tier 0 LLM only · Tier 1 basic RAG · Tier 2 multi-hop RAG', color: '#a855f7' },
  { pts: '+15', label: 'Own Implementation', desc: 'No LangGraph — custom state machine, multi-agent, streaming', color: '#f59e0b' },
  { pts: '+15', label: 'Architecture Diagram', desc: 'Professional diagram with AWS icons, draw.io or Excalidraw', color: '#ef4444' },
]

const GRADING = [
  { item: 'Document ingestion', pts: 15, color: '#64748b' },
  { item: 'Adaptive RAG router', pts: 20, color: '#3b82f6' },
  { item: 'Corrective RAG - grader', pts: 20, color: '#10b981' },
  { item: 'Corrective RAG - rewriter + fallback', pts: 30, color: '#10b981' },
  { item: 'Self-RAG - hallucination + quality graders', pts: 25, color: '#f59e0b' },
  { item: 'Graph assembly + loop control', pts: 30, color: '#a855f7' },
  { item: 'Code quality', pts: 30, color: '#3b82f6' },
  { item: 'Evaluation (3+ test cases + metrics)', pts: 30, color: '#ec4899' },
]

const RESOURCES = [
  { label: 'LangGraph Agentic RAG', url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_agentic_rag/', tag: 'Tutorial' },
  { label: 'LangGraph CRAG', url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_crag/', tag: 'Tutorial' },
  { label: 'LangGraph Self-RAG', url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_self_rag/', tag: 'Tutorial' },
  { label: 'LangGraph Adaptive RAG', url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_adaptive_rag/', tag: 'Tutorial' },
  { label: 'Self-RAG Paper', url: 'https://arxiv.org/abs/2310.11511', tag: 'Paper' },
  { label: 'CRAG Paper', url: 'https://arxiv.org/abs/2401.15884', tag: 'Paper' },
  { label: 'Adaptive RAG Paper', url: 'https://arxiv.org/abs/2403.14403', tag: 'Paper' },
  { label: 'RAGAS Evaluation', url: 'https://docs.ragas.io', tag: 'Tool' },
]

/* ── helpers ──────────────────────────────────────────────────────────── */

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { show: { transition: { staggerChildren: 0.07 } } }

function Orb({ style }) {
  return <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(90px)', opacity: 0.15, pointerEvents: 'none', ...style }} />
}

function SectionLabel({ children, color = '#475569' }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color, display: 'block', marginBottom: 14 }}>
      {children}
    </span>
  )
}

function Tag({ children, color }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 6, padding: '2px 8px' }}>
      {children}
    </span>
  )
}

/* ── Countdown ─────────────────────────────────────────────────────────── */
function Countdown() {
  const deadline = new Date('2026-03-22T23:59:00')
  const [diff, setDiff] = useState(deadline - Date.now())
  useEffect(() => { const t = setInterval(() => setDiff(deadline - Date.now()), 1000); return () => clearInterval(t) }, [])
  const d = Math.max(0, Math.floor(diff / 86400000))
  const h = Math.max(0, Math.floor((diff % 86400000) / 3600000))
  const m = Math.max(0, Math.floor((diff % 3600000) / 60000))
  const s = Math.max(0, Math.floor((diff % 60000) / 1000))
  const isUrgent = d < 3
  return (
    <div>
      <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>Time remaining</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[['Days', d], ['Hrs', h], ['Min', m], ['Sec', s]].map(([l, v]) => (
          <div key={l} style={{
            background: isUrgent ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 14, padding: '18px 22px', minWidth: 76, textAlign: 'center',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: isUrgent ? '#ef4444' : '#f1f5f9' }}>
              {String(v).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── CheckItem ─────────────────────────────────────────────────────────── */
function CheckItem({ item }) {
  const [done, setDone] = useState(false)
  return (
    <motion.div
      variants={fadeUp}
      onClick={() => setDone(d => !d)}
      whileHover={{ x: 4 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
        borderRadius: 12, cursor: 'pointer',
        background: done ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
        opacity: done ? 0.55 : 1,
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
function DiagramViewer() {
  const [active, setActive] = useState(0)
  const diagrams = [
    {
      id: 0,
      title: 'Target Architecture',
      subtitle: 'What you need to build — AWS-style pipeline',
      src: '/architecture_aws.png',
      legend: [
        { color: '#ef4444', label: 'Cache' },
        { color: '#3b82f6', label: 'Adaptive RAG' },
        { color: '#10b981', label: 'Corrective RAG' },
        { color: '#f59e0b', label: 'Self-RAG' },
        { color: '#a855f7', label: 'Direct LLM' },
      ],
    },
    {
      id: 1,
      title: 'LangGraph Baseline',
      subtitle: 'Reference graph from the LangGraph tutorial — extend this',
      src: '/langgraph-baseline.avif',
      legend: null,
    },
  ]
  const d = diagrams[active]

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
        {diagrams.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActive(i)}
            style={{
              padding: '8px 22px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: active === i ? 'linear-gradient(135deg, #3b82f6, #a855f7)' : 'rgba(255,255,255,0.04)',
              color: active === i ? '#fff' : '#64748b',
              transition: 'all 0.2s',
              outline: active === i ? '0' : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24, overflow: 'hidden',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* header */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0', marginBottom: 2 }}>{d.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{d.subtitle}</div>
            </div>
            {d.legend && (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {d.legend.map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                    {l.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* image */}
          <div style={{ padding: 28, background: active === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.97)', display: 'flex', justifyContent: 'center' }}>
            <img
              src={d.src}
              alt={d.title}
              style={{ maxWidth: '100%', borderRadius: 12, display: 'block', maxHeight: 480, objectFit: 'contain' }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/* ── main ─────────────────────────────────────────────────────────────── */
export default function App() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 80])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', overflow: 'hidden' }}>
        <Orb style={{ width: 700, height: 700, top: -250, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, #3b82f6, #a855f7)' }} />
        <Orb style={{ width: 450, height: 450, bottom: -50, left: -100, background: '#10b981' }} />
        <Orb style={{ width: 350, height: 350, bottom: 100, right: -80, background: '#f59e0b' }} />

        <motion.div style={{ y, opacity, textAlign: 'center', maxWidth: 840, position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 999, padding: '6px 18px', fontSize: 12, fontWeight: 700, color: '#3b82f6',
              marginBottom: 32, letterSpacing: '0.1em', textTransform: 'uppercase',
              backdropFilter: 'blur(10px)',
            }}>
              <Zap size={12} /> RAG Architect 2026 &nbsp;·&nbsp; Assignment 3
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            style={{ fontSize: 'clamp(44px, 8vw, 88px)', fontWeight: 900, lineHeight: 1.03, letterSpacing: '-0.035em', marginBottom: 28 }}
          >
            Build an{' '}
            <span style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Agentic RAG
            </span>
            <br />System
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.75, marginBottom: 44, maxWidth: 620, margin: '0 auto 44px' }}
          >
            Combine Self-RAG, Corrective RAG, and Adaptive RAG into a single pipeline that routes queries intelligently, fixes bad retrievals, and verifies its own answers before returning them.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}
          >
            {[['200 pts base', '#3b82f6'], ['+60 bonus', '#10b981'], ['Due Mar 22, 2026', '#f59e0b']].map(([t, c]) => (
              <span key={t} style={{
                background: `${c}12`, border: `1px solid ${c}35`,
                borderRadius: 999, padding: '9px 22px', fontSize: 14, fontWeight: 700, color: c,
                backdropFilter: 'blur(8px)',
              }}>
                {t}
              </span>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Countdown />
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', color: '#334155' }}
        >
          <ChevronDown size={24} />
        </motion.div>
      </section>

      {/* ── WHAT TO BUILD ────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 64 }}>
            <SectionLabel>The Challenge</SectionLabel>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 16 }}>Three layers. One pipeline.</h2>
            <p style={{ color: '#64748b', maxWidth: 560, margin: '0 auto', lineHeight: 1.75, fontSize: 15 }}>
              Standard RAG blindly passes retrieved docs to an LLM — no routing, no relevance check, no self-correction. You are fixing all three.
            </p>
          </motion.div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {LAYERS.map((l) => (
              <motion.div key={l.label} variants={fadeUp}
                whileHover={{ y: -8, boxShadow: `0 24px 64px ${l.color}22` }}
                style={{
                  flex: '1 1 280px',
                  background: `linear-gradient(135deg, ${l.color}08 0%, rgba(255,255,255,0.01) 100%)`,
                  border: `1px solid ${l.color}25`,
                  borderRadius: 24, padding: '36px 32px', position: 'relative', overflow: 'hidden',
                  transition: 'box-shadow 0.35s, transform 0.35s',
                }}
              >
                <div style={{ position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: '50%', background: `${l.color}10`, filter: 'blur(40px)' }} />
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: `${l.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, border: `1px solid ${l.color}25`,
                }}>
                  <l.icon size={24} color={l.color} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: l.color, letterSpacing: '-0.01em' }}>{l.label}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.75 }}>{l.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── ARCHITECTURE DIAGRAMS ────────────────────────────────────── */}
      <section style={{ padding: '20px 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel color="#a855f7">Architecture</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>Pipeline diagrams</h2>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            The target architecture you need to implement, and the LangGraph baseline to extend from.
          </p>
        </motion.div>
        <DiagramViewer />
      </section>

      {/* ── PIPELINE FLOW ───────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 44 }}>
          <SectionLabel>Flow</SectionLabel>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Step by step</h2>
        </motion.div>

        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'User Query', color: '#64748b', icon: Code2, sub: 'Input' },
            { label: 'Semantic Cache', color: '#ef4444', icon: Zap, sub: 'Bonus' },
            { label: 'Query Router', color: '#3b82f6', icon: Layers, sub: 'Adaptive' },
            { label: 'Retrieve + Grade', color: '#10b981', icon: Shield, sub: 'Corrective' },
            { label: 'Generate + Reflect', color: '#f59e0b', icon: Brain, sub: 'Self-RAG' },
            { label: 'Final Answer', color: '#a855f7', icon: Star, sub: 'Output' },
          ].map((node, i, arr) => (
            <div key={node.label} style={{ display: 'flex', alignItems: 'center' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                style={{
                  background: `linear-gradient(135deg, ${node.color}10, rgba(255,255,255,0.01))`,
                  border: `1px solid ${node.color}30`,
                  borderRadius: 16, padding: '18px 20px', width: 140, textAlign: 'center',
                  boxShadow: `0 0 30px ${node.color}10`,
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, borderRadius: '50%', background: `${node.color}12`, filter: 'blur(16px)' }} />
                <node.icon size={20} color={node.color} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: node.color, marginBottom: 3 }}>{node.label}</div>
                <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{node.sub}</div>
              </motion.div>
              {i < arr.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: i * 0.08 + 0.2 }} viewport={{ once: true }}
                  style={{ padding: '0 6px', flexShrink: 0 }}
                >
                  <ArrowRight size={14} color="#2d3748" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CHECKLIST ─────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 860, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Implementation</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>What you need to build</h2>
          <p style={{ color: '#64748b', fontSize: 14 }}>Click each item as you complete it.</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHECKLIST.map(item => <CheckItem key={item.id} item={item} />)}
        </motion.div>
      </section>

      {/* ── BONUS ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel color="#f59e0b">Optional</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Bonus points</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {BONUS.map((b) => (
            <motion.div key={b.label} variants={fadeUp} whileHover={{ y: -6, boxShadow: `0 20px 40px ${b.color}15` }}
              style={{
                flex: '1 1 180px',
                background: `linear-gradient(135deg, ${b.color}08, rgba(255,255,255,0.01))`,
                border: `1px solid ${b.color}20`,
                borderRadius: 20, padding: '28px 24px', transition: 'all 0.25s',
              }}
            >
              <div style={{
                fontSize: 32, fontWeight: 900, marginBottom: 12,
                background: `linear-gradient(135deg, ${b.color}, ${b.color}88)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{b.pts}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#e2e8f0' }}>{b.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.65 }}>{b.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── GRADING ──────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 800, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Rubric</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em' }}>How you are graded</h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' }}
        >
          {GRADING.map((g, i) => {
            const pct = (g.pts / 200) * 100
            return (
              <div key={g.item} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: i < GRADING.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ flex: 1, fontSize: 14, color: '#94a3b8' }}>{g.item}</span>
                <div style={{ width: 110, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0 }}>
                  <motion.div
                    initial={{ width: 0 }} whileInView={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, delay: i * 0.06, ease: 'easeOut' }}
                    viewport={{ once: true }}
                    style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${g.color}, ${g.color}88)` }}
                  />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: g.color, minWidth: 28, textAlign: 'right' }}>{g.pts}</span>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 900, background: 'linear-gradient(135deg, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>200 pts</span>
          </div>
        </motion.div>
      </section>

      {/* ── SUBMISSION ───────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 860, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Submission</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em' }}>What to hand in</h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' }}
        >
          <div style={{ padding: '18px 26px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Github size={15} color="#64748b" />
            <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace' }}>your-repo/</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>GitHub repo link — public or shared</span>
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
            <div key={file} style={{ display: 'flex', gap: 16, padding: '13px 26px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color, minWidth: 210 }}>{file}</span>
              <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </motion.div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#475569' }}
        >
          Late policy: -10 pts per day. Email before the deadline for extensions.
        </motion.p>
      </section>

      {/* ── RESOURCES ────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 120px', maxWidth: 860, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel>Resources</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Papers & tutorials</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}
        >
          {RESOURCES.map((r) => (
            <motion.a key={r.label} variants={fadeUp} href={r.url} target="_blank" rel="noopener noreferrer"
              whileHover={{ y: -3 }}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 18px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, textDecoration: 'none', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Tag color={r.tag === 'Paper' ? '#f59e0b' : r.tag === 'Tool' ? '#10b981' : '#3b82f6'}>{r.tag}</Tag>
                <ExternalLink size={11} color="#334155" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', lineHeight: 1.4 }}>{r.label}</span>
            </motion.a>
          ))}
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 24px', textAlign: 'center', color: '#334155', fontSize: 13 }}>
        <span style={{ background: 'linear-gradient(135deg, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>
          RAG Architect 2026
        </span>
        &nbsp;·&nbsp; Assignment 3 &nbsp;·&nbsp; Due March 22, 2026
      </footer>
    </div>
  )
}
