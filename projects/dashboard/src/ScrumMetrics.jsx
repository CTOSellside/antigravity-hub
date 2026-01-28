import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingDown, Zap, Target } from 'lucide-react';

const ScrumMetrics = ({ data, velocity, totalScope }) => {
    if (!data || data.length === 0) return null;

    // Logic for health indicator
    const lastDay = data[data.length - 1];
    const isOverScope = lastDay.actual > lastDay.ideal;
    const healthStatus = isOverScope ? 'Delayed' : 'On Track';
    const healthColor = isOverScope ? '#f43f5e' : '#10b981';

    return (
        <section className="scrum-metrics">
            <div className="section-header">
                <h2>📈 Rendimiento Scrum</h2>
                <div className="health-pill" style={{ backgroundColor: `${healthColor}20`, color: healthColor, border: `1px solid ${healthColor}40` }}>
                    <div className="status-pulse" style={{ backgroundColor: healthColor }}></div>
                    {healthStatus}
                </div>
                <div className="velocity-badge">
                    <Zap size={14} className="zap-icon" />
                    <span>Velocidad: {velocity} t/día</span>
                </div>
            </div>

            <div className="metrics-grid">
                <div className="chart-container glass-panel">
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorIdeal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                label={{ value: 'Tareas', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                                itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                            <Area
                                type="monotone"
                                dataKey="ideal"
                                stroke="#60a5fa"
                                fillOpacity={1}
                                fill="url(#colorIdeal)"
                                strokeDasharray="5 5"
                                name="Ideal"
                                strokeWidth={2}
                            />
                            <Area
                                type="monotone"
                                dataKey="actual"
                                stroke="#f43f5e"
                                fillOpacity={1}
                                fill="url(#colorActual)"
                                strokeWidth={4}
                                name="Actual"
                                dot={{ fill: '#f43f5e', r: 4, strokeWidth: 2, stroke: '#070b14' }}
                                activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="stats-panel">
                    <div className="stat-card glass-panel highlight-stat">
                        <TrendingDown size={24} color="#f43f5e" />
                        <div className="stat-info">
                            <span className="stat-label">Pendientes</span>
                            <span className="stat-value">{data[data.length - 1].actual}</span>
                        </div>
                    </div>
                    <div className="stat-card glass-panel">
                        <Target size={24} color="#60a5fa" />
                        <div className="stat-info">
                            <span className="stat-label">Total Scope</span>
                            <span className="stat-value">{totalScope}</span>
                        </div>
                    </div>
                    <div className="stat-card glass-panel">
                        <div className="progress-mini">
                            <div className="progress-inner" style={{ width: `${((totalScope - data[data.length - 1].actual) / totalScope) * 100}%` }}></div>
                        </div>
                        <span className="stat-label">Progreso Sprint</span>
                        <span className="stat-small-value">{Math.round(((totalScope - data[data.length - 1].actual) / totalScope) * 100)}%</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ScrumMetrics;
