import { memo, useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Eye,
  Blocks,
  Search,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Star,
  Moon,
  Sun,
  Check,
  Award
} from 'lucide-react'
import { listTemplates } from '../services/api/templates'
import useStore from '../store/useStore'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Modal from '../components/common/Modal'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { buildPreviewDocument } from '../editor/services/exportSite'

// Categories list
const CATEGORIES = [
  'All',
  'SaaS',
  'Portfolio',
  'Landing',
  'Agency',
  'Restaurant',
  'Blog',
  'E-commerce',
  'Travel',
  'Fitness'
]

// Enrich template with visual categories, stats, and badges
const enrichTemplate = (t) => {
  const defaults = {
    category: 'General',
    sections: 3,
    darkMode: true,
    badge: null,
  }

  const id = String(t.id).toLowerCase()
  if (id === 'landing') {
    return { ...defaults, ...t, category: 'Landing', sections: 5, darkMode: false, badge: 'Popular' }
  } else if (id === 'saas-landing' || id === 'saas') {
    return { ...defaults, ...t, category: 'SaaS', sections: 4, darkMode: true, badge: 'New' }
  } else if (id === 'minimal-portfolio' || id === 'portfolio') {
    return { ...defaults, ...t, category: 'Portfolio', sections: 3, darkMode: true, badge: 'Trending' }
  } else if (id === 'agency') {
    return { ...defaults, ...t, category: 'Agency', sections: 4, darkMode: true }
  } else if (id === 'restaurant') {
    return { ...defaults, ...t, category: 'Restaurant', sections: 3, darkMode: true }
  } else if (id === 'blog') {
    return { ...defaults, ...t, category: 'Blog', sections: 3, darkMode: false }
  } else if (id === 'ecommerce') {
    return { ...defaults, ...t, category: 'E-commerce', sections: 3, darkMode: false }
  } else if (id === 'travel') {
    return { ...defaults, ...t, category: 'Travel', sections: 4, darkMode: false }
  } else if (id === 'fitness') {
    return { ...defaults, ...t, category: 'Fitness', sections: 3, darkMode: true, badge: 'Trending' }
  }

  // Fallback counting from HTML
  let calcSections = 0
  if (t.html) {
    calcSections = (t.html.match(/<section/g) || []).length
  }
  if (calcSections === 0) calcSections = 3

  return {
    category: t.category || 'General',
    sections: t.sections || calcSections,
    darkMode: t.darkMode !== undefined ? t.darkMode : true,
    badge: t.badge || null,
    ...t
  }
}

function Templates() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const createProject = useStore((s) => s.createProject)
  
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  
  // UI filter and search states
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Custom Responsive Preview modal states
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [previewDevice, setPreviewDevice] = useState('desktop')

  useEffect(() => {
    listTemplates()
      .then((data) => {
        const enriched = data
          .filter((t) => t.id !== 'blank')
          .map(enrichTemplate)
        setTemplates(enriched)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleUseTemplate = async (template) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setCreating(true)
    try {
      const id = await createProject(template.name, template.id, template)
      navigate(`/builder/${id}`)
    } catch {
      setCreating(false)
    }
  }

  const handleStartBlank = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setCreating(true)
    try {
      const id = await createProject('Untitled Project', 'blank')
      navigate(`/builder/${id}`)
    } catch {
      setCreating(false)
    }
  }

  // Filter templates list
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        t.category.toLowerCase() === selectedCategory.toLowerCase()
      
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [templates, selectedCategory, searchQuery])

  // Featured Template (first available template, or SaaS landing as default)
  const featuredTemplate = useMemo(() => {
    if (templates.length === 0) return null
    return (
      templates.find((t) => t.id === 'saas-landing' || t.id === 'saas') ||
      templates[0]
    )
  }, [templates])

  // Generate compiled iframe preview content
  const previewSrcDoc = useMemo(() => {
    if (!previewTemplate) return ''
    return buildPreviewDocument(previewTemplate.name, previewTemplate.html, previewTemplate.css || '')
  }, [previewTemplate])

  // Device sizes map for responsive preview frame
  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  }

  // Helper for fallbacks in templates preview image rendering
  const getPreviewImageUrl = (url) => {
    if (typeof url === 'string' && url.startsWith('http')) {
      return url
    }
    return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop'
  }

  return (
    <AppShell
      actions={
        <Button variant="primary" size="sm" onClick={handleStartBlank} disabled={creating}>
          <Plus className="w-4 h-4" />
          Blank Project
        </Button>
      }
    >
      <main className="page-container max-w-[1600px] mx-auto px-4 py-8">
        
        {/* Banner Title */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-fg font-display tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent animate-pulse" />
              Template Library
            </h1>
            <p className="text-sm text-fg-muted mt-1">
              Select a pre-built premium design to speed up your page development.
            </p>
          </div>
          
          {/* Search box */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-bg-elevated/50 backdrop-blur-md text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
            />
          </div>
        </div>

        {/* Categories scroll panel */}
        <div className="flex overflow-x-auto pb-4 gap-2 scrollbar-none shrink-0 mb-8 border-b border-border/50">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-200 whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-accent border-accent text-accent-fg shadow-md shadow-accent/20 scale-105'
                  : 'bg-bg-elevated/55 border-border text-fg-muted hover:text-fg hover:bg-bg-subtle'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="surface-card p-12 text-center text-fg-muted rounded-2xl border border-border flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span>Loading prebuilt templates...</span>
          </div>
        ) : (
          <>
            {/* Featured Template Banner Section */}
            {featuredTemplate && !searchQuery && selectedCategory === 'All' && (
              <div className="mb-10 bg-gradient-to-r from-bg-elevated via-bg-subtle to-mesh-1 border border-border/60 shadow-xl rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row gap-8 items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Award className="w-64 h-64 text-accent" />
                </div>
                
                <div className="flex-1 space-y-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" className="flex items-center gap-1 bg-accent/20 border-accent/30 text-accent font-semibold px-2.5 py-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      Featured Template
                    </Badge>
                    <Badge variant="success" className="font-semibold">New Edition</Badge>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-fg font-display tracking-tight">
                    {featuredTemplate.name}
                  </h2>
                  <p className="text-sm text-fg-muted max-w-xl leading-relaxed">
                    {featuredTemplate.description}. Features rich layout elements, clean section anchors, customized spacing, and dark support out-of-the-box.
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
                    <span className="flex items-center gap-1 bg-bg-muted/50 px-2.5 py-1 rounded-md border border-border">
                      <Blocks className="w-3.5 h-3.5 text-accent" />
                      {featuredTemplate.sections} Sections
                    </span>
                    <span className="flex items-center gap-1 bg-bg-muted/50 px-2.5 py-1 rounded-md border border-border">
                      <Monitor className="w-3.5 h-3.5 text-success" />
                      Responsive Build
                    </span>
                    {featuredTemplate.darkMode && (
                      <span className="flex items-center gap-1 bg-bg-muted/50 px-2.5 py-1 rounded-md border border-border">
                        <Moon className="w-3.5 h-3.5 text-warning" />
                        Dark theme supported
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="primary"
                      onClick={() => handleUseTemplate(featuredTemplate)}
                      disabled={creating}
                      className="px-6 py-2.5 shadow-md shadow-accent/25"
                    >
                      Start Designing
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPreviewTemplate(featuredTemplate)}
                      aria-label="Preview featured template"
                      className="flex items-center gap-1.5 px-4"
                    >
                      <Eye className="w-4 h-4" /> Live Preview
                    </Button>
                  </div>
                </div>

                <div className="w-full lg:w-96 shrink-0 aspect-video rounded-xl overflow-hidden border border-border shadow-lg relative group">
                  <img
                    src={getPreviewImageUrl(featuredTemplate.previewImage)}
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop'
                    }}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            )}

            {/* Title for regular list */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">
                {selectedCategory} Templates ({filteredTemplates.length})
              </h3>
            </div>

            {/* Grid of Templates cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="overflow-hidden group flex flex-col h-full hover:-translate-y-2 hover:shadow-xl bg-bg-elevated/60 backdrop-blur-md border border-border/80 rounded-2xl transition-all duration-300 relative"
                >
                  {/* Badge */}
                  {template.badge && (
                    <Badge
                      variant={
                        template.badge === 'New'
                          ? 'success'
                          : template.badge === 'Trending'
                          ? 'primary'
                          : 'warning'
                      }
                      className="absolute top-3 left-3 z-10 font-semibold shadow-sm"
                    >
                      {template.badge}
                    </Badge>
                  )}

                  {/* Template Image Section - Edge-to-edge */}
                  <div className="relative h-48 overflow-hidden bg-bg-subtle border-b border-border overflow-hidden">
                    <img
                      src={getPreviewImageUrl(template.previewImage)}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop'
                      }}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                      loading="lazy"
                    />
                    
                    {/* Hover Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setPreviewTemplate(template)}
                        className="scale-90 group-hover:scale-100 transition-transform duration-300 shadow-md"
                      >
                        <Eye className="w-4 h-4 mr-1.5" /> Quick Preview
                      </Button>
                    </div>
                  </div>

                  {/* Content space */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">
                        {template.category}
                      </span>
                      <span className="text-[11px] text-fg-muted flex items-center gap-1">
                        <Blocks className="w-3 h-3 text-accent" />
                        {template.sections} sections
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-fg font-display mb-1 group-hover:text-accent transition-colors duration-200 line-clamp-1">
                      {template.name}
                    </h3>
                    <p className="text-xs text-fg-muted mb-4 line-clamp-2 leading-relaxed flex-1">
                      {template.description}
                    </p>

                    {/* Stats & Features Bar */}
                    <div className="flex items-center gap-3 text-[10px] text-fg-muted py-2 border-t border-border/40 mt-auto">
                      <span className="flex items-center gap-1 font-medium">
                        <Check className="w-3 h-3 text-success font-bold" /> Responsive
                      </span>
                      {template.darkMode && (
                        <span className="flex items-center gap-1 font-medium">
                          <Check className="w-3 h-3 text-success font-bold" /> Dark Mode
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-3 border-t border-border/50">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 font-semibold text-xs py-2 rounded-xl"
                        onClick={() => handleUseTemplate(template)}
                        disabled={creating}
                      >
                        Use Template
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="p-2 rounded-xl border-border hover:bg-bg-subtle shrink-0"
                        onClick={() => setPreviewTemplate(template)}
                        aria-label="Preview template"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Empty filter query output */}
            {filteredTemplates.length === 0 && (
              <div className="surface-card p-12 text-center text-fg-muted rounded-2xl border border-border flex flex-col items-center justify-center gap-2">
                <p className="text-base font-semibold text-fg">No templates found</p>
                <p className="text-xs max-w-sm text-fg-muted">
                  No layouts matched your search query "{searchQuery}" under the category "{selectedCategory}".
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('All')
                    setSearchQuery('')
                  }}
                  className="mt-3"
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Advanced Responsive Preview Modal */}
      <Modal
        isOpen={!!previewTemplate}
        onClose={() => {
          setPreviewTemplate(null)
          setPreviewDevice('desktop')
        }}
        title={
          previewTemplate ? (
            <div className="flex items-center gap-2">
              <img
                src={getPreviewImageUrl(previewTemplate.previewImage)}
                alt=""
                className="w-8 h-6 object-cover rounded border border-border"
              />
              <span>{previewTemplate.name} — Responsive Preview</span>
            </div>
          ) : (
            'Template Preview'
          )
        }
        size="xxl"
      >
        {previewTemplate && (
          <div className="space-y-4">
            
            {/* Toolbar inside Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 bg-bg-subtle rounded-xl border border-border">
              
              {/* Responsive Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold border transition-all ${
                    previewDevice === 'desktop'
                      ? 'bg-accent border-accent text-accent-fg shadow-sm'
                      : 'bg-bg-elevated hover:bg-bg-muted border-border text-fg-muted'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold border transition-all ${
                    previewDevice === 'tablet'
                      ? 'bg-accent border-accent text-accent-fg shadow-sm'
                      : 'bg-bg-elevated hover:bg-bg-muted border-border text-fg-muted'
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span>Tablet</span>
                </button>
                
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold border transition-all ${
                    previewDevice === 'mobile'
                      ? 'bg-accent border-accent text-accent-fg shadow-sm'
                      : 'bg-bg-elevated hover:bg-bg-muted border-border text-fg-muted'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <div className="text-xs text-fg-muted hidden md:block mr-2">
                  Category: <span className="font-semibold text-fg">{previewTemplate.category}</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleUseTemplate(previewTemplate)
                    setPreviewTemplate(null)
                  }}
                  disabled={creating}
                  className="rounded-lg font-semibold shadow-sm"
                >
                  Use Template
                </Button>
              </div>
            </div>

            {/* Frame Wrapper mimicking device screen layout */}
            <div className="bg-bg-subtle p-4 rounded-xl border border-border flex justify-center items-center min-h-[400px] overflow-hidden bg-stripe-pattern">
              <div
                className="bg-bg-elevated shadow-xl border border-border/80 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] relative"
                style={{
                  width: deviceWidths[previewDevice],
                  maxWidth: '100%',
                  borderRadius: previewDevice === 'desktop' ? '8px' : '20px',
                  borderWidth: previewDevice === 'desktop' ? '1px' : '10px',
                  borderColor: previewDevice === 'desktop' ? 'var(--border)' : '#1e1e2e'
                }}
              >
                <iframe
                  title={`Preview Live: ${previewTemplate.name}`}
                  srcDoc={previewSrcDoc}
                  className="w-full border-none bg-white transition-all duration-300"
                  style={{
                    height: '520px',
                  }}
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            </div>

            {/* Footer text */}
            <div className="flex items-center justify-between text-xs text-fg-muted px-1">
              <p>Viewport mode: <span className="font-semibold text-fg capitalize">{previewDevice}</span></p>
              <p>Supports fonts, icons, spacing and CSS alignments</p>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

export default memo(Templates)
