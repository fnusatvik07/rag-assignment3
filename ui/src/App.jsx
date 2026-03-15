import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { CheckSquare, Square, Star, Zap, Shield, Brain, ArrowRight, Github, Clock, Trophy, BookOpen, Code2, Layers, ChevronDown, ExternalLink } from 'lucide-react'

/* ── data ─────────────────────────────────────────────────────────────── */

const LAYERS = [
  { color: '#3b82f6', label: 'Adaptive RAG', icon: Layers, desc: 'Routes each query to the cheapest tier that can answer it - LLM direct, vector store, or web search.' },
  { color: '#10b981', label: 'Corrective RAG', icon: Shield, desc: 'Grades every retrieved chunk for relevance. If irrelevant, rewrites the query and retries or falls back to web search.' },
  { color: '#f59e0b', label: 'Self-RAG', icon: Brain, desc: 'After generating an answer, checks for hallucinations and usefulness. Retries if the answer is grounded or off-topic.' },
]

const CHECKLIST = [
  { id: 1, text: 'Ingest documents', detail: 'Load ≥ 3 docs, chunk, embed, store in a vector DB', color: '#64748b' },
  { id: 2, text: 'Query Router', detail: 'Classify query as llm_direct / vectorstore / web_search via structured LLM output', color: '#3b82f6' },
  { id: 3, text: 'Retrieve Top-K', detail: 'Fetch relevant chunks from vector store', color: '#3b82f6' },
  { id: 4, text: 'Grade Documents', detail: 'Binary relevance score (yes/no) per chunk via LLM', color: '#10b981' },
  { id: 5, text: 'Query Rewriter', detail: 'If all chunks irrelevant, reformulate and retry', color: '#10b981' },
  { id: 6, text: 'Fallback', detail: 'Web search (Tavily) or LLM parametric knowledge if retry fails', color: '#10b981' },
  { id: 7, text: 'Generate Answer', detail: 'Synthesise context into a grounded response', color: '#64748b' },
  { id: 8, text: 'Hallucination Grader', detail: 'Is the answer supported by source documents?', color: '#f59e0b' },
  { id: 9, text: 'Answer Quality Grader', detail: 'Does the answer actually address the question?', color: '#f59e0b' },
  { id: 10, text: 'Loop Control', detail: 'Max 3 retry iterations — system must terminate gracefully', color: '#64748b' },
  { id: 11, text: 'End-to-End Demo', detail: 'Notebook or CLI covering all 3 pipeline branches with source citations', color: '#a855f7' },
]

const BONUS = [
  { pts: '+10', label: 'Advanced Chunking', desc: 'Semantic / hierarchical / proposition chunking with ablation table' },
  { pts: '+10', label: 'Semantic Cache', desc: 'Skip pipeline on similar past queries (cosine sim ≥ 0.92)' },
  { pts: '+10', label: 'Pipeline Tiers', desc: 'Tier 0 LLM only · Tier 1 basic RAG · Tier 2 multi-hop RAG' },
  { pts: '+15', label: 'Own Implementation', desc: 'No LangGraph - custom state machine, multi-agent, streaming' },
  { pts: '+15', label: 'Architecture Diagram', desc: 'Professional diagram with AWS icons, draw.io or Excalidraw' },
]

const GRADING = [
  { item: 'Document ingestion', pts: 15 },
  { item: 'Adaptive RAG router', pts: 20 },
  { item: 'Corrective RAG - grader', pts: 20 },
  { item: 'Corrective RAG - rewriter + fallback', pts: 30 },
  { item: 'Self-RAG - hallucination + quality graders', pts: 25 },
  { item: 'Graph assembly + loop control', pts: 30 },
  { item: 'Code quality', pts: 30 },
  { item: 'Evaluation (3+ test cases + metrics)', pts: 30 },
]

const RESOURCES = [
  { label: 'LangGraph Agentic RAG', url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_agentic_rag/' },
  { label: 'LangGraph CRAG', url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_crag/' },
  { label: 'LangGraph Self-RAG', url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_self_rag/' },
  { label: 'LangGraph Adaptive RAG', url: 'https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_adaptive_rag/' },
  { label: 'Self-RAG Paper', url: 'https://arxiv.org/abs/2310.11511' },
  { label: 'CRAG Paper', url: 'https://arxiv.org/abs/2401.15884' },
  { label: 'Adaptive RAG Paper', url: 'https://arxiv.org/abs/2403.14403' },
  { label: 'RAGAS Evaluation', url: 'https://docs.ragas.io' },
]

/* ── helpers ──────────────────────────────────────────────────────────── */

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }
const stagger = { show: { transition: { staggerChildren: 0.07 } } }

function Orb({ style }) {
  return <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.18, pointerEvents: 'none', ...style }} />
}

function SectionLabel({ children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#475569', display: 'block', marginBottom: 12 }}>
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
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
      {[['Days', d], ['Hrs', h], ['Min', m], ['Sec', s]].map(([l, v]) => (
        <div key={l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', minWidth: 72, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{String(v).padStart(2, '0')}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, letterSpacing: '0.1em' }}>{l}</div>
        </div>
      ))}
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
        borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s',
        background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
        opacity: done ? 0.6 : 1,
      }}
    >
      <div style={{ marginTop: 2, flexShrink: 0, color: done ? '#10b981' : '#334155' }}>
        {done ? <CheckSquare size={18} /> : <Square size={18} />}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: item.color, width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ textDecoration: done ? 'line-through' : 'none', color: done ? '#475569' : '#e2e8f0' }}>{item.text}</span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{item.detail}</div>
      </div>
    </motion.div>
  )
}

/* ── Pipeline viz ─────────────────────────────────────────────────────── */
function PipelineNode({ label, color, icon: Icon, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      viewport={{ once: true }}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`,
        border: `1px solid ${color}33`,
        borderRadius: 16, padding: '20px 24px', flex: 1, minWidth: 160,
        boxShadow: `0 0 30px ${color}15`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${color}15`, filter: 'blur(20px)' }} />
      <Icon size={22} color={color} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
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
        <Orb style={{ width: 600, height: 600, top: -200, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, #3b82f6, #a855f7)' }} />
        <Orb style={{ width: 400, height: 400, bottom: 0, left: -100, background: '#10b981' }} />
        <Orb style={{ width: 300, height: 300, bottom: 100, right: -50, background: '#f59e0b' }} />

        <motion.div style={{ y, opacity, textAlign: 'center', maxWidth: 800, position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 999, padding: '6px 16px', fontSize: 12, fontWeight: 600, color: '#3b82f6', marginBottom: 28, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Zap size={12} /> RAG Architect 2026 - Assignment 3
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 24 }}
          >
            Build an{' '}
            <span style={{ background: 'linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Agentic RAG
            </span>
            {' '}System
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, marginBottom: 40, maxWidth: 620, margin: '0 auto 40px' }}
          >
            Combine Self-RAG, Corrective RAG, and Adaptive RAG into a single pipeline that routes queries intelligently, fixes bad retrievals, and verifies its own answers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}
          >
            {[['200 pts', '#3b82f6'], ['+ 60 bonus', '#10b981'], ['Due Mar 22', '#f59e0b']].map(([t, c]) => (
              <span key={t} style={{ background: `${c}15`, border: `1px solid ${c}40`, borderRadius: 999, padding: '8px 20px', fontSize: 14, fontWeight: 700, color: c }}>
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
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 60 }}>
            <SectionLabel>The Challenge</SectionLabel>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>Three layers. One pipeline.</h2>
            <p style={{ color: '#64748b', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
              Standard RAG pipelines pass retrieved docs blindly to an LLM - no relevance check, no routing, no self-correction. You are fixing all three.
            </p>
          </motion.div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {LAYERS.map((l, i) => (
              <motion.div key={l.label} variants={fadeUp}
                whileHover={{ y: -6, boxShadow: `0 20px 60px ${l.color}20` }}
                style={{
                  flex: '1 1 280px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${l.color}30`,
                  borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden',
                  transition: 'box-shadow 0.3s, transform 0.3s',
                }}
              >
                <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: `${l.color}12`, filter: 'blur(30px)' }} />
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${l.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, border: `1px solid ${l.color}30` }}>
                  <l.icon size={22} color={l.color} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: l.color }}>{l.label}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{l.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── PIPELINE FLOW ───────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionLabel>Architecture</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em' }}>How the pipeline flows</h2>
        </motion.div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'User Query', color: '#64748b', icon: Code2 },
            null,
            { label: 'Semantic Cache', color: '#ef4444', icon: Zap },
            null,
            { label: 'Query Router', color: '#3b82f6', icon: Layers },
            null,
            { label: 'Retrieve + Grade', color: '#10b981', icon: Shield },
            null,
            { label: 'Generate + Reflect', color: '#f59e0b', icon: Brain },
            null,
            { label: 'Final Answer', color: '#a855f7', icon: Star },
          ].map((node, i) =>
            node === null ? (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: i * 0.05 }} viewport={{ once: true }}>
                <ArrowRight size={16} color="#334155" />
              </motion.div>
            ) : (
              <PipelineNode key={node.label} label={node.label} color={node.color} icon={node.icon} delay={i * 0.05} />
            )
          )}
        </div>
      </section>

      {/* ── CHECKLIST ─────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: 860, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 20 }}>
          <SectionLabel>Implementation</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>What you need to build</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 40 }}>Click each item to mark it done as you build.</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHECKLIST.map(item => <CheckItem key={item.id} item={item} />)}
        </motion.div>
      </section>

      {/* ── BONUS ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Optional</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Bonus points</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {BONUS.map((b, i) => (
            <motion.div key={b.label} variants={fadeUp} whileHover={{ y: -4 }}
              style={{ flex: '1 1 180px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, transition: 'transform 0.2s' }}
            >
              <div style={{ fontSize: 28, fontWeight: 900, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>{b.pts}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{b.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{b.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── GRADING ──────────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px 100px', maxWidth: 800, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Rubric</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em' }}>How you are graded</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {GRADING.map((g, i) => {
            const pct = (g.pts / 200) * 100
            return (
              <motion.div key={g.item} variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ flex: 1, fontSize: 14, color: '#94a3b8' }}>{g.item}</span>
                <div style={{ width: 120, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} viewport={{ once: true }} style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #3b82f6, #a855f7)' }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', minWidth: 32, textAlign: 'right' }}>{g.pts}</span>
              </motion.div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, fontSize: 16, fontWeight: 800, color: '#3b82f6' }}>Total: 200</div>
        </motion.div>
      </section>

      {/* ── SUBMISSION ───────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px 100px', maxWidth: 860, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Submission</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em' }}>What to hand in</h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Github size={16} color="#64748b" />
            <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>your-repo/</span>
          </div>
          {[
            ['README.md', 'Setup + framework choice + design decisions'],
            ['requirements.txt', 'All dependencies pinned'],
            ['.env.example', 'Required env vars - no real keys'],
            ['src/ingestion/', 'loader.py · chunker.py · indexer.py'],
            ['src/nodes/', 'router · retriever · grader · rewriter · generator · fallback'],
            ['src/graph.py', 'Full pipeline assembly'],
            ['notebooks/demo.ipynb', 'End-to-end demo covering all 3 branches'],
            ['evaluation/results.md', 'Test questions + scores'],
          ].map(([file, desc]) => (
            <div key={file} style={{ display: 'flex', gap: 16, padding: '12px 28px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#3b82f6', minWidth: 220 }}>{file}</span>
              <span style={{ fontSize: 12, color: '#475569' }}>{desc}</span>
            </div>
          ))}
        </motion.div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#475569' }}>
          Late policy: -10 pts per day. Email before the deadline for extensions.
        </motion.p>
      </section>

      {/* ── RESOURCES ────────────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px 120px', maxWidth: 860, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel>Resources</SectionLabel>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Papers & tutorials</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {RESOURCES.map((r) => (
            <motion.a key={r.label} variants={fadeUp} href={r.url} target="_blank" rel="noopener noreferrer"
              whileHover={{ y: -3, borderColor: 'rgba(59,130,246,0.4)' }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, textDecoration: 'none', color: '#94a3b8', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
            >
              <span>{r.label}</span>
              <ExternalLink size={12} color="#334155" />
            </motion.a>
          ))}
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 24px', textAlign: 'center', color: '#334155', fontSize: 13 }}>
        RAG Architect 2026 - Assignment 3 &nbsp;·&nbsp; Due March 22, 2026
      </footer>
    </div>
  )
}
