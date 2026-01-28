import React, { useState, useEffect } from 'react';

const ProjectModal = ({ project, profileId, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        status: 'Planning',
        owner: '',
        profileId: profileId
    });

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || '',
                status: project.status || 'Planning',
                owner: project.owner || '',
                profileId: project.profileId || profileId
            });
        }
    }, [project, profileId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, project?.id);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="project-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="menu-header">
                    <h2>{project ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form className="project-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nombre del Proyecto</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej. API Integration"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Estado</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="Planning">Planning</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Live">Live</option>
                            <option value="On Hold">On Hold</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Owner (Responsable)</label>
                        <input
                            type="text"
                            placeholder="Ej. Javi"
                            value={formData.owner}
                            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="primary-btn">
                            {project ? 'Actualizar' : 'Crear Proyecto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectModal;
