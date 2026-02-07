import React, { useState } from 'react';
import type { UserTask } from '../types';
import { PlusIcon, XIcon, CheckCircleIcon, CheckIcon } from './icons';

interface MyTasksProps {
    tasks: UserTask[];
    onAddTask: (task: { title: string; dueDate?: string; }) => void;
    onUpdateTask: (taskId: string, isComplete: boolean) => void;
    onDeleteTask: (taskId: string) => void;
}

export const MyTasks: React.FC<MyTasksProps> = ({ tasks, onAddTask, onUpdateTask, onDeleteTask }) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [justCompletedTaskId, setJustCompletedTaskId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate'>('createdAt');

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskTitle.trim()) {
            onAddTask({ title: newTaskTitle.trim(), dueDate: newTaskDueDate || undefined });
            setNewTaskTitle('');
            setNewTaskDueDate('');
        }
    };
    
    const handleCompleteTask = (taskId: string) => {
        onUpdateTask(taskId, true);
        setJustCompletedTaskId(taskId);

        // Keep track for animation, then clear.
        setTimeout(() => {
            setJustCompletedTaskId(null);
        }, 1000); // Animation duration is ~0.9s, so 1s is safe
    };

    const incompleteTasks = tasks
        .filter(t => !t.isComplete)
        .sort((a, b) => {
            if (sortBy === 'dueDate') {
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                }
                if (a.dueDate) return -1;
                if (b.dueDate) return 1;
                return 0;
            }
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

    const completeTasks = tasks.filter(t => t.isComplete).sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4">My Tasks</h3>
            <form onSubmit={handleAddTask} className="flex flex-wrap gap-2 mb-4">
                <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new task..."
                    className="form-input flex-grow"
                    aria-label="New task title"
                />
                <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="form-input"
                    aria-label="Task due date"
                />
                <button type="submit" className="btn-primary inline-flex items-center gap-2 flex-shrink-0">
                    <PlusIcon className="w-5 h-5" /> Add
                </button>
            </form>
            
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">To-Do ({incompleteTasks.length})</h4>
                        <div className="flex items-center gap-2">
                            <label htmlFor="task-sort" className="text-sm font-medium text-slate-500 dark:text-slate-400">Sort by:</label>
                            <select id="task-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'dueDate')} className="form-select text-sm p-1 rounded-md border-slate-300 dark:border-slate-600 dark:bg-slate-700">
                                <option value="createdAt">Creation Date</option>
                                <option value="dueDate">Due Date</option>
                            </select>
                        </div>
                    </div>
                    <ul className="space-y-2">
                        {incompleteTasks.map(task => {
                            const isOverdue = task.dueDate && !task.isComplete && new Date(task.dueDate + 'T23:59:59') < new Date();
                            return (
                                <li key={task.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleCompleteTask(task.id)}
                                            className="p-0 border-0 bg-transparent flex-shrink-0 flex items-center gap-3 group"
                                            aria-label={`Mark task '${task.title}' as complete`}
                                        >
                                            <div className="h-5 w-5 rounded border-2 border-slate-300 dark:border-slate-500 group-hover:border-[var(--color-primary)] transition-colors"></div>
                                            <div>
                                                <span className="text-sm text-slate-800 dark:text-slate-200 group-hover:text-[var(--color-primary)] transition-colors">{task.title}</span>
                                                {task.dueDate && (
                                                    <span className={`block text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        Due: {new Date(task.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        {isOverdue && ' (Overdue)'}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                    <button onClick={() => onDeleteTask(task.id)} className="text-slate-400 hover:text-red-500 p-1 flex-shrink-0" aria-label={`Delete task '${task.title}'`}>
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </li>
                            );
                        })}
                         {incompleteTasks.length === 0 && <p className="text-sm text-slate-400 italic px-2">Nothing to do!</p>}
                    </ul>
                </div>
                {completeTasks.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Completed ({completeTasks.length})</h4>
                        <ul className="space-y-2">
                            {completeTasks.map(task => (
                                <li key={task.id} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-900/50 rounded-md opacity-70">
                                    <div className="flex items-center gap-3">
                                        {justCompletedTaskId === task.id ? (
                                            <>
                                                <CheckCircleIcon key={task.id} className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                <span className="text-sm text-slate-500 dark:text-slate-400 line-through">{task.title}</span>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => onUpdateTask(task.id, false)}
                                                className="p-0 border-0 bg-transparent flex-shrink-0 flex items-center gap-3 group"
                                                aria-label={`Mark task '${task.title}' as incomplete`}
                                            >
                                                <div className="h-5 w-5 flex items-center justify-center rounded bg-[var(--color-primary)] text-white flex-shrink-0 group-hover:bg-slate-400 transition-colors">
                                                    <CheckIcon className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm text-slate-500 dark:text-slate-400 line-through group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">{task.title}</span>
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={() => onDeleteTask(task.id)} className="text-slate-400 hover:text-red-500 p-1 flex-shrink-0" aria-label={`Delete task '${task.title}'`}>
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <style>{`
                .form-input, .form-select { display: block; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .btn-primary:hover { filter: brightness(0.9); }
            `}</style>
        </div>
    );
};