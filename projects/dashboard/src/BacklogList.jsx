import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Tag } from 'lucide-react';

const BacklogList = ({ apiBaseUrl, auth }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBacklog = async () => {
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch(`${apiBaseUrl}/api/backlog`, {
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
            await fetch(`${apiBaseUrl}/api/backlog/${task.id}`, {
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
                                className={`backlog-item ${task.status === 'Done' ? 'task-done' : ''}`}
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
                                </div>
                                <div className="task-date">
                                    <Clock size={12} />
                                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
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
