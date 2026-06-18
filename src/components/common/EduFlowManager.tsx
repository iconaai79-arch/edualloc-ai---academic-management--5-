import React, { useState, useEffect, useMemo } from 'react';
import { 
    ClipboardList, Plus, Search, Filter, Calendar as CalendarIcon, 
    List as ListIcon, Columns, Trash2, Edit, Clock, User as UserIcon, 
    CheckCircle, XCircle, AlertCircle, MessageSquare, Tag, CheckSquare, 
    Square, Send, BookOpen, AlertTriangle
} from 'lucide-react';
import type { User, Subject, Course, Institution, EduFlowTask, EduFlowComment, Department } from '../../types';
import { apiService } from '../../services/apiService';

interface EduFlowManagerProps {
    context: 'academic' | 'driving_school';
    currentUser: User;
    currentInstitution: Institution | null;
    subjects: Subject[];
    users: User[];
    courses: Course[];
    departments?: Department[];
}

export const EduFlowManager: React.FC<EduFlowManagerProps> = ({
    context,
    currentUser,
    currentInstitution,
    subjects = [],
    users = [],
    courses = [],
    departments = []
}) => {
    // Helper function to check if a user role is a staff role
    const isStaff = (role: string): boolean => {
        const staffRoles = [
            'admin', 'super_admin', 'deputy', 'hod', 'tto', 'lecturer', 
            'practice_teacher', 'academics_officer', 'head_teacher', 'dos', 
            'teacher', 'librarian', 'security', 'info_desk', 'store', 
            'boarding_master', 'driver', 'transport_assistant', 'reseller', 
            'finance', 'finance_officer', 'hr_officer', 'nurse', 'hoi', 
            'director', 'managing_director'
        ];
        return staffRoles.includes(role);
    };
    // State management
    const [tasks, setTasks] = useState<EduFlowTask[]>([]);
    const [comments, setComments] = useState<EduFlowComment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeView, setActiveView] = useState<'board' | 'list' | 'calendar'>('board');
    
    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [assigneeFilter, setAssigneeFilter] = useState<string>('all'); // 'all', 'me', or userId

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<EduFlowTask | null>(null);

    // Form states
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'Normal' as EduFlowTask['priority'],
        status: 'todo' as EduFlowTask['status'],
        dueDate: '',
        subjectId: '',
        cohortId: '',
        assignToCohort: false
    });
    const [newCommentBody, setNewCommentBody] = useState('');
    const [newSubtaskText, setNewSubtaskText] = useState('');

    // Fetch tasks & comments on mount / change
    const loadTasksAndComments = async () => {
        if (!currentInstitution) return;
        setIsLoading(true);
        try {
            const fetchedTasks = await apiService.fetchModuleRecords<EduFlowTask>('eduflow_tasks', currentInstitution.id);
            const fetchedComments = await apiService.fetchModuleRecords<EduFlowComment>('eduflow_comments', currentInstitution.id);
            setTasks(fetchedTasks || []);
            setComments(fetchedComments || []);
        } catch (error) {
            console.error("Failed to load EduFlow records:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTasksAndComments();
    }, [currentInstitution?.id]);

    // Available cohorts based on context
    const cohorts = useMemo(() => {
        if (context === 'driving_school') {
            // Deduplicate license categories
            const categories = new Set<string>();
            users.forEach(u => {
                if (u.metadata?.licenseCategory) categories.add(u.metadata.licenseCategory);
            });
            return Array.from(categories);
        } else {
            // Deduplicate grade levels / streams
            const levels = new Set<string>();
            users.forEach(u => {
                if (u.metadata?.gradeLevel) levels.add(u.metadata.gradeLevel);
            });
            return Array.from(levels);
        }
    }, [users, context]);

    // Fetch cohort students to clone tasks
    const getStudentsInCohort = (cohortId: string): User[] => {
        return users.filter(u => {
            const matchesRole = u.role === 'student' || u.role === 'member';
            const matchesCohort = context === 'driving_school' 
                ? u.metadata?.licenseCategory === cohortId
                : u.metadata?.gradeLevel === cohortId;
            return matchesRole && matchesCohort;
        });
    };

    // Filters logic
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
            const matchesSubject = subjectFilter === 'all' || t.subjectId === subjectFilter;
            
            let matchesAssignee = true;
            if (assigneeFilter === 'me') {
                matchesAssignee = t.assignedTo === currentUser.id;
            } else if (assigneeFilter !== 'all') {
                matchesAssignee = t.assignedTo === assigneeFilter;
            }
            
            return matchesSearch && matchesStatus && matchesPriority && matchesSubject && matchesAssignee;
        });
    }, [tasks, searchQuery, statusFilter, priorityFilter, subjectFilter, assigneeFilter, currentUser.id]);

    // Create / Update task
    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentInstitution || !taskForm.title.trim()) return;

        try {
            const taskId = selectedTask?.id || 'task_' + Math.random().toString(36).slice(2, 11);
            
            if (!selectedTask && taskForm.assignToCohort && taskForm.cohortId) {
                // Distribute task to entire cohort: clone task for each student
                const students = getStudentsInCohort(taskForm.cohortId);
                if (students.length === 0) {
                    alert("No students found in the selected cohort!");
                    return;
                }

                if (!window.confirm(`This will distribute separate copies of this task to all ${students.length} student(s) in cohort "${taskForm.cohortId}". Continue?`)) {
                    return;
                }

                const cloneTasks: EduFlowTask[] = students.map(student => ({
                    id: 'task_' + Math.random().toString(36).slice(2, 11) + '_' + student.id.slice(-4),
                    institutionId: currentInstitution.id,
                    title: taskForm.title,
                    description: taskForm.description,
                    assignedTo: student.id,
                    createdBy: currentUser.id,
                    status: 'todo',
                    priority: taskForm.priority,
                    dueDate: taskForm.dueDate || undefined,
                    cohortId: taskForm.cohortId,
                    subjectId: taskForm.subjectId || undefined,
                    checklists: [],
                    createdAt: new Date().toISOString()
                }));

                // Batch save using loop over saveModuleRecord
                for (const t of cloneTasks) {
                    await apiService.saveModuleRecord('eduflow_tasks', t);
                }

                alert(`Successfully distributed ${students.length} tasks.`);
            } else {
                // Single task creation / update
                const taskPayload: EduFlowTask = {
                    id: taskId,
                    institutionId: currentInstitution.id,
                    title: taskForm.title,
                    description: taskForm.description,
                    assignedTo: taskForm.assignedTo || undefined,
                    createdBy: selectedTask ? selectedTask.createdBy : currentUser.id,
                    status: taskForm.status,
                    priority: taskForm.priority,
                    dueDate: taskForm.dueDate || undefined,
                    cohortId: taskForm.cohortId || undefined,
                    subjectId: taskForm.subjectId || undefined,
                    checklists: selectedTask ? (selectedTask.checklists || []) : [],
                    createdAt: selectedTask ? selectedTask.createdAt : new Date().toISOString()
                };

                await apiService.saveModuleRecord('eduflow_tasks', taskPayload);
            }

            loadTasksAndComments();
            setIsCreateModalOpen(false);
            setSelectedTask(null);
            resetForm();
        } catch (error) {
            console.error("Save task failed:", error);
            alert("Failed to save task.");
        }
    };

    // Move task status directly (Kanban)
    const handleMoveStatus = async (task: EduFlowTask, newStatus: EduFlowTask['status']) => {
        try {
            const updatedTask = { ...task, status: newStatus };
            await apiService.saveModuleRecord('eduflow_tasks', updatedTask);
            setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
        } catch (error) {
            console.error("Failed to move status:", error);
        }
    };

    // Delete task
    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm("Are you sure you want to delete this task? This cannot be undone.")) return;
        try {
            await apiService.deleteModuleRecord('eduflow_tasks', taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setIsDetailModalOpen(false);
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    };

    // Subtasks Checklist toggles
    const handleAddSubtask = async () => {
        if (!selectedTask || !newSubtaskText.trim()) return;
        const newSub = {
            id: 'sub_' + Math.random().toString(36).slice(2, 9),
            text: newSubtaskText,
            isDone: false
        };
        const updatedChecklists = [...(selectedTask.checklists || []), newSub];
        const updatedTask = { ...selectedTask, checklists: updatedChecklists };

        try {
            await apiService.saveModuleRecord('eduflow_tasks', updatedTask);
            setSelectedTask(updatedTask);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
            setNewSubtaskText('');
        } catch (error) {
            console.error("Failed to add subtask:", error);
        }
    };

    const handleToggleSubtask = async (subId: string) => {
        if (!selectedTask) return;
        const updatedChecklists = (selectedTask.checklists || []).map(sub => 
            sub.id === subId ? { ...sub, isDone: !sub.isDone } : sub
        );
        const updatedTask = { ...selectedTask, checklists: updatedChecklists };

        try {
            await apiService.saveModuleRecord('eduflow_tasks', updatedTask);
            setSelectedTask(updatedTask);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
        } catch (error) {
            console.error("Failed to toggle subtask:", error);
        }
    };

    const handleDeleteSubtask = async (subId: string) => {
        if (!selectedTask) return;
        const updatedChecklists = (selectedTask.checklists || []).filter(sub => sub.id !== subId);
        const updatedTask = { ...selectedTask, checklists: updatedChecklists };

        try {
            await apiService.saveModuleRecord('eduflow_tasks', updatedTask);
            setSelectedTask(updatedTask);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
        } catch (error) {
            console.error("Failed to delete subtask:", error);
        }
    };

    // Comment operations
    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask || !newCommentBody.trim() || !currentInstitution) return;

        const newComment: EduFlowComment = {
            id: 'comm_' + Math.random().toString(36).slice(2, 11),
            taskId: selectedTask.id,
            userId: currentUser.id,
            body: newCommentBody,
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('eduflow_comments', newComment);
            setComments(prev => [newComment, ...prev]);
            setNewCommentBody('');
        } catch (error) {
            console.error("Failed to add comment:", error);
        }
    };

    // Helper formats
    const resetForm = () => {
        setTaskForm({
            title: '',
            description: '',
            assignedTo: '',
            priority: 'Normal',
            status: 'todo',
            dueDate: '',
            subjectId: '',
            cohortId: '',
            assignToCohort: false
        });
    };

    const openEditForm = (task: EduFlowTask) => {
        setSelectedTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || '',
            assignedTo: task.assignedTo || '',
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
            subjectId: task.subjectId || '',
            cohortId: task.cohortId || '',
            assignToCohort: false
        });
        setIsCreateModalOpen(true);
    };

    // Date grouping for calendar view
    const calendarTasksMap = useMemo(() => {
        const map: Record<string, EduFlowTask[]> = {};
        filteredTasks.forEach(task => {
            if (task.dueDate) {
                const day = task.dueDate.split('T')[0];
                if (!map[day]) map[day] = [];
                map[day].push(task);
            }
        });
        return map;
    }, [filteredTasks]);

    // Calendar day cells helper (simple 35 day grid around current month)
    const calendarDays = useMemo(() => {
        const days = [];
        const base = new Date();
        const firstDayOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
        const startOffset = firstDayOfMonth.getDay(); // 0 is Sunday
        
        // Go back to the preceding Sunday
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startOffset);

        for (let i = 0; i < 35; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    return (
        <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
            {/* Header section */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight">EduFlow Tasks</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Custom Academic Project & Assignments Hub</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-stretch md:self-auto">
                    {/* View Switchers */}
                    <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shrink-0">
                        <button
                            onClick={() => setActiveView('board')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeView === 'board' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <Columns className="w-3.5 h-3.5" /> Board
                        </button>
                        <button
                            onClick={() => setActiveView('list')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeView === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <ListIcon className="w-3.5 h-3.5" /> List
                        </button>
                        <button
                            onClick={() => setActiveView('calendar')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeView === 'calendar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <CalendarIcon className="w-3.5 h-3.5" /> Calendar
                        </button>
                    </div>

                    <button
                        onClick={() => { resetForm(); setSelectedTask(null); setIsCreateModalOpen(true); }}
                        className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Create Task
                    </button>
                </div>
            </div>

            {/* Filter Dashboard */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 text-xs font-bold">
                <div className="relative">
                    <span className="block text-[9px] uppercase text-slate-400 mb-1 ml-1">Search</span>
                    <input
                        type="text"
                        placeholder="Keyword search..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <span className="block text-[9px] uppercase text-slate-400 mb-1 ml-1">Status</span>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none">
                        <option value="all">All Statuses</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Under Review</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                <div>
                    <span className="block text-[9px] uppercase text-slate-400 mb-1 ml-1">Priority</span>
                    <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none">
                        <option value="all">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>

                <div>
                    <span className="block text-[9px] uppercase text-slate-400 mb-1 ml-1">Subject</span>
                    <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none">
                        <option value="all">All Subjects</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                </div>

                <div>
                    <span className="block text-[9px] uppercase text-slate-400 mb-1 ml-1">Assignee</span>
                    <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none">
                        <option value="all">All Assignees</option>
                        <option value="me">Assigned to Me</option>
                        <optgroup label="Staff Members" className="font-bold text-slate-500">
                            {users.filter(u => u.id !== currentUser.id && isStaff(u.role)).map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                            ))}
                        </optgroup>
                        <optgroup label="Students / Members" className="font-bold text-slate-500">
                            {users.filter(u => u.id !== currentUser.id && !isStaff(u.role)).map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                            ))}
                        </optgroup>
                    </select>
                </div>
            </div>

            {/* Board / Kanban View */}
            {activeView === 'board' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    {(['todo', 'in_progress', 'review', 'completed'] as const).map(column => {
                        const columnTasks = filteredTasks.filter(t => t.status === column);
                        const columnName: Record<string, string> = {
                            todo: 'To Do',
                            in_progress: 'In Progress',
                            review: 'Under Review',
                            completed: 'Completed'
                        };
                        const columnBorder: Record<string, string> = {
                            todo: 'border-t-slate-400',
                            in_progress: 'border-t-indigo-500',
                            review: 'border-t-amber-500',
                            completed: 'border-t-emerald-500'
                        };

                        return (
                            <div key={column} className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-250 dark:border-slate-700 border-t-4 ${columnBorder[column]} shadow-sm p-4 space-y-4`}>
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-550 dark:text-slate-350">{columnName[column]}</span>
                                    <span className="bg-slate-100 dark:bg-slate-900 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-black">{columnTasks.length}</span>
                                </div>

                                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
                                    {columnTasks.map(task => {
                                        const assignee = users.find(u => u.id === task.assignedTo);
                                        const subject = subjects.find(s => s.id === task.subjectId);
                                        
                                        const priorityColor: Record<string, string> = {
                                            Low: 'bg-slate-100 dark:bg-slate-900 text-slate-550',
                                            Normal: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600',
                                            High: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600',
                                            Urgent: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200/20'
                                        };

                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 p-4 rounded-xl hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer space-y-3"
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className="text-xs font-black tracking-tight leading-tight text-slate-900 dark:text-white line-clamp-2">{task.title}</h4>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shrink-0 ${priorityColor[task.priority]}`}>{task.priority}</span>
                                                </div>

                                                {task.description && (
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2">{task.description}</p>
                                                )}

                                                {/* Meta Row */}
                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
                                                    </span>
                                                    
                                                    {assignee && (
                                                        <span className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-full text-slate-500">
                                                            <UserIcon className="w-2.5 h-2.5" />
                                                            {assignee.name.split(' ')[0]}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Subject Tag */}
                                                {subject && (
                                                    <div className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-black">
                                                        <BookOpen className="w-2.5 h-2.5" />
                                                        {subject.code}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {columnTasks.length === 0 && (
                                        <div className="text-center py-8 text-slate-350 dark:text-slate-655 font-semibold text-[10px] italic">
                                            No tasks in this stage
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* List View */}
            {activeView === 'list' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="py-3.5 px-6">Task Title</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-4">Priority</th>
                                    <th className="py-3.5 px-4">Subject</th>
                                    <th className="py-3.5 px-4">Assignee</th>
                                    <th className="py-3.5 px-4">Due Date</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-bold">
                                {filteredTasks.map(task => {
                                    const assignee = users.find(u => u.id === task.assignedTo);
                                    const subject = subjects.find(s => s.id === task.subjectId);
                                    
                                    const statusCls: Record<string, string> = {
                                        todo: 'bg-slate-100 text-slate-500 border border-slate-200',
                                        in_progress: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
                                        review: 'bg-amber-50 text-amber-600 border border-amber-100',
                                        completed: 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    };

                                    return (
                                        <tr 
                                            key={task.id} 
                                            onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors"
                                        >
                                            <td className="py-4 px-6 min-w-[200px]">
                                                <p className="font-black text-slate-900 dark:text-white">{task.title}</p>
                                                {task.description && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 font-semibold">{task.description}</p>}
                                            </td>
                                            <td className="py-4 px-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${statusCls[task.status]}`}>
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 whitespace-nowrap">
                                                <span className="text-[10px] font-mono">{task.priority}</span>
                                            </td>
                                            <td className="py-4 px-4 whitespace-nowrap text-indigo-650 dark:text-indigo-400 uppercase tracking-widest text-[9px]">
                                                {subject ? `${subject.code}` : '—'}
                                            </td>
                                            <td className="py-4 px-4 whitespace-nowrap">
                                                {assignee ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-[10px] uppercase font-black text-slate-600">
                                                            {assignee.name.charAt(0)}
                                                        </div>
                                                        <span>{assignee.name}</span>
                                                    </span>
                                                ) : <span className="text-slate-400 italic font-semibold">Unassigned</span>}
                                            </td>
                                            <td className="py-4 px-4 whitespace-nowrap text-slate-500 font-mono">
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="py-4 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => openEditForm(task)} className="p-1 hover:bg-slate-100 rounded text-slate-550"><Edit className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteTask(task.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-xs">
                                            No tasks found matching criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Calendar View */}
            {activeView === 'calendar' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-5">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 text-xs font-black uppercase tracking-wider text-slate-400">
                        <span>Calendar Timeline ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</span>
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-2xl overflow-hidden text-center text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="bg-slate-50 dark:bg-slate-900 py-3">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-2xl overflow-hidden mt-1 text-xs">
                        {calendarDays.map((date, idx) => {
                            const dateString = date.toISOString().split('T')[0];
                            const dayTasks = calendarTasksMap[dateString] || [];
                            const isCurrentMonth = date.getMonth() === new Date().getMonth();
                            const isToday = date.toDateString() === new Date().toDateString();

                            return (
                                <div 
                                    key={idx} 
                                    className={`bg-white dark:bg-slate-850 p-2 min-h-[100px] flex flex-col gap-1 transition-all ${isCurrentMonth ? '' : 'opacity-40'} ${isToday ? 'border-2 border-indigo-500' : ''}`}
                                >
                                    <span className={`text-[10px] font-black self-end ${isToday ? 'bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow' : 'text-slate-500'}`}>
                                        {date.getDate()}
                                    </span>
                                    
                                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
                                        {dayTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate cursor-pointer transition-transform hover:scale-102 border ${
                                                    task.status === 'completed' 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}
                                            >
                                                {task.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== TASK CREATE / EDIT MODAL ===== */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                {selectedTask ? 'Modify Task Details' : 'Configure New Task'}
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><XCircle className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleSaveTask} className="p-6 space-y-4 text-xs font-bold text-slate-650">
                            <div>
                                <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Task Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={taskForm.title}
                                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                    placeholder="e.g., Syllabus Outline drafting"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                                <textarea
                                    value={taskForm.description}
                                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                    placeholder="Brief task outline or instructions..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                                    <select 
                                        value={taskForm.priority} 
                                        onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Normal">Normal</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                                    <select 
                                        value={taskForm.status} 
                                        onChange={e => setTaskForm({ ...taskForm, status: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none"
                                    >
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="review">Under Review</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={taskForm.dueDate}
                                        onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Subject</label>
                                    <select 
                                        value={taskForm.subjectId} 
                                        onChange={e => setTaskForm({ ...taskForm, subjectId: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none"
                                    >
                                        <option value="">Select Subject...</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Class/Cohort assignment configuration (Available when creating a new task for admins/teachers) */}
                            {!selectedTask && (currentUser.role === 'admin' || currentUser.role === 'teacher' || currentUser.role === 'lecturer' || currentUser.role === 'super_admin') && (
                                <div className="border border-indigo-100 dark:border-indigo-900 bg-indigo-500/5 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="assignToCohort"
                                            checked={taskForm.assignToCohort}
                                            onChange={e => setTaskForm({ ...taskForm, assignToCohort: e.target.checked })}
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300"
                                        />
                                        <label htmlFor="assignToCohort" className="text-slate-750 dark:text-slate-300 select-none">Assign to entire Class / Cohort</label>
                                    </div>

                                    {taskForm.assignToCohort && (
                                        <div>
                                            <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1 ml-1">Target Cohort *</label>
                                            <select
                                                required={taskForm.assignToCohort}
                                                value={taskForm.cohortId}
                                                onChange={e => setTaskForm({ ...taskForm, cohortId: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none"
                                            >
                                                <option value="">Select Cohort...</option>
                                                {cohorts.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!taskForm.assignToCohort && (
                                <div>
                                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Assignee</label>
                                    <select 
                                        value={taskForm.assignedTo} 
                                        onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none"
                                    >
                                        <option value="">Choose Assignee...</option>
                                        <optgroup label="Staff Members" className="font-bold text-slate-500">
                                            {users.filter(u => isStaff(u.role)).map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Students / Members" className="font-bold text-slate-500">
                                            {users.filter(u => !isStaff(u.role)).map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                            )}

                            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/20 active:scale-95">
                                {selectedTask ? 'Save Modifications' : 'Create Task'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== TASK DETAILS / CHECKLIST / COMMENTS MODAL ===== */}
            {isDetailModalOpen && selectedTask && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl max-h-[85vh] overflow-hidden animate-scale-in flex flex-col">
                                              {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400`}>
                                    Task Details
                                </span>
                                {selectedTask.subjectId && (
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        ({subjects.find(s => s.id === selectedTask.subjectId)?.code})
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {(currentUser.role === 'admin' || currentUser.role === 'super_admin' || selectedTask.createdBy === currentUser.id) && (
                                    <>
                                        <button onClick={() => openEditForm(selectedTask)} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                    </>
                                )}
                                <button onClick={() => setIsDetailModalOpen(false)} className="p-1.5 hover:bg-slate-200 text-slate-400 rounded-lg"><XCircle className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="p-6 flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-5 gap-6">
                            
                            {/* Left Col: Details & Checklist */}
                            <div className="md:col-span-3 space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">{selectedTask.title}</h3>
                                    {selectedTask.description ? (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-pre-wrap">{selectedTask.description}</p>
                                    ) : <p className="text-xs text-slate-450 italic font-medium">No description provided.</p>}
                                </div>

                                {/* Subtasks Checklist */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                                        <CheckSquare className="w-4 h-4" /> Checklist / Subtasks
                                    </h4>

                                    <div className="space-y-2 text-xs font-bold">
                                        {(selectedTask.checklists || []).map(sub => (
                                            <div key={sub.id} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl">
                                                <div className="flex items-center gap-2.5 min-w-0" onClick={() => handleToggleSubtask(sub.id)}>
                                                    <button type="button" className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0">
                                                        {sub.isDone ? <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/10" /> : <Square className="w-4 h-4" />}
                                                    </button>
                                                    <span className={`truncate ${sub.isDone ? 'line-through text-slate-400 font-semibold' : 'text-slate-750 dark:text-slate-200'}`}>{sub.text}</span>
                                                </div>
                                                <button onClick={() => handleDeleteSubtask(sub.id)} className="text-slate-400 hover:text-red-500 p-0.5"><XCircle className="w-3.5 h-3.5" /></button>
                                            </div>
                                        ))}

                                        {/* Subtask Input */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Add subtask checklist item..."
                                                value={newSubtaskText}
                                                onChange={e => setNewSubtaskText(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(); }}
                                                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <button onClick={handleAddSubtask} className="px-3 bg-indigo-550 hover:bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all">Add</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: Meta & Comments */}
                            <div className="md:col-span-2 space-y-6 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-750 pt-6 md:pt-0 md:pl-6 flex flex-col max-h-[70vh]">
                                
                                {/* Meta Data details */}
                                <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-750 p-4 rounded-2xl space-y-3 text-xs font-bold text-slate-550 dark:text-slate-400">
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assignee</span>
                                        <span className="text-slate-800 dark:text-slate-200">
                                            {users.find(u => u.id === selectedTask.assignedTo)?.name || 'Unassigned'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Due Date</span>
                                        <span className="text-slate-800 dark:text-slate-200 font-mono">
                                            {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'No deadline'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Priority</span>
                                        <span className="text-slate-800 dark:text-slate-200">{selectedTask.priority}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</span>
                                        <span className="text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[9px]">{selectedTask.status}</span>
                                    </div>
                                </div>

                                {/* Task comments */}
                                <div className="flex-1 flex flex-col min-h-[220px]">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mb-2">
                                        <MessageSquare className="w-4 h-4" /> Discussion Feed
                                    </h4>

                                    {/* Comments list */}
                                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 max-h-[280px] mb-3 pr-1 text-xs">
                                        {comments.filter(c => c.taskId === selectedTask.id).map(comm => {
                                            const commUser = users.find(u => u.id === comm.userId);
                                            return (
                                                <div key={comm.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl space-y-1">
                                                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                        <span>{commUser?.name || 'Anonymous'}</span>
                                                        <span>{new Date(comm.createdAt).toLocaleTimeString()}</span>
                                                    </div>
                                                    <p className="font-semibold text-slate-850 dark:text-slate-200 leading-normal">{comm.body}</p>
                                                </div>
                                            );
                                        })}
                                        {comments.filter(c => c.taskId === selectedTask.id).length === 0 && (
                                            <div className="text-center py-6 text-slate-400 font-semibold italic">
                                                No comments posted yet.
                                            </div>
                                        )}
                                    </div>

                                    {/* Comment form */}
                                    <form onSubmit={handleAddComment} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Write message..."
                                            value={newCommentBody}
                                            onChange={e => setNewCommentBody(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-bold"
                                        />
                                        <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md"><Send className="w-4 h-4" /></button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
