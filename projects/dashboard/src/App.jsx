import { useState, useEffect } from 'react'

function App() {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const API_URL = 'https://api-service-nm65jwwkta-uc.a.run.app/api/projects'

    useEffect(() => {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                setProjects(data)
                setLoading(false)
            })
            .catch(err => {
                console.error('Error fetching projects:', err)
                setLoading(false)
            })
    }, [])

    return (
        <div className="container">
            <header className="header">
                <h1>Project Hub Dashboard</h1>
                <p>Gestionando el futuro de Antigravity con Javi</p>
            </header>

            <main className="dashboard-grid">
                {loading ? (
                    <div className="loader">Cargando proyectos...</div>
                ) : projects.length === 0 ? (
                    <p className="empty-msg">No hay proyectos registrados aún.</p>
                ) : (
                    projects.map(project => (
                        <div key={project.id} className="project-card">
                            <div className="card-badge">{project.status}</div>
                            <h3>{project.name}</h3>
                            <p className="owner">Owner: {project.owner}</p>
                            <span className="timestamp">Creado: {new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                    ))
                )}
            </main>

            <footer className="footer">
                <div className="shimmer-dot"></div>
                <span>Rosa DevOps AI Agent</span>
            </footer>
        </div>
    )
}

export default App
