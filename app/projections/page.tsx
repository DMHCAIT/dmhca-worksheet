'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CalendarView from '@/components/projections/CalendarView'
import EditProjectionModal from '@/components/projections/EditProjectionModal'
import DeleteConfirmDialog from '@/components/projections/DeleteConfirmDialog'
import ProjectionCard from '@/components/projections/ProjectionCard'
import AnalyticsDashboard from '@/components/projections/AnalyticsDashboard'
import { projectsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Project } from '@/types/entities'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, addDays } from 'date-fns'
import { Plus, LayoutGrid, LayoutList, BarChart3 } from 'lucide-react'
import { 
  useProjections, 
  useCreateProjection, 
  useUpdateProjection, 
  useUpdateActualHours, 
  useDeleteProjection 
} from '@/lib/hooks/useProjectionsQueries'
import { useQuery } from '@tanstack/react-query'

export default function ProjectionsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [selectedProjection, setSelectedProjection] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid')
  const [projectionType, setProjectionType] = useState<'weekly' | 'monthly'>('weekly')
  const [newProjection, setNewProjection] = useState({
    title: '',
    week_start_date: '',
    week_end_date: '',
    projection_type: 'weekly' as 'weekly' | 'monthly',
    project_id: '',
    notes: ''
  })
  const { user } = useAuth()

  // React Query hooks
  const { data: projections = [], isLoading } = useProjections()
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
  })
  
  const createProjectionMutation = useCreateProjection()
  const updateProjectionMutation = useUpdateProjection()
  const updateActualHoursMutation = useUpdateActualHours()
  const deleteProjectionMutation = useDeleteProjection()

  const calculateDateRange = () => {
    const startDate = new Date(newProjection.week_start_date)
    if (newProjection.projection_type === 'weekly') {
      // Monday to Saturday (6 days)
      const endDate = addDays(startDate, 5)
      return endDate.toISOString().split('T')[0]
    } else {
      // Month end
      const endDate = endOfMonth(startDate)
      return endDate.toISOString().split('T')[0]
    }
  }

  const handleCreateProjection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const weekEndDate = calculateDateRange()

    const projectionData = {
      ...newProjection,
      week_end_date: weekEndDate,
      user_id: user.id,
      team: user.department || 'General',
    }

    await createProjectionMutation.mutateAsync(projectionData)
    setShowCreateModal(false)
    setNewProjection({
      title: '',
      week_start_date: '',
      week_end_date: '',
      projection_type: 'weekly',
      project_id: '',
      notes: ''
    })
  }

  const handleUpdateProjection = async (id: number, data: any) => {
    await updateProjectionMutation.mutateAsync({ id, data })
  }

  const handleUpdateActualHours = (id: number, hours: number) => {
    updateActualHoursMutation.mutate({ id, hours })
  }

  const handleDeleteProjection = async () => {
    if (!selectedProjection) return
    
    await deleteProjectionMutation.mutateAsync(selectedProjection.id)
    setShowDeleteDialog(false)
    setSelectedProjection(null)
  }

  const getFilteredProjections = () => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
      return projections.filter((p: any) => {
        const projectionDate = new Date(p.week_start_date)
        return isWithinInterval(projectionDate, { start: weekStart, end: weekEnd })
      })
    } else {
      const monthStart = startOfMonth(selectedDate)
      const monthEnd = endOfMonth(selectedDate)
      return projections.filter((p: any) => {
        const projectionDate = new Date(p.week_start_date)
        return isWithinInterval(projectionDate, { start: monthStart, end: monthEnd })
      })
    }
  }

  const getProjectionsByDate = () => {
    return projections.map((p: any) => ({
      date: p.week_start_date,
      count: 1
    }))
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading work projections...</div>
        </div>
      </DashboardLayout>
    )
  }

  const filteredProjections = getFilteredProjections()

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Calendar View */}
        <div className="lg:col-span-1">
          <CalendarView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            projectionsData={getProjectionsByDate()}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Work Projections</h1>
              <p className="text-gray-600">Plan and track your work commitments</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Analytics Toggle */}
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`p-2 rounded-lg transition-colors ${
                  showAnalytics
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
                title="Toggle analytics"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              
              {/* Layout Toggle */}
              <div className="inline-flex rounded-lg border border-gray-300 p-1">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    layoutMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayoutMode('list')}
                  className={`p-2 rounded transition-colors ${
                    layoutMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title="List view"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Projection
              </button>
            </div>
          </div>

          {/* Analytics Dashboard */}
          {showAnalytics && (
            <div className="mb-6">
              <AnalyticsDashboard
                projections={filteredProjections}
                selectedDate={selectedDate}
                viewMode={viewMode}
              />
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Total Projections</h3>
              <p className="text-3xl font-bold text-blue-600">{filteredProjections.length}</p>
              <p className="text-sm text-blue-600 mt-1">{viewMode === 'week' ? 'This Week' : 'This Month'}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
              <h3 className="text-lg font-medium text-green-900 mb-2">Weekly Projections</h3>
              <p className="text-3xl font-bold text-green-600">
                {filteredProjections.filter((p: any) => p.projection_type === 'weekly').length}
              </p>
              <p className="text-sm text-green-600 mt-1">Monday - Saturday</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
              <h3 className="text-lg font-medium text-purple-900 mb-2">Monthly Projections</h3>
              <p className="text-3xl font-bold text-purple-600">
                {filteredProjections.filter((p: any) => p.projection_type === 'monthly').length}
              </p>
              <p className="text-sm text-purple-600 mt-1">Full Month Duration</p>
            </div>
          </div>

          {/* Projections Display */}
          {filteredProjections.length === 0 ? (
            <div className="bg-white rounded-lg shadow text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projections for this {viewMode}
              </h3>
              <p className="text-gray-500 mb-4">Add your first work projection to get started.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Projection
              </button>
            </div>
          ) : (
            <div className={
              layoutMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                : 'space-y-4'
            }>
              {filteredProjections.map((projection: any) => (
                <ProjectionCard
                  key={projection.id}
                  projection={projection}
                  onEdit={(p) => {
                    setSelectedProjection(p)
                    setShowEditModal(true)
                  }}
                  onDelete={(p) => {
                    setSelectedProjection(p)
                    setShowDeleteDialog(true)
                  }}
                  onUpdateActualHours={handleUpdateActualHours}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Projection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateProjection}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add Work Projection</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Projection Title</label>
                      <input
                        type="text"
                        required
                        className="input mt-1"
                        value={newProjection.title}
                        onChange={(e) => setNewProjection({ ...newProjection, title: e.target.value })}
                        placeholder="e.g., Website Redesign Sprint"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Projection Type</label>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNewProjection({ ...newProjection, projection_type: 'weekly' })}
                          className={`px-4 py-3 rounded-lg border-2 transition-all ${
                            newProjection.projection_type === 'weekly'
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-semibold">Weekly</div>
                          <div className="text-xs text-gray-500">Mon - Sat</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewProjection({ ...newProjection, projection_type: 'monthly' })}
                          className={`px-4 py-3 rounded-lg border-2 transition-all ${
                            newProjection.projection_type === 'monthly'
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-semibold">Monthly</div>
                          <div className="text-xs text-gray-500">Full Month</div>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {newProjection.projection_type === 'weekly' ? 'Week Start Date (Monday)' : 'Month Start Date'}
                      </label>
                      <input
                        type="date"
                        required
                        className="input mt-1"
                        value={newProjection.week_start_date}
                        onChange={(e) => setNewProjection({ ...newProjection, week_start_date: e.target.value })}
                      />
                      {newProjection.week_start_date && (
                        <p className="text-sm text-gray-500 mt-1">
                          End Date: {calculateDateRange()}
                          {newProjection.projection_type === 'weekly' && ' (Saturday)'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Related Project (Optional)</label>
                      <select
                        className="input mt-1"
                        value={newProjection.project_id}
                        onChange={(e) => setNewProjection({ ...newProjection, project_id: e.target.value })}
                      >
                        <option value="">None - General Projection</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description & Goals</label>
                      <textarea
                        className="input mt-1"
                        rows={4}
                        value={newProjection.notes}
                        onChange={(e) => setNewProjection({ ...newProjection, notes: e.target.value })}
                        placeholder="Describe the projection goals and expected deliverables..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You can add detailed breakdown and assign team members after creating the projection
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn btn-primary sm:ml-3">
                    Create Projection
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedProjection && (
        <EditProjectionModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedProjection(null)
          }}
          projection={selectedProjection}
          projects={projects}
          onUpdate={handleUpdateProjection}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedProjection && (
        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false)
            setSelectedProjection(null)
          }}
          onConfirm={handleDeleteProjection}
          projectionName={selectedProjection.project?.name || 'Unknown Project'}
          isDeleting={deleteProjectionMutation.isPending}
        />
      )}
    </DashboardLayout>
  )
}