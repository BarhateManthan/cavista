import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useSessionPolling = (userId, isVerified) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isVerified) {
      // Bruh, let's keep checking if the session is still alive
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/check-session/${userId}`);
          const data = await response.json();

          if (!data.session_exists) {
            // Damn, session got yeeted. Back to dashboard
            navigate('/dashboard');
          }
        } catch (err) {
          console.error('Bro, something broke while checking session:', err);
        }
      }, 5000); // Checks every 5 seconds, cause patience is overrated

      return () => clearInterval(interval); // Cleanup when component unmounts (no memory leaks here)
    }
  }, [isVerified, userId, navigate]);
};

export default useSessionPolling;