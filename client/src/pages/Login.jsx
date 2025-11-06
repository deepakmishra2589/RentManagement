import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log('✅ [Login] User already logged in, redirecting to dashboard...');
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = (e) => {
    // CRITICAL: Prevent default form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔄 [Login] Form submitted - page should NOT refresh');
    console.log('📧 Email:', email);
    console.log('🔒 Password length:', password?.length);
    
    // Clear any previous errors
    setError('');
    setFieldErrors({ email: '', password: '' });
    setLoading(true);
    
    // Perform login
    performLogin();
    
    // Return false to prevent any default behavior
    return false;
  };

  const performLogin = async () => {
    try {
      console.log('🔑 [Login] Starting login process...');
      
      if (!email || !password) {
        const fErr = { email: '', password: '' };
        if (!email) fErr.email = 'Email is required';
        if (!password) fErr.password = 'Password is required';
        setFieldErrors(fErr);
        throw new Error('Please fill the required fields');
      }
      
      const result = await login(email, password);
      console.log('✅ [Login] Login successful!', { user: result?.user });
      
      // Navigation is handled by AuthContext
      
    } catch (err) {
      console.error('❌ [Login] Login failed:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status
      });
      
      const status = err?.status || err?.response?.status;
      let errorMessage = err?.response?.data?.message || err?.message;
      if (status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (status === 403) {
        errorMessage = 'Your account is deactivated. Please contact the administrator.';
      }
      if (!errorMessage) {
        errorMessage = 'Failed to log in. Please check your credentials.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('✅ [Login] Login process completed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome back!</h2>
        <p style={styles.subtitle}>
          Don't have an account yet?{' '}
          <Link to="/register" style={styles.link}>
            Create account
          </Link>
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
            {fieldErrors.email && <div style={styles.fieldError}>{fieldErrors.email}</div>}
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            {fieldErrors.password && <div style={styles.fieldError}>{fieldErrors.password}</div>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            onClick={(e) => {
              console.log('🖱️ [Login] Button clicked');
              handleSubmit(e);
            }}
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            aria-busy={loading}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg style={styles.spinner} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"></circle>
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.75"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    margin: '0 0 1rem',
    color: '#333',
    textAlign: 'center'
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: '2rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.875rem',
    color: '#555'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  button: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '0.75rem',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem',
    ':disabled': {
      backgroundColor: '#a5b4fc',
      cursor: 'not-allowed'
    }
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline'
    }
  },
  error: {
    color: '#ef4444',
    backgroundColor: '#fee2e2',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.875rem'
  },
  fieldError: {
    color: '#dc2626',
    fontSize: '0.75rem',
    marginTop: '0.25rem'
  },
  spinner: {
    width: '1rem',
    height: '1rem',
    color: 'white',
    animation: 'spin 1s linear infinite'
  },
  buttonDisabled: {
    backgroundColor: '#a5b4fc',
    cursor: 'not-allowed'
  }
};
