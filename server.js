require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const validator = require('validator');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render
app.set('trust proxy', 1);

// Security headers with helmet (configured for our needs)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://cdn.tailwindcss.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://unpkg.com"
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://unpkg.com",
                "https://fonts.googleapis.com"
            ],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://api.emailjs.com"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://*.openstreetmap.org"],
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://pintorexconstruction.onrender.com', 'https://www.pintorexconstruction.com']
        : true,
    credentials: true
}));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// General rate limiting
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false
});

app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'pintorex-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// Verify password endpoint
app.post('/api/auth/verify', authLimiter, async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || typeof password !== 'string') {
            return res.status(400).json({ error: 'Password is required' });
        }

        // Sanitize input
        const sanitizedPassword = validator.trim(password);

        // Get stored password hash from environment
        const storedHash = process.env.PASSWORD_HASH;

        if (!storedHash) {
            console.error('PASSWORD_HASH not configured in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Compare password with hash
        const isValid = await bcrypt.compare(sanitizedPassword, storedHash);

        if (isValid) {
            // Set session as authenticated
            req.session.authenticated = true;
            req.session.authTime = Date.now();

            return res.json({
                success: true,
                message: 'Authentication successful'
            });
        } else {
            return res.status(401).json({
                error: 'Invalid password'
            });
        }
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    res.json({
        authenticated: req.session.authenticated === true
    });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// ============================================================================
// PROTECTED ROUTES
// ============================================================================

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.authenticated === true) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Protected PDF download endpoint
app.get('/api/documents/company-profile', requireAuth, (req, res) => {
    const filePath = path.join(__dirname, 'public', 'docs', 'company profile pintorex.pdf');
    res.download(filePath, 'Pintorex-Company-Profile.pdf', (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(404).json({ error: 'File not found' });
        }
    });
});

// ============================================================================
// CONTACT FORM ENDPOINT
// ============================================================================

app.post('/api/contact', rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 submissions per hour
    message: { error: 'Too many submissions. Please try again later.' }
}), (req, res) => {
    try {
        const { name, email, projectType, message } = req.body;

        // Validate required fields
        if (!name || !email || !projectType || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Sanitize inputs
        const sanitizedData = {
            name: validator.escape(validator.trim(name)).substring(0, 100),
            email: validator.normalizeEmail(email),
            projectType: validator.escape(validator.trim(projectType)).substring(0, 50),
            message: validator.escape(validator.trim(message)).substring(0, 1000)
        };

        // Validate email format
        if (!validator.isEmail(sanitizedData.email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Log the contact submission (in production, send email via EmailJS on client-side)
        console.log('Contact form submission:', {
            ...sanitizedData,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Thank you for your inquiry. We will contact you soon!'
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Submission failed' });
    }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Health check for Render
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// FALLBACK ROUTES
// ============================================================================

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve quotation generator
app.get('/quotation-generator', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'quotation-generator.html'));
});

// Handle 404 - serve index.html for SPA-like behavior
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
    console.log(`Pintorex Construction server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
