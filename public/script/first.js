// ============================================================================
// PINTOREX CONSTRUCTION - MAIN SCRIPT
// Secure, accessible, and performant
// ============================================================================

// Initialize AOS (Animate on Scroll)
AOS.init({
    duration: 1000,
    once: true,
    offset: 100
});

// ============================================================================
// DYNAMIC COPYRIGHT YEAR
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

const Toast = {
    show(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    info(message) { this.show(message, 'info'); }
};

// ============================================================================
// THEME TOGGLE
// ============================================================================

const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function setTheme(theme) {
    if (theme === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
}

function getPreferredTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Set initial theme
setTheme(getPreferredTheme());

// Toggle theme on button click
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = html.classList.contains('dark') ? 'light' : 'dark';
        setTheme(currentTheme);
    });
}

// Listen for OS theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    setTheme(e.matches ? 'dark' : 'light');
});

// ============================================================================
// MOBILE MENU
// ============================================================================

const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuButton && mobileMenu) {
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');

    const openMobileMenu = () => {
        mobileMenu.classList.remove('hidden');
        mobileMenu.setAttribute('aria-hidden', 'false');
        mobileMenuButton.setAttribute('aria-expanded', 'true');
    };

    const closeMobileMenu = () => {
        mobileMenu.classList.add('hidden');
        mobileMenu.setAttribute('aria-hidden', 'true');
        mobileMenuButton.setAttribute('aria-expanded', 'false');
    };

    mobileMenuButton.addEventListener('click', () => {
        const isOpen = !mobileMenu.classList.contains('hidden');
        if (isOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    });

    // Close mobile menu when a link is clicked
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
            closeMobileMenu();
        }
    });
}

// ============================================================================
// SMOOTH SCROLLING
// ============================================================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ============================================================================
// HERO CAROUSEL - RELIABLE IMAGE LOADING
// ============================================================================

const carouselConfig = {
    imagePrefix: 'images/',
    imageStart: 1,
    imageEnd: 215,
    interval: 5000,
    preloadAhead: 5,
    extensions: ['jpeg', 'jpg', 'png']
};

// Ordered list of images confirmed to exist
let discoveredImages = [];
let currentSlideIdx = 0;
let carouselInterval = null;
let discoveryInProgress = false;

const heroCarousel = document.getElementById('carouselImage');
const prevButton = document.querySelector('.carousel-nav.prev');
const nextButton = document.querySelector('.carousel-nav.next');

// Load an image using an Image object (much more reliable than HEAD requests)
function probeImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// Try loading image with different extensions
async function tryLoadImage(index) {
    const baseUrl = `${carouselConfig.imagePrefix}${index}`;
    // Try all extensions in parallel for speed
    const results = await Promise.all(
        carouselConfig.extensions.map(ext => probeImage(`${baseUrl}.${ext}`))
    );
    return results.find(url => url !== null) || null;
}

// Discover all available images in a batch (runs in background)
async function discoverAllImages() {
    if (discoveryInProgress) return;
    discoveryInProgress = true;

    const batchSize = 20;
    for (let start = carouselConfig.imageStart; start <= carouselConfig.imageEnd; start += batchSize) {
        const end = Math.min(start + batchSize - 1, carouselConfig.imageEnd);
        const promises = [];
        for (let i = start; i <= end; i++) {
            // Skip if already discovered
            if (discoveredImages.some(img => img.index === i)) continue;
            promises.push(
                tryLoadImage(i).then(url => {
                    if (url) {
                        discoveredImages.push({ index: i, url });
                        // Keep sorted by index
                        discoveredImages.sort((a, b) => a.index - b.index);
                    }
                })
            );
        }
        await Promise.all(promises);
    }
    discoveryInProgress = false;
}

// Preload images around the current position
function preloadNearby() {
    const idx = currentSlideIdx;
    for (let offset = 1; offset <= carouselConfig.preloadAhead; offset++) {
        const nextIdx = (idx + offset) % discoveredImages.length;
        if (discoveredImages[nextIdx]) {
            const img = new Image();
            img.src = discoveredImages[nextIdx].url;
        }
    }
}

// Show slide by discoveredImages index
function showSlide(idx) {
    if (!heroCarousel || discoveredImages.length === 0) return;
    if (idx < 0) idx = discoveredImages.length - 1;
    if (idx >= discoveredImages.length) idx = 0;
    currentSlideIdx = idx;
    heroCarousel.src = discoveredImages[idx].url;
    preloadNearby();
}

// Next / previous
function nextSlide() {
    showSlide(currentSlideIdx + 1);
}

function prevSlide() {
    showSlide(currentSlideIdx - 1);
}

// Initialize carousel
async function initializeCarousel() {
    if (!heroCarousel) return;

    // Discover the first small batch quickly so the carousel can start
    const initialBatch = [];
    for (let i = carouselConfig.imageStart; i <= Math.min(carouselConfig.imageStart + 9, carouselConfig.imageEnd); i++) {
        initialBatch.push(
            tryLoadImage(i).then(url => {
                if (url) discoveredImages.push({ index: i, url });
            })
        );
    }
    await Promise.all(initialBatch);
    discoveredImages.sort((a, b) => a.index - b.index);

    if (discoveredImages.length > 0) {
        showSlide(0);
        carouselInterval = setInterval(nextSlide, carouselConfig.interval);
    }

    // Continue discovering the rest in the background
    discoverAllImages();
}

// Carousel navigation
if (prevButton) {
    prevButton.addEventListener('click', () => {
        clearInterval(carouselInterval);
        prevSlide();
        carouselInterval = setInterval(nextSlide, carouselConfig.interval);
    });
}

if (nextButton) {
    nextButton.addEventListener('click', () => {
        clearInterval(carouselInterval);
        nextSlide();
        carouselInterval = setInterval(nextSlide, carouselConfig.interval);
    });
}

// Start carousel when DOM is ready
document.addEventListener('DOMContentLoaded', initializeCarousel);

// ============================================================================
// MAP INITIALIZATION
// ============================================================================

let map = null;

function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || typeof L === 'undefined') return;

    // Clear any existing map instance
    if (map) {
        map.remove();
        map = null;
    }

    // Migori Town coordinates
    const migoriCoords = [-1.0634, 34.4731];

    // Initialize the map centered on Migori Town
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false
    }).setView(migoriCoords, 15);

    // Add the tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 3,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Custom marker icon with construction orange color
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: #F97316; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });

    // Add a marker for Pintorex Construction
    L.marker(migoriCoords, { icon: customIcon })
        .addTo(map)
        .bindPopup('<strong>Pintorex Construction Limited</strong><br>Migori Town, Migori County, Kenya<br><a href="https://www.google.com/maps?q=-1.0634,34.4731" target="_blank">Get Directions</a>')
        .openPopup();
}

// Initialize map when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initMap();

    // Safety re-render after AOS animations and service worker settle
    setTimeout(() => { if (map) map.invalidateSize(); }, 1500);

    // Invalidate map size when the map container scrolls into view.
    // This is needed because the parent has data-aos="fade-left" which hides it
    // initially with opacity:0 and a transform. Leaflet needs invalidateSize()
    // called after the container becomes visible to render tiles correctly.
    const mapContainer = document.getElementById('map-container');
    if (mapContainer && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && map) {
                    map.invalidateSize();
                }
            });
        }, { threshold: 0.1 });
        observer.observe(mapContainer);
    }
});

// Handle resize
window.addEventListener('resize', () => {
    if (map) {
        map.invalidateSize();
    }
});

// ============================================================================
// BACK TO TOP BUTTON
// ============================================================================

const backToTopButton = document.getElementById('backToTop');

if (backToTopButton) {
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopButton.classList.remove('hidden');
        } else {
            backToTopButton.classList.add('hidden');
        }
    });

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============================================================================
// QUOTE FORM SUBMISSION
// ============================================================================

const quoteForm = document.getElementById('quoteForm');

if (quoteForm) {
    quoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('quoteSubmitBtn');
        const submitText = document.getElementById('quoteSubmitText');
        const submitSpinner = document.getElementById('quoteSubmitSpinner');

        // Show loading state
        submitBtn.disabled = true;
        submitText.classList.add('hidden');
        submitSpinner.classList.remove('hidden');

        const templateParams = {
            from_name: document.getElementById('name').value,
            from_email: document.getElementById('email').value,
            project_type: document.getElementById('project-type').value,
            message: document.getElementById('message').value
        };

        try {
            await emailjs.send('service_gk27l3l', 'template_4emuh13', templateParams);
            Toast.success('Thank you! Your quote request has been sent. We will contact you soon.');
            quoteForm.reset();
        } catch (error) {
            Toast.error('Failed to send. Please try again or call us directly.');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitText.classList.remove('hidden');
            submitSpinner.classList.add('hidden');
        }
    });
}

// ============================================================================
// PASSWORD PROTECTED PDF DOWNLOAD - SERVER-SIDE AUTHENTICATION
// ============================================================================

const downloadBtn = document.getElementById('downloadBtn');
const passwordModal = document.getElementById('passwordModal');
const closeModal = document.getElementById('closeModal');
const submitPasswordBtn = document.getElementById('submitPassword');
const passwordInput = document.getElementById('pdfPassword');
const passwordError = document.getElementById('passwordError');

if (downloadBtn && passwordModal) {
    // Open modal
    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        passwordModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        passwordInput.focus();
    });

    // Close modal
    function closePasswordModal() {
        passwordModal.classList.add('hidden');
        passwordInput.value = '';
        if (passwordError) passwordError.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (closeModal) {
        closeModal.addEventListener('click', closePasswordModal);
    }

    // Close on backdrop click
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            closePasswordModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !passwordModal.classList.contains('hidden')) {
            closePasswordModal();
        }
    });

    // Submit password - SERVER-SIDE VERIFICATION
    async function verifyPassword() {
        const password = passwordInput.value;

        if (!password) {
            if (passwordError) {
                passwordError.textContent = 'Please enter a password';
                passwordError.classList.remove('hidden');
            }
            return;
        }

        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');

        // Show loading state
        submitPasswordBtn.disabled = true;
        if (submitText) submitText.classList.add('hidden');
        if (submitSpinner) submitSpinner.classList.remove('hidden');
        if (passwordError) passwordError.classList.add('hidden');

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Authentication successful - download file
                closePasswordModal();
                Toast.success('Access granted. Downloading...');

                // Trigger download
                window.location.href = '/api/documents/company-profile';
            } else {
                if (passwordError) {
                    passwordError.textContent = data.error || 'Invalid password';
                    passwordError.classList.remove('hidden');
                }
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            if (passwordError) {
                passwordError.textContent = 'Network error. Please try again.';
                passwordError.classList.remove('hidden');
            }
        } finally {
            // Reset button state
            submitPasswordBtn.disabled = false;
            if (submitText) submitText.classList.remove('hidden');
            if (submitSpinner) submitSpinner.classList.add('hidden');
        }
    }

    submitPasswordBtn.addEventListener('click', verifyPassword);

    // Submit on Enter key
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            verifyPassword();
        }
    });
}

// ============================================================================
// TESTIMONIALS CAROUSEL
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('.testimonials-carousel');
    if (!carousel) return;

    // Clone testimonials for infinite scroll
    const testimonials = carousel.children;
    const clonedTestimonials = Array.from(testimonials).map(t => t.cloneNode(true));
    clonedTestimonials.forEach(clone => carousel.appendChild(clone));

    // Pause on hover
    carousel.addEventListener('mouseenter', () => {
        carousel.style.animationPlayState = 'paused';
    });

    carousel.addEventListener('mouseleave', () => {
        carousel.style.animationPlayState = 'running';
    });
});

// Testimonial navigation
const testimonialPrev = document.getElementById('testimonialPrev');
const testimonialNext = document.getElementById('testimonialNext');
const testimonialsCarousel = document.querySelector('.testimonials-carousel');

if (testimonialPrev && testimonialNext && testimonialsCarousel) {
    testimonialPrev.addEventListener('click', () => {
        testimonialsCarousel.scrollBy({ left: -400, behavior: 'smooth' });
    });

    testimonialNext.addEventListener('click', () => {
        testimonialsCarousel.scrollBy({ left: 400, behavior: 'smooth' });
    });
}

// ============================================================================
// ACCESSIBILITY ENHANCEMENTS
// ============================================================================

// Focus trap for modals
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                e.preventDefault();
            }
        }
    });
}

// Apply focus trap to password modal
if (passwordModal) {
    trapFocus(passwordModal);
}
