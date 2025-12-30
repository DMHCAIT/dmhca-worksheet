'use client'

import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface CalendarViewProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  viewMode: 'week' | 'month'
  onViewModeChange: (mode: 'week' | 'month') => void
  projectionsData?: { date: string; count: number }[]
}

export default function CalendarView({
  selectedDate,
  onSelectDate,
  viewMode,
  onViewModeChange,
  projectionsData = []
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)

  const handlePrevious = () => {
    if (viewMode === 'week') {
      const newDate = subWeeks(selectedDate, 1)
      onSelectDate(newDate)
    } else {
      const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
      setCurrentMonth(newDate)
    }
  }

  const handleNext = () => {
    if (viewMode === 'week') {
      const newDate = addWeeks(selectedDate, 1)
      onSelectDate(newDate)
    } else {
      const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
      setCurrentMonth(newDate)
    }
  }

  const getWeekRange = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 })
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
  }

  const getMonthRange = () => {
    return format(currentMonth, 'MMMM yyyy')
  }

  // Create a map of dates with projection counts
  const projectionsByDate = new Map(
    projectionsData.map(p => [p.date, p.count])
  )

  const modifiers = {
    hasProjections: (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      return projectionsByDate.has(dateStr)
    }
  }

  const modifiersStyles = {
    hasProjections: {
      fontWeight: 'bold',
      color: '#2563eb',
      backgroundColor: '#dbeafe',
      borderRadius: '50%'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendar View
        </h2>
        
        {/* View Mode Toggle */}
        <div className="inline-flex rounded-lg border border-gray-300 p-1">
          <button
            onClick={() => onViewModeChange('week')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewModeChange('month')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevious}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h3 className="text-lg font-medium text-gray-900">
          {viewMode === 'week' ? getWeekRange() : getMonthRange()}
        </h3>
        
        <button
          onClick={handleNext}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar */}
      {viewMode === 'month' && (
        <div className="calendar-container">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onSelectDate(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rdp-custom"
          />
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="space-y-2">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek(selectedDate, { weekStartsOn: 1 }))
            date.setDate(date.getDate() + i)
            const dateStr = format(date, 'yyyy-MM-dd')
            const count = projectionsByDate.get(dateStr) || 0
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

            return (
              <button
                key={i}
                onClick={() => onSelectDate(date)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`text-center ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                    <div className="text-xs font-medium uppercase">
                      {format(date, 'EEE')}
                    </div>
                    <div className="text-lg font-semibold">
                      {format(date, 'd')}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {format(date, 'MMMM d, yyyy')}
                    </div>
                    {count > 0 && (
                      <div className="text-xs text-blue-600">
                        {count} projection{count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                {count > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-600"></div>
            <span className="text-gray-600">Has Projections</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-100"></div>
            <span className="text-gray-600">No Projections</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onSelectDate(new Date())}
          className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => {
            const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
            onSelectDate(monday)
          }}
          className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          This Week
        </button>
      </div>

      <style jsx global>{`
        .calendar-container .rdp {
          --rdp-cell-size: 40px;
          --rdp-accent-color: #2563eb;
          --rdp-background-color: #dbeafe;
          margin: 0;
        }
        
        .calendar-container .rdp-months {
          justify-content: center;
        }
        
        .calendar-container .rdp-month {
          width: 100%;
        }
        
        .calendar-container .rdp-caption {
          display: none;
        }
        
        .calendar-container .rdp-head_cell {
          font-weight: 600;
          color: #4b5563;
          font-size: 0.875rem;
          text-transform: uppercase;
        }
        
        .calendar-container .rdp-day {
          font-size: 0.875rem;
        }
        
        .calendar-container .rdp-day_selected {
          background-color: #2563eb;
          color: white;
        }
        
        .calendar-container .rdp-day:hover:not(.rdp-day_disabled):not(.rdp-day_selected) {
          background-color: #f3f4f6;
        }
      `}</style>
    </div>
  )
}
