import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Tag, Zap, Play, Loader2 } from 'lucide-react';

const BacklogList = ({ apiBaseUrl, auth }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [executingId, setExecutingId] = useState(null);
    const [instructions, setInstructions] = useState({});

    const fetchBacklog = async () => {
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch(`${apiBaseUrl}/backlog`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error('Error fetching backlog:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBacklog();
    }, []);

    const toggleTask = async (task) => {
        const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
        try {
            const token = await auth.currentUser.getIdToken();
            await fetch(`${apiBaseUrl}/backlog/${task.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const executeTask = async (e, task) => {
        e.stopPropagation();
        setExecutingId(task.id);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch(`${apiBaseUrl}/backlog/${task.id}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ instructions: instructions[task.id] || '' })
            });
            const result = await response.json();
            alert(`Rosa: ${result.result}`);
            fetchBacklog();
        } catch (error) {
            console.error('Error executing task:', error);
        } finally {
            setExecutingId(null);
        }
    };

    const handleInstructionChange = (id, val) => {
        setInstructions(prev => ({ ...prev, [id]: val }));
    };

    if (loading) return <div className="loading-shimmer">Cargando Backlog...</div>;

    return (
        <section className="backlog-section glass-panel">
            <div className="section-header">
                <h2>📋 Backlog Global</h2>
                <div className="task-count-badge">
                    {tasks.filter(t => t.status !== 'Done').length} pendientes
                </div>
            </div>

            <div className="backlog-container">
                {tasks.length === 0 ? (
                    <div className="empty-state">
                        <p>No hay tareas pendientes en el radar. 🕊️</p>
                    </div>
                ) : (
                    <div className="backlog-list">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className={`backlog-item ${task.status === 'Done' ? 'task-done' : ''} ${task.status === 'In Progress' ? 'task-active' : ''}`}
                                onClick={() => toggleTask(task)}
                            >
                                <div className="task-status-icon">
                                    {task.status === 'Done' ? (
                                        <CheckCircle2 color="#10b981" size={20} />
                                    ) : (
                                        <Circle color="var(--text-dim)" size={20} />
                                    )}
                                </div>
                                <div className="task-content">
                                    <p className="task-title">{task.title}</p>
                                    <div className="task-meta">
                                        <span className={`status-tag ${task.status.toLowerCase().replace(' ', '-')}`}>
                                            {task.status}
                                        </span>
                                        {task.category && (
                                            <span className="category-tag">
                                                <Tag size={10} /> {task.category}
                                            </span>
                                        )}
                                    </div>
                                    {task.status !== 'Done' && (
                                        <div className="task-instructions" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                placeholder="Instrucciones para Rosa..."
                                                value={instructions[task.id] || task.instructions || ''}
                                                onChange={e => handleInstructionChange(task.id, e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="task-actions">
                                    {task.status === 'To Do' && (
                                        <button
                                            className="execute-btn"
                                            disabled={executingId === task.id}
                                            onClick={(e) => executeTask(e, task)}
                                        >
                                            {executingId === task.id ? <Loader2 className="spin" size={16} /> : <Zap size={16} />}
                                            <span>Ejecutar</span>
                                        </button>
                                    )}
                                    <div className="task-date">
                                        <Clock size={12} />
                                        <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default BacklogList;
