import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

function splitTags(tags) {
  if (!tags) return []
  // backend 的 tags 是一个字符串，格式不固定，这里做一个宽松切分
  return String(tags)
    .split(/[,;|/]+/g)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function ThemeControls() {
  const COLOR_PRESETS = {
    blue:   { label: '蓝',   primary: '#2563eb', accent: '#06b6d4' },
    purple: { label: '紫',   primary: '#7c3aed', accent: '#ec4899' },
    green:  { label: '绿',   primary: '#16a34a', accent: '#22c55e' },
    orange: { label: '橙',   primary: '#f59e0b', accent: '#f97316' },
    red:    { label: '红',   primary: '#ef4444', accent: '#f43f5e' },
    teal:   { label: '青',   primary: '#14b8a6', accent: '#06b6d4' },
  }

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('theme_mode') || 'light' } catch { return 'light' }
  })
  const [color, setColor] = useState(() => {
    try { return localStorage.getItem('theme_color') || 'blue' } catch { return 'blue' }
  })

  function resolveMode(m) {
    if (m === 'auto') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return m
  }

  function applyTheme(nextMode = mode, nextColor = color) {
    const resolved = resolveMode(nextMode)
    document.documentElement.setAttribute('data-theme', resolved)

    const preset = COLOR_PRESETS[nextColor] || COLOR_PRESETS.blue
    document.documentElement.style.setProperty('--primary', preset.primary)
    document.documentElement.style.setProperty('--accent', preset.accent)

    try {
      localStorage.setItem('theme_mode', nextMode)
      localStorage.setItem('theme_color', nextColor)
    } catch { /* ignore */ }
  }

  // apply on mount / change
  useEffect(() => {
    applyTheme(mode, color)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, color])

  // if mode=auto, follow system theme changes
  useEffect(() => {
    if (mode !== 'auto' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('auto', color)

    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, color])

  // ESC closes modal
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const resolvedNow = resolveMode(mode)

  return (
    <>
      <button
        className="btn btn-sm btn-ghost text-white hover:bg-white/10"
        title="切换暗黑模式"
        onClick={() => setMode(resolvedNow === 'dark' ? 'light' : 'dark')}
      >
        {resolvedNow === 'dark' ? '☀️' : '🌙'}
      </button>

      <button
        className="btn btn-sm btn-ghost text-white hover:bg-white/10"
        title="主题设置"
        onClick={() => setOpen(true)}
      >
        🎨
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-base-content"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-xl rounded-2xl bg-base-100 shadow-xl border border-base-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <h3 className="text-lg font-semibold">主题设置</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)} aria-label="关闭">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div>
                <div className="font-semibold mb-3">显示模式</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { k: 'light', label: '亮色', icon: '☀️' },
                    { k: 'dark', label: '暗色', icon: '🌙' },
                    { k: 'auto', label: '自动', icon: '✨' },
                  ].map((x) => (
                    <button
                      key={x.k}
                      className={
                        'btn btn-sm ' +
                        (mode === x.k ? 'btn-primary' : 'btn-outline')
                      }
                      onClick={() => setMode(x.k)}
                    >
                      <span className="mr-1">{x.icon}</span>{x.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs opacity-70 mt-2">
                  当前生效：<span className="font-medium">{resolvedNow === 'dark' ? '暗色' : '亮色'}</span>
                  {mode === 'auto' ? '（跟随系统）' : ''}
                </p>
              </div>

              <div>
                <div className="font-semibold mb-3">主题颜色</div>
                <div className="flex flex-wrap gap-3 items-center">
                  {Object.entries(COLOR_PRESETS).map(([k, v]) => (
                    <button
                      key={k}
                      className={
                        'h-9 w-9 rounded-full border-2 ' +
                        (color === k ? 'border-base-content ring-2 ring-base-content/20' : 'border-base-300')

                      }
                      style={{ background: `linear-gradient(135deg, ${v.primary}, ${v.accent})` }}
                      title={v.label}
                      onClick={() => setColor(k)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setMode('light')
                    setColor('blue')
                  }}
                >
                  恢复默认
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => setOpen(false)}>
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


function SkeletonCard() {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2 mt-2" />
        <div className="flex gap-2 mt-4">
          <div className="skeleton h-6 w-16" />
          <div className="skeleton h-6 w-20" />
          <div className="skeleton h-6 w-12" />
        </div>
      </div>
    </div>
  )
}

function BookCard({ item, onLike }) {
  const tags = useMemo(() => splitTags(item.tags || item.subject), [item.tags, item.subject])

  return (
    <div className="card bg-base-100 shadow-sm hover:shadow-md transition">
      <div className="card-body">
        <div className="flex items-start gap-3">
          <div className="avatar placeholder">
            <div className="bg-base-200 text-base-content/60 rounded-xl w-12">
              <span className="text-xs">BOOK</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{item.title}</h3>
            <p className="text-sm opacity-70 truncate">{item.author || 'Unknown author'}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {item.year ? <span className="badge badge-ghost">{item.year}</span> : null}
              {item.availability ? (
                <span className={`badge ${String(item.availability).toLowerCase().includes('avail') ? 'badge-success' : 'badge-outline'}`}>
                  {item.availability}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {item.abstract ? (
          <p className="text-sm opacity-80 mt-3 max-h-16 overflow-hidden">{item.abstract}</p>
        ) : null}

        {tags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t} className="badge badge-outline">{t}</span>
            ))}
          </div>
        ) : null}

        <div className="card-actions justify-end mt-4">
          <button className="btn btn-sm btn-primary" onClick={onLike}>
            我感兴趣
          </button>
        </div>
      </div>
    </div>
  )
}

function RecCard({ rec, onLike }) {
  return (
    <div className="card bg-base-100 shadow-sm hover:shadow-md transition">
      <div className="card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate">{rec.title}</h3>
            <p className="text-sm opacity-70 truncate">{rec.author || 'Unknown author'}</p>
          </div>
          <div className="tooltip shrink-0" data-tip="模型打分（越高越相关）">
            <span className="badge badge-outline badge-info badge-sm whitespace-nowrap font-medium">score {Number(rec.score).toFixed(3)}</span>
          </div>
        </div>

        {Array.isArray(rec.reason) && rec.reason.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {rec.reason.slice(0, 8).map((t, i) => (
              <span key={`${t}-${i}`} className="badge badge-outline">{t}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm opacity-70 mt-3">暂无解释标签</p>
        )}

        <div className="card-actions justify-end mt-4">
          <button className="btn btn-sm btn-primary" onClick={onLike}>我感兴趣</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [uid, setUid] = useState('u123')
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('recommend') // recommend | search

  const [items, setItems] = useState([])
  const [recs, setRecs] = useState([])

  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [errSearch, setErrSearch] = useState('')
  const [errRecs, setErrRecs] = useState('')

  const [toast, setToast] = useState('')

  async function doSearch() {
    setTab('search')
    setErrSearch('')
    setLoadingSearch(true)
    try {
      const { data } = await axios.get('/api/search', { params: { q, limit: 12 } })
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setErrSearch(e?.response?.data?.detail || e?.message || '搜索失败')
      setItems([])
    } finally {
      setLoadingSearch(false)
    }
  }

  async function doRecommend() {
    setTab('recommend')
    setErrRecs('')
    setLoadingRecs(true)
    try {
      const { data } = await axios.get('/api/recommend', { params: { uid, q, k: 12 } })
      setRecs(Array.isArray(data) ? data : [])
    } catch (e) {
      setErrRecs(e?.response?.data?.detail || e?.message || '获取推荐失败')
      setRecs([])
    } finally {
      setLoadingRecs(false)
    }
  }

  async function sendFeedback(itemId, action = 'click') {
    try {
      await axios.post('/api/feedback', { uid, item_id: itemId, action })
      setToast('已记录反馈：👍')
      window.clearTimeout(sendFeedback._t)
      sendFeedback._t = window.setTimeout(() => setToast(''), 1800)
    } catch {
      setToast('反馈提交失败（后端未启动？）')
      window.clearTimeout(sendFeedback._t)
      sendFeedback._t = window.setTimeout(() => setToast(''), 1800)
    }
  }

  useEffect(() => {
    // 首屏拉取一次推荐
    doRecommend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeCount = tab === 'search' ? items.length : recs.length
  const isLoading = tab === 'search' ? loadingSearch : loadingRecs
  const errorMsg = tab === 'search' ? errSearch : errRecs

  return (
    <div className="min-h-screen bg-base-200">
      {/* Top bar */}
      <div className="navbar brand-gradient shadow-sm">
        <div className="flex-1">
          <a className="btn btn-ghost text-lg text-white hover:bg-white/10">Digital Library</a>
        </div>
        <div className="flex-none gap-3">
          <ThemeControls />
          <a
            className="btn btn-sm btn-ghost text-white hover:bg-white/10"
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            title="后端接口文档"
          >
            API 文档
          </a>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Hero */}
        <div className="bg-base-100 rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold">图书推荐演示</h1>
              <p className="opacity-70 mt-2">搜索书名/作者/主题，同时支持按用户画像生成推荐。</p>
            </div>

            <div className="form-control w-full md:w-72">
              <label className="label"><span className="label-text">用户 UID</span></label>
              <input
                className="input input-bordered"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="例如：u123"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-3">
            <label className="input input-bordered flex items-center gap-2 flex-1">
              <span className="opacity-60">🔎</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') doSearch()
                }}
                type="text"
                className="grow"
                placeholder="输入关键词：title / author / subject / tags…"
              />
              {q ? (
                <button className="btn btn-ghost btn-xs" onClick={() => setQ('')}>清空</button>
              ) : null}
            </label>

            <button className="btn btn-primary" onClick={doSearch} disabled={loadingSearch}>
              {loadingSearch ? <span className="loading loading-spinner loading-sm" /> : '搜索'}
            </button>
            <button className="btn btn-secondary" onClick={doRecommend} disabled={loadingRecs}>
              {loadingRecs ? <span className="loading loading-spinner loading-sm" /> : '为我推荐'}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="tabs tabs-boxed">
              <button className={`tab ${tab === 'recommend' ? 'tab-active' : ''}`} onClick={() => setTab('recommend')}>
                推荐
              </button>
              <button className={`tab ${tab === 'search' ? 'tab-active' : ''}`} onClick={() => setTab('search')}>
                搜索结果
              </button>
            </div>

            <span className="text-sm opacity-70">{activeCount} 条</span>
          </div>
        </div>

        {/* Toast */}
        {toast ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none text-base-content">
            <div className="alert shadow-xl bg-primary/15 border border-primary/30 text-base-content max-w-sm backdrop-blur">
              <span className="break-words">{toast}</span>
            </div>
          </div>
        ) : null}

        {/* Content */}
        <section className="mt-6">
          {errorMsg ? (
            <div className="alert alert-error mb-4">
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <>
              {tab === 'search' ? (
                items.length === 0 ? (
                  <div className="alert">
                    <span>暂无搜索结果，试试换个关键词。</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((it) => (
                      <BookCard
                        key={it.id}
                        item={it}
                        onLike={() => sendFeedback(it.id, 'click')}
                      />
                    ))}
                  </div>
                )
              ) : (
                recs.length === 0 ? (
                  <div className="alert">
                    <span>暂无推荐结果。你可以输入关键词再点“为我推荐”。</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recs.map((r) => (
                      <RecCard
                        key={r.item_id}
                        rec={r}
                        onLike={() => sendFeedback(r.item_id, 'click')}
                      />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="footer footer-center p-4 text-base-content/60">
        <aside>
          <p>Built with FastAPI + Vite + React + Tailwind + daisyUI</p>
        </aside>
      </footer>
    </div>
  )
}
