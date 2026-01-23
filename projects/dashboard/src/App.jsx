import { useState, useEffect } from 'react'
import { auth } from './firebase-config'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import OneTapLogin from './OneTapLogin'

function App() {
    const [user, setUser] = useState(null)
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const API_URL = 'https://api-service-nm65jwwkta-uc.a.run.app/api/projects'

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
            if (currentUser) {
                fetchProjects()
            } else {
                setLoading(false)
            }
        })
        return () => unsubscribe()
    }, [])

    const fetchProjects = async () => {
        try {
            const token = await auth.currentUser.getIdToken()
            const response = await fetch(API_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setProjects(data)
        } catch (err) {
            console.error('Error fetching projects:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        signOut(auth)
    }

    if (!user && !loading) {
        return <OneTapLogin onLogin={setUser} />
    }

    return (
        <div className="container">
            <header className="header">
                <div className="user-info">
                    {user && (
                        <>
                            <span>Hola, {user.displayName}</span>
                            <button className="logout-btn" onClick={handleLogout}>Cerrar Sesión</button>
                        </>
                    )}
                </div>
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
