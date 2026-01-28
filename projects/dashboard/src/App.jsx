import { useState, useEffect } from 'react'
import { auth } from './firebase-config'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import OneTapLogin from './OneTapLogin'
import ProjectCharts from './ProjectCharts'
import ChatBubble from './ChatBubble'
import ProfileMenu from './ProfileMenu'
import ProjectModal from './ProjectModal'
import InventoryHighlights from './InventoryHighlights'
import ScrumMetrics from './ScrumMetrics'
import BacklogList from './BacklogList'
import logoHub from './assets/logo-hub.png'
import logoBrujula from './assets/logo-brujula.png'

function App() {
    const [user, setUser] = useState(null)
    const [projects, setProjects] = useState([])
    const [profiles, setProfiles] = useState([])
    const [activeProfile, setActiveProfile] = useState(null)
    const [inventory, setInventory] = useState([])
    const [scrumData, setScrumData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [invLoading, setInvLoading] = useState(false)
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [showProjectModal, setShowProjectModal] = useState(false)
    const [editingProject, setEditingProject] = useState(null)

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
                const ctoProfile = profileData.find(p => p.name === 'CTO Sellside') || profileData[0];
                setActiveProfile(ctoProfile);
                fetchProjects(ctoProfile.id, token);
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
            fetchScrumMetrics(authToken)

            // Fetch inventory if Repuestos MOM
            const profile = profiles.find(p => p.id === profileId) || activeProfile
            if (profile?.name === 'Repuestos MOM') {
                fetchInventory(authToken)
            } else {
                setInventory([]) // Clear if not Repuestos MOM
            }
        } catch (err) {
            console.error('Error fetching projects:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchInventory = async (token) => {
        setInvLoading(true)
        try {
            const authToken = token || await auth.currentUser.getIdToken()
            const response = await fetch(`${BASE_URL}/inventory`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
            if (response.ok) {
                const data = await response.json()
                setInventory(data)
            }
        } catch (err) {
            console.error('Error fetching inventory:', err)
        } finally {
            setInvLoading(false)
        }
    }

    const fetchScrumMetrics = async (token) => {
        try {
            const authToken = token || await auth.currentUser.getIdToken()
            const response = await fetch(`${BASE_URL}/scrum/metrics`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
            if (response.ok) {
                const data = await response.json()
                setScrumData(data)
            }
        } catch (err) {
            console.error('Error fetching scrum metrics:', err)
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

    const handleSaveProject = async (projectData, projectId) => {
        try {
            const token = await auth.currentUser.getIdToken()
            const url = projectId ? `${BASE_URL}/projects/${projectId}` : `${BASE_URL}/projects`
            const method = projectId ? 'PATCH' : 'POST'

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            })

            if (response.ok) {
                setShowProjectModal(false);
                setEditingProject(null);
                fetchProjects(activeProfile.id); // Refresh
            }
        } catch (err) {
            console.error('Error saving project:', err)
        }
    }

    const handleDeleteProject = async (projectId) => {
        if (!window.confirm('¿Estás seguro de eliminar este proyecto?')) return;
        try {
            const token = await auth.currentUser.getIdToken()
            const response = await fetch(`${BASE_URL}/projects/${projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                fetchProjects(activeProfile.id);
            }
        } catch (err) {
            console.error('Error deleting project:', err)
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
                <img src={logoHub} alt="Antigravity Hub" className="header-logo" />
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
                    {user && (
                        <button className="add-project-btn" onClick={() => { setEditingProject(null); setShowProjectModal(true); }}>
                            + Nuevo Proyecto
                        </button>
                    )}
                </div>
                <h1>Antigravity Hub</h1>
                <p>Navegando hacia el futuro en el entorno <span className="highlight" style={{ color: activeProfile?.color }}>{activeProfile?.name}</span></p>
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

            {showProjectModal && (
                <ProjectModal
                    project={editingProject}
                    profileId={activeProfile?.id}
                    onSave={handleSaveProject}
                    onClose={() => setShowProjectModal(false)}
                />
            )}

            <InventoryHighlights products={inventory} loading={invLoading} />

            {scrumData && (
                <>
                    <ScrumMetrics
                        data={scrumData.burndown}
                        velocity={scrumData.velocity}
                        totalScope={scrumData.totalScope}
                    />
                    <BacklogList
                        apiBaseUrl={BASE_URL}
                        auth={auth}
                    />
                </>
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
                            <div className="card-actions">
                                <button className="icon-btn edit" onClick={() => { setEditingProject(project); setShowProjectModal(true); }}>✎</button>
                                <button className="icon-btn delete" onClick={() => handleDeleteProject(project.id)}>×</button>
                            </div>
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
