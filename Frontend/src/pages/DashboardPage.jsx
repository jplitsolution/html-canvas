import { memo, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, LayoutTemplate, Sparkles } from 'lucide-react'
import useStore from '../store/useStore'
import AppShell from '../components/ui/AppShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import ProjectCard from '../components/dashboard/ProjectCard'
import CreateProjectModal from '../components/dashboard/CreateProjectModal'
import DeleteConfirmModal from '../components/dashboard/DeleteConfirmModal'
import UsageSummary from '../components/dashboard/UsageSummary'

function DashboardPage() {
  const navigate = useNavigate()
  const projects = useStore((s) => s.projects)
  const deleteProject = useStore((s) => s.deleteProject)

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return projects
    const q = search.toLowerCase()
    return projects.filter((p) => p.title.toLowerCase().includes(q))
  }, [projects, search])

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteProject(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <AppShell
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate('/templates')}>
          <Sparkles className="w-4 h-4" />
          Templates
        </Button>
      }
    >
      <main className="page-container">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-fg font-display tracking-tight">Your Projects</h1>
          <p className="text-sm text-fg-muted mt-1">Create, edit, and export beautiful page templates</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              icon={LayoutTemplate}
              title={search ? 'No projects found' : 'No projects yet'}
              description={search ? 'Try a different search term' : 'Create your first project or start from a template'}
              action={!search && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="primary" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4" />
                    Create Project
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/templates')}>
                    Browse Templates
                  </Button>
                </div>
              )}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}

        <div className="mt-10">
          <UsageSummary />
        </div>
      </main>

      <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        projectTitle={deleteTarget?.title}
      />
    </AppShell>
  )
}

export default memo(DashboardPage)
