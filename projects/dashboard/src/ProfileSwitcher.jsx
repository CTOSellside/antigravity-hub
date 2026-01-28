import React from 'react';

const ProfileSwitcher = ({ profiles, activeProfile, onProfileChange }) => {
    return (
        <div className="profile-switcher">
            <label htmlFor="profile-select">Entorno:</label>
            <div className="select-wrapper">
                <select
                    id="profile-select"
                    value={activeProfile?.id || ''}
                    onChange={(e) => {
                        const profile = profiles.find(p => p.id === e.target.value);
                        onProfileChange(profile);
                    }}
                    style={{ borderColor: activeProfile?.color || '#ccc' }}
                >
                    {profiles.map(profile => (
                        <option key={profile.id} value={profile.id}>
                            {profile.name} ({profile.projectId})
                        </option>
                    ))}
                </select>
                <div className="profile-indicator" style={{ backgroundColor: activeProfile?.color || '#888' }}></div>
            </div>
        </div>
    );
};

export default ProfileSwitcher;
