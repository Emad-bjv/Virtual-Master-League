import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TEAM_LOGOS } from '../utils/teamLogos';
import './CoachLogin.css';

// Using the dynamic .webp background images from public directory
const BACKGROUND_IMAGES = [
  '/images/1340341.webp',
  '/images/1340344.webp',
  '/images/1378570.webp',
  '/images/here-s-one-last-teaser-for-ea-sports-fc-26-ahead-of-the-july-16-presentation-cover687678b3ac7c0.webp',
  '/images/1401125.webp',
  '/images/1401128.webp',
];

const CoachLogin = () => {
  const navigate = useNavigate();
  const { passwordLogin, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdminNotice, setShowAdminNotice] = useState(false);
  
  // Background Image & Logo States
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Background Image & Logo Playlist Effect
  useEffect(() => {
    const logoList = Object.values(TEAM_LOGOS);
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % BACKGROUND_IMAGES.length);
      setCurrentLogoIndex((prev) => (prev + 1) % logoList.length);
    }, 4000); // 4 seconds per frame

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await passwordLogin(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'نام کاربری یا رمز عبور اشتباه است.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Background Slideshow Layer */}
      <div className="background-slideshow">
        {BACKGROUND_IMAGES.map((imgUrl, index) => (
          <img
            key={index}
            src={imgUrl}
            alt={`Background slide ${index + 1}`}
            className={`bg-slide ${index === currentImageIndex ? 'active' : ''}`}
          />
        ))}
      </div>
      
      {/* Dark Overlay for Readability */}
      <div className="background-overlay"></div>

      {/* Glassmorphism Card */}
      <div className="glass-card">
        <div className="card-header">
          <div className="w-16 h-16 rounded-2xl team-crest-badge p-2 mx-auto mb-3 shadow-[0_0_25px_rgba(255,255,255,0.3)] flex items-center justify-center overflow-hidden">
            <img
              src={Object.values(TEAM_LOGOS)[currentLogoIndex]}
              alt="Club Crest"
              className="w-full h-full object-contain transition-all duration-700"
            />
          </div>
          <h2>Coach Portal</h2>
          <p>Restricted Access</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-banner">{error}</div>}

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your assigned username"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button 
                type="button" 
                className="toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="forgot-link"
              onClick={() => setShowAdminNotice(!showAdminNotice)}
            >
              Forgot Password?
            </button>
            {showAdminNotice && (
              <div className="admin-notice">
                Please contact the System Administrator to reset your credentials.
              </div>
            )}
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? <span className="loader"></span> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CoachLogin;
