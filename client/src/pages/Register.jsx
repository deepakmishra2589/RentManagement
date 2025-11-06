import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const { name, email, password, confirmPassword, phone } = formData;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const fErr = { name: '', email: '', phone: '', password: '', confirmPassword: '' };
    if (!name) fErr.name = 'Name is required';
    if (!email) fErr.email = 'Email is required';
    if (!phone) fErr.phone = 'Phone is required';
    if (!password) fErr.password = 'Password is required';
    if (!confirmPassword) fErr.confirmPassword = 'Confirm your password';
    if (password && confirmPassword && password !== confirmPassword) fErr.confirmPassword = "Passwords don't match";
    setFieldErrors(fErr);
    if (Object.values(fErr).some(Boolean)) return;
    // Role selection removed; default applied on server (Tenant)

    setError('');
    setLoading(true);

    try {
      await register(name, email, password, phone);
      toast.success('User account created successfully');
      setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create an account';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create an account</h2>
        <p style={styles.subtitle}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.formGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={handleChange}
              style={styles.input}
              required
            />
            {fieldErrors.name && <div style={styles.fieldError}>{fieldErrors.name}</div>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              style={styles.input}
              required
            />
            {fieldErrors.email && <div style={styles.fieldError}>{fieldErrors.email}</div>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone</label>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={handleChange}
              style={styles.input}
              required
            />
            {fieldErrors.phone && <div style={styles.fieldError}>{fieldErrors.phone}</div>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={handleChange}
              style={styles.input}
              required
              minLength="6"
            />
            {fieldErrors.password && <div style={styles.fieldError}>{fieldErrors.password}</div>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleChange}
              style={styles.input}
              required
            />
            {fieldErrors.confirmPassword && <div style={styles.fieldError}>{fieldErrors.confirmPassword}</div>}
          </div>

          {/* Role selection removed; admin will assign roles later */}

          <button type="submit" disabled={loading} style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }} aria-busy={loading}>
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg style={styles.spinner} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"></circle>
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.75"></path>
                </svg>
                Creating...
              </span>
            ) : 'Create account'}
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
  }
};
