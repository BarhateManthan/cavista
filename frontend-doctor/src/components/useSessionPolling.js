import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useSessionPolling = (userId, isVerified) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isVerified) {
      // Start polling to check if the session still exists
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/check-session/${userId}`);
          const data = await response.json();
          if (!data.session_exists) {
            // Session no longer exists, redirect to home screen
            navigate('/dashboard');
          }
        } catch (err) {
          console.error('Error checking session:', err);
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval); // Cleanup interval on unmount
    }
  }, [isVerified, userId, navigate]);
};

export default useSessionPolling;