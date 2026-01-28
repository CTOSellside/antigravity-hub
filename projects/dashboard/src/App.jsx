import { useState, useEffect } from 'react'
import { auth } from './firebase-config'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import OneTapLogin from './OneTapLogin'
import ProjectCharts from './ProjectCharts'
import ChatBubble from './ChatBubble'
import ProfileMenu from './ProfileMenu'

function App() {
    const [user, setUser] = useState(null)
    const [projects, setProjects] = useState([])
    const [profiles, setProfiles] = useState([])
    const [activeProfile, setActiveProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showProfileMenu, setShowProfileMenu] = useState(false)

    const BASE_URL = 'https://api-service-nm65jwwkta-uc.a.run.app/api'

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
            if (currentUser) {
                initDashboard()
            } else {
                setLoading(false)
            }
        })
        return () => unsubscribe()
    }, [])

    const initDashboard = async () => {
        try {
            const token = await auth.currentUser.getIdToken()

            // 1. Fetch Profiles
            const profileRes = await fetch(`${BASE_URL}/profiles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const profileData = await profileRes.json()
            setProfiles(profileData)

            if (profileData.length > 0) {
                const defaultProfile = profileData[0];
                setActiveProfile(defaultProfile);
                fetchProjects(defaultProfile.id, token);
            } else {
                setLoading(false)
            }
        } catch (err) {
            console.error('Error initializing dashboard:', err)
            setLoading(false)
        }
    }

    const fetchProjects = async (profileId, token) => {
        try {
            const authToken = token || await auth.currentUser.getIdToken()
            const response = await fetch(`${BASE_URL}/projects?profileId=${profileId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
            const data = await response.json()
            setProjects(data)
        } catch (err) {
            console.error('Error fetching projects:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleProfileChange = (profile) => {
        setActiveProfile(profile);
        setLoading(true);
        fetchProjects(profile.id);
    }

    const handleAddProfile = async (newProfile) => {
        try {
            const token = await auth.currentUser.getIdToken()
            const response = await fetch(`${BASE_URL}/profiles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newProfile)
            })
            const createdProfile = await response.json()
            setProfiles([...profiles, createdProfile])
        } catch (err) {
            console.error('Error adding profile:', err)
        }
    }

    const handleLogout = () => {
        signOut(auth)
    }

    if (!user && !loading) {
        return <OneTapLogin onLogin={setUser} />
    }

    return (
        <div className="container" style={{ '--profile-color': activeProfile?.color || '#38bdf8' }}>
            <header className="header">
                <div className="header-top">
                    <div className="user-info">
                        {user && (
                            <>
                                <div className="user-pill" onClick={() => setShowProfileMenu(true)}>
                                    <div className="status-dot"></div>
                                    <span>{user.displayName}</span>
                                    <div className="profile-tag" style={{ backgroundColor: activeProfile?.color }}>
                                        {activeProfile?.name}
                                    </div>
                                </div>
                                <button className="logout-btn" onClick={handleLogout}>Cerrar Sesión</button>
                            </>
                        )}
                    </div>
                </div>
                <h1>Project Hub Dashboard</h1>
                <p>Gestionando el futuro de Antigravity en el entorno <strong>{activeProfile?.name}</strong></p>
            </header>

            {showProfileMenu && (
                <ProfileMenu
                    profiles={profiles}
                    activeProfile={activeProfile}
                    onProfileChange={handleProfileChange}
                    onAddProfile={handleAddProfile}
                    onClose={() => setShowProfileMenu(false)}
                />
            )}

            {projects.length > 0 && <ProjectCharts projects={projects} />}

            <main className="dashboard-grid">
                {loading ? (
                    <div className="loader">Cargando proyectos de {activeProfile?.name}...</div>
                ) : projects.length === 0 ? (
                    <p className="empty-msg">No hay proyectos registrados en este perfil.</p>
                ) : (
                    projects.map(project => (
                        <div key={project.id} className="project-card" style={{ borderTopColor: activeProfile?.color }}>
                            <div className="card-badge">{project.status}</div>
                            <h3>{project.name}</h3>
                            <p className="owner">Owner: {project.owner}</p>
                            <span className="timestamp">Creado: {new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                    ))
                )}
            </main>

            <footer className="footer">
                <div className="shimmer-dot" style={{ backgroundColor: activeProfile?.color }}></div>
                <span>Antigravity Multi-Profile Hub</span>
            </footer>

            <ChatBubble />
        </div>
    )
}

export default App
