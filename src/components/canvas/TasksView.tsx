import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type Task, UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  Pencil,
  GripVertical,
  CheckCircle2,
  Circle,
  X,
  Sparkles,
} from 'lucide-react';

/**
 * Format a due date timestamp into a human-readable badge
 */
function formatDueDateBadge(dueDateMs?: number): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
} | null {
  if (!dueDateMs) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 86400000;
  const startOfYesterday = startOfToday - 86400000;

  if (dueDateMs >= startOfToday && dueDateMs < startOfTomorrow) {
    return { label: 'Today', isOverdue: false, isToday: true };
  }
  if (dueDateMs >= startOfTomorrow && dueDateMs < startOfTomorrow + 86400000) {
    return { label: 'Tomorrow', isOverdue: false, isToday: false };
  }
  if (dueDateMs < startOfToday) {
    return {
      label: dueDateMs >= startOfYesterday ? 'Yesterday' : new Date(dueDateMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      isOverdue: true,
      isToday: false,
    };
  }

  return {
    label: new Date(dueDateMs).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    isOverdue: false,
    isToday: false,
  };
}

export const TasksView: React.FC = () => {
  const { activeSpaceId, searchQuery } = useUIStore();
  const targetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;

  // Active space metadata
  const activeSpace = useLiveQuery(
    () => (activeSpaceId ? db.spaces.get(activeSpaceId) : undefined),
    [activeSpaceId]
  );

  // Query tasks for this space
  const allTasks = useLiveQuery(
    () => db.tasks.where('spaceId').equals(targetSpaceId).sortBy('order'),
    [targetSpaceId]
  );

  // New task form state
  const [newText, setNewText] = React.useState('');
  const [newDueDate, setNewDueDate] = React.useState<string>('');
  const [filterMode, setFilterMode] = React.useState<'all' | 'active' | 'completed'>('all');

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState('');
  const [editingDueDate, setEditingDueDate] = React.useState<string>('');

  // Drag and drop state
  const [draggingTaskId, setDraggingTaskId] = React.useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const editInputRef = React.useRef<HTMLInputElement>(null);

  // Focus inline edit input
  React.useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTaskId]);

  // Filter tasks based on view mode and global search query
  const filteredTasks = React.useMemo(() => {
    if (!allTasks) return [];
    let list = [...allTasks];

    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => t.text.toLowerCase().includes(q));
    }

    // Status filter
    if (filterMode === 'active') {
      list = list.filter((t) => !t.completed);
    } else if (filterMode === 'completed') {
      list = list.filter((t) => t.completed);
    }

    return list;
  }, [allTasks, filterMode, searchQuery]);

  // Completion metrics
  const totalCount = allTasks?.length || 0;
  const completedCount = allTasks?.filter((t) => t.completed).length || 0;
  const activeCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Create new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;

    const count = allTasks?.length || 0;
    const now = Date.now();
    const dueDateMs = newDueDate ? new Date(`${newDueDate}T23:59:59`).getTime() : undefined;

    await db.tasks.add({
      id: crypto.randomUUID(),
      spaceId: targetSpaceId,
      text,
      completed: false,
      order: count,
      dueDate: dueDateMs,
      createdAt: now,
      updatedAt: now,
    });

    setNewText('');
    setNewDueDate('');
  };

  // Toggle completed status
  const handleToggleCompleted = async (task: Task) => {
    await db.tasks.update(task.id, {
      completed: !task.completed,
      updatedAt: Date.now(),
    });
  };

  // Start inline editing
  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setEditingDueDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setEditingDueDate('');
    }
  };

  // Save inline edit
  const handleSaveEdit = async () => {
    if (!editingTaskId) return;
    const text = editingText.trim();
    if (!text) {
      setEditingTaskId(null);
      return;
    }

    const dueDateMs = editingDueDate
      ? new Date(`${editingDueDate}T23:59:59`).getTime()
      : undefined;

    await db.tasks.update(editingTaskId, {
      text,
      dueDate: dueDateMs,
      updatedAt: Date.now(),
    });

    setEditingTaskId(null);
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    await db.tasks.delete(id);
  };

  // Clear all completed tasks in this space
  const handleClearCompleted = async () => {
    if (!allTasks) return;
    const completedTasks = allTasks.filter((t) => t.completed);
    for (const t of completedTasks) {
      await db.tasks.delete(t.id);
    }
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (!draggingTaskId || !allTasks) return;

    const fromIndex = allTasks.findIndex((t) => t.id === draggingTaskId);
    if (fromIndex === -1 || fromIndex === dropIndex) return;

    const reordered = [...allTasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const now = Date.now();
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i) {
        await db.tasks.update(reordered[i].id, { order: i, updatedAt: now });
      }
    }

    setDraggingTaskId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl mx-auto w-full select-none pb-32 relative">
      {/* Top Banner / Progress Block */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100">Tasks</h2>
                <span className="text-xs text-slate-400 font-medium">
                  ({completedCount}/{totalCount})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track project to-dos and action items side-by-side with your workspace.
              </p>
            </div>
          </div>

          {/* Clear Completed Action */}
          {completedCount > 0 && (
            <button
              onClick={handleClearCompleted}
              className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
              title="Delete all finished tasks"
            >
              Clear Completed ({completedCount})
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
              <span>Progress</span>
              <span className="font-mono text-blue-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Task Form */}
      <form
        onSubmit={handleCreateTask}
        className="bg-slate-900/80 border border-slate-800 focus-within:border-blue-500/60 rounded-xl p-3 shadow-md mb-6 flex items-center gap-3 transition"
      >
        <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />

        <input
          type="text"
          required
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a new task (e.g. Finish quarterly presentation, Review PR)..."
          className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
        />

        {/* Optional Due Date Picker */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="bg-transparent text-[11px] text-slate-300 focus:outline-none cursor-pointer"
            title="Set due date (optional)"
          />
        </div>

        <button
          type="submit"
          disabled={!newText.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Filter Tabs Bar */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              filterMode === 'all'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All ({totalCount})
          </button>

          <button
            onClick={() => setFilterMode('active')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              filterMode === 'active'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Active ({activeCount})
          </button>

          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              filterMode === 'completed'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl divide-y divide-slate-800/60 shadow-sm overflow-hidden">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task, index) => {
            const badge = formatDueDateBadge(task.dueDate);
            const isEditing = editingTaskId === task.id;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={task.id}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center justify-between p-3.5 group transition ${
                  task.completed ? 'bg-slate-950/20' : 'hover:bg-slate-800/40'
                } ${isDragOver ? 'border-t-2 border-blue-500' : ''}`}
              >
                {/* Left: Drag Handle + Checkbox + Task Text */}
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                  <span
                    className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </span>

                  <button
                    onClick={() => handleToggleCompleted(task)}
                    className="flex-shrink-0 text-slate-500 hover:text-blue-400 transition cursor-pointer"
                    title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500 hover:text-blue-400" />
                    )}
                  </button>

                  {/* Task Content / Inline Edit */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingTaskId(null);
                        }}
                        className="flex-1 bg-slate-950 border border-blue-500 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none"
                      />
                      <input
                        type="date"
                        value={editingDueDate}
                        onChange={(e) => setEditingDueDate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingTaskId(null)}
                        className="p-1 rounded text-slate-400 hover:bg-slate-800"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onDoubleClick={() => handleStartEdit(task)}
                      className={`text-xs select-text break-words flex-1 cursor-pointer ${
                        task.completed
                          ? 'line-through text-slate-500'
                          : 'text-slate-200 group-hover:text-white'
                      }`}
                      title="Double-click to edit"
                    >
                      {task.text}
                    </span>
                  )}
                </div>

                {/* Right: Due Date Badge + Action Buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-2.5">
                    {badge && (
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                          task.completed
                            ? 'bg-slate-800/40 border-slate-800 text-slate-500'
                            : badge.isOverdue
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : badge.isToday
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>{badge.label}</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleStartEdit(task)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                        title="Edit task"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 px-4 text-center">
            <CheckSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              {filterMode === 'completed'
                ? 'No completed tasks yet.'
                : filterMode === 'active'
                ? 'All caught up! No active tasks.'
                : 'No tasks in this space yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
