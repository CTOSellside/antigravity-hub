import React, { useEffect } from 'react';
import { auth } from './firebase-config';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const OneTapLogin = ({ onLogin }) => {
    const GOOGLE_CLIENT_ID = "598703083226-q07fs3ukm51i202c4au0r7gs9hr385co.apps.googleusercontent.com";

    useEffect(() => {
        /* global google */
        const handleCredentialResponse = (response) => {
            const idToken = response.credential;
            const credential = GoogleAuthProvider.credential(idToken);

            signInWithCredential(auth, credential)
                .then((result) => {
                    console.log("Logged in user:", result.user);
                    onLogin(result.user);
                })
                .catch((error) => {
                    console.error("Auth error:", error);
                });
        };

        const initializeOneTap = () => {
            if (typeof google === 'undefined') return;

            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: false
            });

            google.accounts.id.prompt(); // Display the One Tap prompt
        };

        // Load Google script if not exists
        if (!document.getElementById('google-jsc-script')) {
            const script = document.createElement('script');
            script.id = 'google-jsc-script';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initializeOneTap;
            document.head.appendChild(script);
        } else {
            initializeOneTap();
        }
    }, []);

    return (
        <div className="login-overlay">
            <div className="login-card">
                <h2>Bienvenido, Javi</h2>
                <p>Inicia sesión para gestionar tus proyectos</p>
                <div id="g_id_signin"></div>
            </div>
        </div>
    );
};

export default OneTapLogin;
