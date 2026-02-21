require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const validator = require('validator');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Require SESSION_SECRET — refuse to start with an insecure default
if (!process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is not set. Create a .env file with a strong random secret.');
    process.exit(1);
}

// Trust proxy only in production (behind Render's reverse proxy)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

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
            connectSrc: ["'self'", "https://api.emailjs.com", "https://*.supabase.co"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://*.openstreetmap.org"],
            workerSrc: ["'self'"],
            manifestSrc: ["'self'"],
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://pintorexconstruction.onrender.com']
        : ['http://localhost:3000'],
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

// Rate limiting for document downloads
const downloadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 downloads per hour per IP
    message: { error: 'Too many download requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// CSRF protection: if the browser sends an Origin header it must match our domain.
// Same-origin fetch() may omit Origin — that's fine. Cross-origin requests always
// include Origin, so a mismatch means a third-party site is attempting CSRF.
const verifyOrigin = (req, res, next) => {
    const origin = req.get('origin');
    if (origin) {
        const allowed = process.env.NODE_ENV === 'production'
            ? 'https://pintorexconstruction.onrender.com'
            : 'http://localhost:3000';
        if (origin !== allowed) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }
    next();
};

// General rate limiting
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false
});

app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
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
app.post('/api/auth/verify', authLimiter, verifyOrigin, async (req, res) => {
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

            // Generate offline access token for PWA (valid 30 days)
            const offlineExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
            const secret = process.env.SESSION_SECRET;
            const tokenData = `pintorex-offline:${offlineExpiry}`;
            const signature = crypto.createHmac('sha256', secret).update(tokenData).digest('hex');
            const offlineToken = Buffer.from(JSON.stringify({
                exp: offlineExpiry,
                sig: signature
            })).toString('base64');

            return res.json({
                success: true,
                message: 'Authentication successful',
                offlineToken: offlineToken
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

// Validate offline token endpoint (for re-validation when back online)
app.post('/api/auth/validate-offline-token', verifyOrigin, (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ valid: false });

        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        if (Date.now() > decoded.exp) return res.json({ valid: false });

        const secret = process.env.SESSION_SECRET;
        const tokenData = `pintorex-offline:${decoded.exp}`;
        const expectedSig = crypto.createHmac('sha256', secret).update(tokenData).digest('hex');

        return res.json({ valid: decoded.sig === expectedSig });
    } catch {
        return res.json({ valid: false });
    }
});

// Logout endpoint
app.post('/api/auth/logout', verifyOrigin, (req, res) => {
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
app.get('/api/documents/company-profile', requireAuth, downloadLimiter, (req, res) => {
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

        // Log submission receipt (no PII in logs)
        console.log('Contact form submission received:', {
            projectType: sanitizedData.projectType,
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

// Serve employee management system
app.get('/employee-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'employee-management.html'));
});

// Serve stock management system
app.get('/stock-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stock-management.html'));
});

// Document verification page (QR code scans)
app.get('/verify/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// Handle 404 - minimal response to avoid serving full index.html on probes
app.use((req, res) => {
    if (req.accepts('html')) {
        res.status(404).send('<!DOCTYPE html><html><head><title>404</title></head><body><h1>Page Not Found</h1><p><a href="/">Return to Pintorex Construction</a></p></body></html>');
    } else {
        res.status(404).json({ error: 'Not found' });
    }
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

    // Keep-alive ping to prevent Render free tier from sleeping after 15 min idle
    if (process.env.NODE_ENV === 'production') {
        setInterval(() => {
            require('http').get(`http://localhost:${PORT}/api/health`, (res) => {
                res.resume(); // discard response body
            }).on('error', () => {}); // ignore errors silently
        }, 5 * 60 * 1000); // every 5 minutes
    }
});
