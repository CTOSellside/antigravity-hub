import React, { useState } from 'react';

const ProfileMenu = ({ profiles, activeProfile, onProfileChange, onAddProfile, onClose }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newProfile, setNewProfile] = useState({ name: '', projectId: '', color: '#38bdf8' });

    const handleSubmit = (e) => {
        e.preventDefault();
        onAddProfile(newProfile);
        setNewProfile({ name: '', projectId: '', color: '#38bdf8' });
        setIsAdding(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="profile-menu-container" onClick={(e) => e.stopPropagation()}>
                <div className="menu-header">
                    <h2>Gestión de Entornos</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="profiles-list">
                    {profiles.map((profile) => (
                        <div
                            key={profile.id}
                            className={`profile-item ${activeProfile?.id === profile.id ? 'active' : ''}`}
                            onClick={() => {
                                onProfileChange(profile);
                                onClose();
                            }}
                            style={{ '--item-color': profile.color }}
                        >
                            <div className="profile-icon" style={{ backgroundColor: profile.color }}></div>
                            <div className="profile-details">
                                <span className="p-name">{profile.name}</span>
                                <span className="p-id">{profile.projectId}</span>
                            </div>
                            {activeProfile?.id === profile.id && <div className="active-badge">Activo</div>}
                        </div>
                    ))}
                </div>

                {!isAdding ? (
                    <button className="add-profile-trigger" onClick={() => setIsAdding(true)}>
                        + Añadir Nuevo Entorno
                    </button>
                ) : (
                    <form className="add-profile-form" onSubmit={handleSubmit}>
                        <h3>Nuevo Perfil</h3>
                        <input
                            type="text"
                            placeholder="Nombre (ej. Staging)"
                            required
                            value={newProfile.name}
                            onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="GCP Project ID"
                            required
                            value={newProfile.projectId}
                            onChange={(e) => setNewProfile({ ...newProfile, projectId: e.target.value })}
                        />
                        <div className="color-picker">
                            <label>Color Identidad:</label>
                            <input
                                type="color"
                                value={newProfile.color}
                                onChange={(e) => setNewProfile({ ...newProfile, color: e.target.value })}
                            />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="secondary-btn" onClick={() => setIsAdding(false)}>Cancelar</button>
                            <button type="submit" className="primary-btn">Guardar Perfil</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ProfileMenu;
