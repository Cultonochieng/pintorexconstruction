    // Initialize AOS
    AOS.init({
        duration: 1000,
        once: true,
    });

   // Theme toggle functionality
    const themeToggle = document.querySelector('[aria-label="Toggle dark mode"]');
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
        if (savedTheme) {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Set initial theme
    setTheme(getPreferredTheme());

    // Toggle theme when the button is clicked
    themeToggle.addEventListener('click', () => {
        const currentTheme = html.classList.contains('dark') ? 'light' : 'dark';
        setTheme(currentTheme);
    });

    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
    });
    // Animation on scroll
    document.addEventListener('DOMContentLoaded', () => {
      AOS.init({
        duration: 1000,
        once: true,
        offset: 100
      });
    });

    // Mobile menu toggle
    const mobileMenuButton = document.querySelector('.md\\:hidden');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');

    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('-translate-x-full');
    });

    // Close mobile menu when a link is clicked
    mobileMenuLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('-translate-x-full');
      });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (event) => {
      if (!mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
        mobileMenu.classList.add('-translate-x-full');
      }
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
          behavior: 'smooth'
        });
      });
    });

    // Hero carousel configuration
    const carouselConfig = {
        imagePrefix: 'images/', // The directory where images are stored
        imageStart: 1,         // Starting image number
        imageEnd: 215,         // Ending image number
        interval: 5000,       // Time between slides in milliseconds
        extensions: ['jpeg', 'jpg', 'png', 'webp'] // Supported image extensions
    };

    // Hero carousel functionality
    const heroCarousel = document.querySelector('.hero-carousel img');
    let currentSlide = carouselConfig.imageStart;

    // Try loading image with different extensions
    const tryLoadImage = async (baseUrl, extensions) => {
        for (const ext of extensions) {
            const img = new Image();
            const url = `${baseUrl}.${ext}`;
            try {
                const loadPromise = new Promise((resolve, reject) => {
                    img.onload = () => resolve(url);
                    img.onerror = reject;
                });
                img.src = url;
                return await loadPromise;
            } catch (e) {
                continue; // Try next extension if this one fails
            }
        }
        return null; // Return null if no extension works
    };

    // Preload images for smooth transitions
    const preloadImages = async () => {
        const imagePromises = [];
        for (let i = carouselConfig.imageStart; i <= carouselConfig.imageEnd; i++) {
            const baseUrl = `${carouselConfig.imagePrefix}${i}`;
            imagePromises.push(tryLoadImage(baseUrl, carouselConfig.extensions));
        }
        return (await Promise.all(imagePromises)).filter(url => url !== null);
    };

    let availableImages = [];

    // Show slide function
    function showSlide(index) {
        if (availableImages[index - carouselConfig.imageStart]) {
            heroCarousel.src = availableImages[index - carouselConfig.imageStart];
            currentSlide = index;
        }
    }

    // Next slide function
    function nextSlide() {
        const nextIndex = currentSlide >= carouselConfig.imageEnd 
            ? carouselConfig.imageStart 
            : currentSlide + 1;
        showSlide(nextIndex);
    }

    // Initialize carousel
    async function initializeCarousel() {
        availableImages = await preloadImages();
        if (availableImages.length > 0) {
            showSlide(carouselConfig.imageStart);
            setInterval(nextSlide, carouselConfig.interval);
        }
    }

    // Start the carousel when the DOM is loaded
    document.addEventListener('DOMContentLoaded', initializeCarousel);
    
    // Initialize map
    // 1. Define map container with a fixed aspect ratio
    const mapStyles = `
    #map-container {
        position: relative;
        width: 100%;
        max-width: 650px;
        margin: 0 auto;
        padding-bottom: 32%; /* 16:9 aspect ratio */
        height: 0;
        overflow: hidden;
        border-radius: 12px; // Added curved edges
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); // Optional: subtle shadow for depth
    }

    #map {
        position: absolute;
        top: 0;
        left: 0;
        width: 100% !important;
        height: 100% !important;
        border-radius: 12px; // Added curved edges
    }
    
    // Leaflet popup styling for curved edges
    .leaflet-popup-content-wrapper {
        border-radius: 8px;
    }
    
    // Media query for smaller screens
    @media (max-width: 768px) {
        #map-container {
            padding-bottom: 56.25%; // Return to 16:9 aspect ratio on mobile
        }
    }
    `;

    // 2. Create and append styles
    const styleSheet = document.createElement("style");
    styleSheet.innerText = mapStyles;
    document.head.appendChild(styleSheet);

    // 3. Map initialization and management
    let map = null;
    let resizeObserver = null;

    function initMap() {
        // Clear any existing map instance
        if (map) {
            map.remove();
            map = null;
        }

        // Get the map container
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;

        // Create a new map div if it doesn't exist
        let mapDiv = document.getElementById('map');
        if (!mapDiv) {
            mapDiv = document.createElement('div');
            mapDiv.id = 'map';
            mapContainer.appendChild(mapDiv);
        }

        // Initialize the map
        map = L.map('map', {
            zoomControl: false, // We'll add zoom control manually
            attributionControl: false // We'll add attribution manually
        }).setView([-1.069371, 34.469008], 13);

        // Add zoom control to top right
        L.control.zoom({
            position: 'topright'
        }).addTo(map);

        // Add attribution to bottom right
        L.control.attribution({
            position: 'bottomright',
            prefix: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Add the tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            minZoom: 3
        }).addTo(map);

        // Add a marker
        L.marker([-1.0635, 34.4731])
            .addTo(map)
            .bindPopup('Pintorex Construction Limited')
            .openPopup();
    }

    // 4. Handle resize events
    function handleResize() {
        if (map) {
            requestAnimationFrame(() => {
                map.invalidateSize();
            });
        }
    }

    // 5. Initialize everything
    function initializeMapSystem() {
        // Create ResizeObserver
        if (window.ResizeObserver && !resizeObserver) {
            resizeObserver = new ResizeObserver(handleResize);
        }

        // Initial map setup
        initMap();

        // Setup observers and event listeners
        const mapContainer = document.getElementById('map-container');
        if (mapContainer && resizeObserver) {
            resizeObserver.observe(mapContainer);
        }

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
    }

    // 6. Cleanup function
    function cleanupMapSystem() {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        if (map) {
            map.remove();
            map = null;
        }
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
    }

    // 7. Initialize on DOM content loaded
    document.addEventListener('DOMContentLoaded', initializeMapSystem);

    // 8. Cleanup on page unload
    window.addEventListener('unload', cleanupMapSystem);


    // Back to top button
    const backToTopButton = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 100) {
            backToTopButton.classList.remove('hidden');
        } else {
            backToTopButton.classList.add('hidden');
        }
    });

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Form submission
    const quoteForm = document.querySelector('#quote form');
    quoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Add form submission logic here
        alert('Thank you for your inquiry. We will get back to you soon!');
        quoteForm.reset();
    });
    
    window.addEventListener('resize', function() {
    map.invalidateSize();  // Adjust map size on window resize
    });
    
    // Load PDF.js library
    document.addEventListener('DOMContentLoaded', function() {
        // Simple XOR encryption/decryption function
        function xorCrypt(input, key) {
            let output = '';
            for (let i = 0; i < input.length; ++i) {
                output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return output;
        }

        // Base64 encoding and decoding functions
        function b64Encode(str) {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
        }

        function b64Decode(str) {
            return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        }

        // Decrypt the password
        function decryptPassword(encryptedPassword) {
            const key = "PintorexSecretKey"; // This should be a secret key known only to you
            const decoded = b64Decode(encryptedPassword);
            return xorCrypt(decoded, key);
        }

        const downloadBtn = document.getElementById('downloadBtn');
        const passwordModal = document.getElementById('passwordModal');
        const submitPasswordBtn = document.getElementById('submitPassword');
        const passwordInput = document.getElementById('pdfPassword');

        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            passwordModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        });

        submitPasswordBtn.addEventListener('click', function() {
            const enteredPassword = passwordInput.value;
            const correctPassword = decryptPassword(window.encryptedPassword);

            if (enteredPassword === correctPassword) {
                // Proceed with PDF download
                const pdfUrl = 'docs/Company Profile Pintorex.pdf'; // Make sure this path is correct
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = 'Pintorex-Company-Profile-Confidential.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                passwordModal.classList.add('hidden');
                passwordInput.value = '';
                document.body.style.overflow = ''; // Re-enable scrolling
            } else {
                alert('Incorrect password. Access denied.');
            }
        });

        // Close modal if clicking outside
        passwordModal.addEventListener('click', function(e) {
            if (e.target === passwordModal) {
                passwordModal.classList.add('hidden');
                passwordInput.value = '';
                document.body.style.overflow = ''; // Re-enable scrolling
            }
        });
    });
