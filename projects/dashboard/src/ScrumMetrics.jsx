import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingDown, Zap, Target } from 'lucide-react';

const ScrumMetrics = ({ data, velocity, totalScope }) => {
    if (!data || data.length === 0) return null;

    return (
        <section className="scrum-metrics">
            <div className="section-header">
                <h2>📊 Rendimiento Scrum (Burndown)</h2>
                <div className="velocity-badge">
                    <Zap size={14} className="zap-icon" />
                    <span>Velocidad: {velocity} tareas/día</span>
                </div>
            </div>

            <div className="metrics-grid">
                <div className="chart-container glass-panel">
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="#888"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                label={{ value: 'Tareas', angle: -90, position: 'insideLeft', style: { fill: '#888', fontSize: 10 } }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                itemStyle={{ fontSize: '12px' }}
                                labelStyle={{ color: '#fff', marginBottom: '4px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Line
                                type="monotone"
                                dataKey="ideal"
                                stroke="#60a5fa"
                                strokeDasharray="5 5"
                                dot={false}
                                name="Ideal"
                                strokeWidth={2}
                            />
                            <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="#f43f5e"
                                strokeWidth={3}
                                dot={{ fill: '#f43f5e', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Pendientes"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="stats-panel">
                    <div className="stat-card glass-panel">
                        <TrendingDown size={20} color="#f43f5e" />
                        <div className="stat-info">
                            <span className="stat-label">Pendientes</span>
                            <span className="stat-value">{data[data.length - 1].actual}</span>
                        </div>
                    </div>
                    <div className="stat-card glass-panel">
                        <Target size={20} color="#60a5fa" />
                        <div className="stat-info">
                            <span className="stat-label">Alcance Total</span>
                            <span className="stat-value">{totalScope}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ScrumMetrics;
