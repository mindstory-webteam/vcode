import { useEffect, useState } from 'react';
import Layout from '../../components/Layout.jsx';
import Modal from '../../components/Modal.jsx';
import { toast } from 'react-toastify';
import { Trash2, Edit, Plus } from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import {
  getMyTodosFaculty,
  createTodoFaculty,
  updateTodoFaculty,
  updateTodoStatusFaculty,
  deleteTodoFaculty,
  fileUrl,
} from '../../api.js';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { socket } from '../../socket.js';
import { useAuth } from '../../context/AuthContext.jsx';

/* ── Column configs ── */
const COLS = [
  { key: 'pending',     label: 'Pending',      accent: 'var(--orange)', bg: '#fdf6ee', hint: 'Drop here to mark pending' },
  { key: 'in-progress', label: 'In Progress',  accent: 'var(--purple)', bg: '#f5eef6', hint: 'Drop here to start task' },
  { key: 'completed',   label: 'Completed',    accent: 'var(--teal)',   bg: '#eef8f2', hint: 'Drop here to complete task' },
];

const COL_KEYS = ['pending', 'in-progress', 'completed'];

/* ── Todo Kanban Card ── */
function TodoKanbanCard({ todo, colKey, isDragging, onEdit, onDelete }) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id: todo._id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="apps-kb-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div className="cell-name" style={{ fontSize: 13, fontWeight: 600, lineHeight: '1.4' }}>{todo.title}</div>
          {todo.description && (
            <div className="cell-sub" style={{ fontSize: 11, marginTop: 2, whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {todo.description}
            </div>
          )}
        </div>
        <div 
          style={{ display: 'flex', gap: 2, flexShrink: 0 }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button 
            className="btn btn-ghost btn-xs" 
            style={{ padding: 4 }} 
            onClick={() => onEdit(todo)}
            title="Edit To-Do"
          >
            <Edit size={13} style={{ color: 'var(--purple)' }} />
          </button>
          <button 
            className="btn btn-ghost btn-xs" 
            style={{ padding: 4 }} 
            onClick={() => onDelete(todo._id, todo.title)}
            title="Delete To-Do"
          >
            <Trash2 size={13} style={{ color: 'var(--brick)' }} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {todo.priority && (
          <span className="apps-kb-badge" style={{ background: todo.priority === 'high' ? '#fdeded' : todo.priority === 'low' ? '#e3f2fd' : '#fff3e0', color: todo.priority === 'high' ? '#d32f2f' : todo.priority === 'low' ? '#1976d2' : '#e65100' }}>
            {todo.priority}
          </span>
        )}
        {todo.dueDate && (
          <span className="apps-kb-badge" style={{ background: 'var(--paper-wash)', color: 'var(--muted)' }}>
            Due: {new Date(todo.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        )}
        <span className="apps-kb-badge" style={{ background: 'rgba(138,125,148,0.08)', color: 'var(--muted-light)' }}>
          {new Date(todo.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </span>
      </div>
    </div>
  );
}

/* ── Droppable column ── */
function KanbanCol({ col, todos, activeId, onEdit, onDelete }) {
  const { setNodeRef } = useDroppable({
    id: col.key,
  });

  return (
    <div className="apps-kb-col" style={{ background: col.bg }}>
      <div className="apps-kb-col-header" style={{ background: col.accent, borderBottom: 'none' }}>
        <span className="apps-kb-col-label" style={{ color: '#ffffff' }}>{col.label}</span>
        <span className="apps-kb-col-count" style={{ background: 'rgba(255, 255, 255, 0.25)', color: '#ffffff' }}>{todos.length}</span>
      </div>
      <SortableContext items={todos.map(t => t._id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="apps-kb-col-body" id={col.key}>
          {todos.length === 0 && (
            <div className="apps-kb-empty">{col.hint}</div>
          )}
          {todos.map(todo => (
            <TodoKanbanCard
              key={todo._id}
              todo={todo}
              colKey={col.key}
              isDragging={activeId === todo._id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

/* ── Main page ── */
export default function FacultyTodos() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [cols, setCols] = useState({ pending: [], 'in-progress': [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('pending');
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = () => {
    setLoading(true);
    getMyTodosFaculty()
      .then((res) => {
        const fetchedTodos = res.data.todos || [];
        setCols({
          pending: fetchedTodos.filter(t => t.status === 'pending'),
          'in-progress': fetchedTodos.filter(t => t.status === 'in-progress'),
          completed: fetchedTodos.filter(t => t.status === 'completed'),
        });
      })
      .catch(() => toast.error('Could not load to-dos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();

    // Socket.io real-time connection
    if (user?._id) {
      socket.connect();
      socket.emit('join_notification_rooms', { userId: user._id });

      socket.on('todo_assigned', (newTodo) => {
        setCols(prev => {
          if (COL_KEYS.some(k => prev[k].some(t => t._id === newTodo._id))) return prev;
          return { ...prev, pending: [newTodo, ...prev.pending] };
        });
      });

      socket.on('todo_updated', (updatedTodo) => {
        setCols(prev => {
          const cleaned = {};
          COL_KEYS.forEach(k => {
            cleaned[k] = prev[k].filter(t => t._id !== updatedTodo._id);
          });
          cleaned[updatedTodo.status] = [updatedTodo, ...cleaned[updatedTodo.status]];
          return cleaned;
        });
      });

      socket.on('todo_removed', ({ todoId }) => {
        setCols(prev => {
          const cleaned = {};
          COL_KEYS.forEach(k => {
            cleaned[k] = prev[k].filter(t => t._id !== todoId);
          });
          return cleaned;
        });
      });
    }

    return () => {
      socket.off('todo_assigned');
      socket.off('todo_updated');
      socket.off('todo_removed');
      socket.disconnect();
    };
  }, [user]);

  function findCol(todoId) {
    return COL_KEYS.find(k => cols[k].some(t => t._id === todoId));
  }

  function findTodo(todoId) {
    for (const k of COL_KEYS) {
      const t = cols[k].find(t => t._id === todoId);
      if (t) return t;
    }
    return null;
  }

  const openCreateModal = () => {
    setEditTarget(null);
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
    setStatus('pending');
    setShowModal(true);
  };

  const openEditModal = (todo) => {
    setEditTarget(todo);
    setTitle(todo.title);
    setDescription(todo.description || '');
    setDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '');
    setPriority(todo.priority || 'medium');
    setStatus(todo.status);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warn('To-Do title is required');
      return;
    }

    setBusy(true);
    const data = {
      title,
      description,
      dueDate: dueDate || undefined,
      priority,
      status,
    };

    try {
      if (editTarget) {
        await updateTodoFaculty(editTarget._id, data);
        toast.success('To-Do updated successfully!');
      } else {
        await createTodoFaculty(data);
        toast.success('To-Do created successfully!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving to-do');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (todoId, todoTitle) => {
    if (!await confirm(`Are you sure you want to delete the to-do: "${todoTitle}"?`)) return;

    try {
      await deleteTodoFaculty(todoId);
      toast.success('To-Do deleted successfully!');
      load();
    } catch (err) {
      toast.error('Failed to delete to-do');
    }
  };

  async function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;

    const srcCol = findCol(active.id);
    const destCol = COL_KEYS.includes(over.id) ? over.id : findCol(over.id);

    if (!srcCol || !destCol) return;

    if (srcCol === destCol) {
      setCols(prev => {
        const items = prev[srcCol];
        const oldIdx = items.findIndex(t => t._id === active.id);
        const newIdx = items.findIndex(t => t._id === over.id);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        return { ...prev, [srcCol]: arrayMove(items, oldIdx, newIdx) };
      });
      return;
    }

    const todo = findTodo(active.id);
    if (!todo) return;

    // Optimistic update
    setCols(prev => ({
      ...prev,
      [srcCol]: prev[srcCol].filter(t => t._id !== active.id),
      [destCol]: [{ ...todo, status: destCol }, ...prev[destCol]],
    }));

    try {
      await updateTodoStatusFaculty(todo._id, destCol);
      toast.success(`To-Do status updated!`);
    } catch (err) {
      toast.error('Could not update status');
      load();
    }
  }

  const allTodos = [...cols.pending, ...cols['in-progress'], ...cols.completed];
  const activeTodo = allTodos.find(t => t._id === activeId);

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>To-Do Board</h1>
          <p className="sub">
            Manage your personal todos, tasks, and reminders.
          </p>
        </div>
        <button className="btn btn-purple" onClick={openCreateModal}>
          <Plus size={16} style={{ marginRight: 6 }} /> Add To-Do
        </button>
      </div>

      {loading ? (
        <div className="loading-line">Fetching to-dos…</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}
        >
          <div className="apps-kb-board">
            {COLS.map(col => (
              <KanbanCol
                key={col.key}
                col={col}
                todos={cols[col.key]}
                activeId={activeId}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTodo && (
              <div
                className="apps-kb-card apps-kb-card-overlay"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div>
                  <div className="cell-name" style={{ fontSize: 13, fontWeight: 600, lineHeight: '1.4' }}>{activeTodo.title}</div>
                  {activeTodo.description && (
                    <div className="cell-sub" style={{ fontSize: 11, marginTop: 2 }}>{activeTodo.description}</div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {activeTodo.priority && (
                    <span className="apps-kb-badge" style={{ background: activeTodo.priority === 'high' ? '#fdeded' : activeTodo.priority === 'low' ? '#e3f2fd' : '#fff3e0', color: activeTodo.priority === 'high' ? '#d32f2f' : activeTodo.priority === 'low' ? '#1976d2' : '#e65100' }}>
                      {activeTodo.priority}
                    </span>
                  )}
                  {activeTodo.dueDate && (
                    <span className="apps-kb-badge" style={{ background: 'var(--paper-wash)', color: 'var(--muted)' }}>
                      Due: {new Date(activeTodo.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  <span className="apps-kb-badge" style={{ background: 'rgba(138,125,148,0.08)', color: 'var(--muted-light)' }}>
                    {new Date(activeTodo.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {showModal && (
        <Modal title={editTarget ? 'Edit To-Do' : 'Add To-Do'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="todo-title">Title</label>
              <input
                id="todo-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Grade Semester 2 submissions"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="todo-desc">Description</label>
              <textarea
                id="todo-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of the task/reminder..."
              />
            </div>
            <div className="field">
              <label htmlFor="todo-due">Due Date</label>
              <input
                id="todo-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="todo-priority">Priority</label>
              <select
                id="todo-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            {editTarget && (
              <div className="field">
                <label htmlFor="todo-status">Status</label>
                <select
                  id="todo-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}
            <div className="btn-row" style={{ marginTop: 20 }}>
              <button className="btn btn-purple" type="submit" disabled={busy}>
                {busy ? 'Saving…' : editTarget ? 'Save Changes' : 'Add To-Do'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowModal(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
