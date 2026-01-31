/* ========================================
   ECFS Landing Page Main JavaScript
   Handles: Navigation, Calculator, Form, Analytics, FAQs
   ======================================== */

// ============================================
// 1. INITIALIZATION & ANALYTICS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('ECFS Landing Page Loaded');
    
    // Initialize Analytics
    initAnalytics();
    
    // Initialize All Components
    initMobileMenu();
    initStickyHeader();
    initSmoothScroll();
    initCalculator();
    initFAQ();
    initLeadForm();
    captureUTMParameters();
});

// Initialize Google Analytics & Facebook Pixel
function initAnalytics() {
    if (!CONFIG.analytics.enableAnalytics) {
        console.log('Analytics disabled in config');
        return;
    }

    // Google Analytics 4
    if (CONFIG.analytics.googleAnalyticsId && CONFIG.analytics.googleAnalyticsId !== 'G-XXXXXXXXXX') {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.analytics.googleAnalyticsId}`;
        document.head.appendChild(gaScript);

        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', CONFIG.analytics.googleAnalyticsId);
        
        console.log('Google Analytics initialized');
    }

    // Facebook Pixel
    if (CONFIG.analytics.facebookPixelId) {
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', CONFIG.analytics.facebookPixelId);
        fbq('track', 'PageView');
        
        console.log('Facebook Pixel initialized');
    }
}

// Track Custom Events
function trackEvent(eventName, eventData = {}) {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, eventData);
    }
    
    console.log('Event tracked:', eventName, eventData);
}

// ============================================
// 2. NAVIGATION & UI COMPONENTS
// ============================================

// Mobile Menu Toggle
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (!menuBtn || !mobileMenu) return;
    
    menuBtn.addEventListener('click', function() {
        mobileMenu.classList.toggle('active');
        const isActive = mobileMenu.classList.contains('active');
        
        // Toggle icon
        const icon = menuBtn.querySelector('i');
        icon.classList.toggle('fa-bars', !isActive);
        icon.classList.toggle('fa-times', isActive);
        
        trackEvent('mobile_menu_toggle', { action: isActive ? 'open' : 'close' });
    });
    
    // Close menu when clicking on a link
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            const icon = menuBtn.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        });
    });
}

// Sticky Header on Scroll
function initStickyHeader() {
    const header = document.getElementById('header');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
}

// Smooth Scroll for Anchor Links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') {
                e.preventDefault();
                return;
            }
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerHeight = document.getElementById('header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                trackEvent('navigation_click', { section: href });
            }
        });
    });
}

// ============================================
// 3. INTERACTIVE CALCULATOR
// ============================================

function initCalculator() {
    const investmentInput = document.getElementById('investment-amount');
    const monthlyDistribution = document.getElementById('monthly-distribution');
    const bufferTarget = document.getElementById('buffer-target');
    const annualDistribution = document.getElementById('annual-distribution');
    const annualReturn = document.getElementById('annual-return');
    
    if (!investmentInput) return;
    
    // Initial calculation
    updateCalculator();
    
    // Update on input change
    investmentInput.addEventListener('input', debounce(updateCalculator, 300));
    
    function updateCalculator() {
        let amount = parseFloat(investmentInput.value) || CONFIG.strategy.minInvestment;
        
        // Enforce minimum
        if (amount < CONFIG.strategy.minInvestment) {
            amount = CONFIG.strategy.minInvestment;
            investmentInput.value = amount;
        }
        
        // Enforce investment increments - round to nearest valid amount
        const increment = CONFIG.strategy.investmentIncrement || 20000;
        const remainder = amount % increment;
        if (remainder !== 0) {
            // Round to nearest increment
            amount = Math.round(amount / increment) * increment;
            // Ensure still above minimum
            if (amount < CONFIG.strategy.minInvestment) {
                amount = CONFIG.strategy.minInvestment;
            }
            investmentInput.value = amount;
        }
        
        // Calculate values - QUARTERLY MODEL
        const quarterly = amount * CONFIG.strategy.targetQuarterlyDistribution;
        const bufferPercent = CONFIG.strategy.bufferPercent || 0.06;
        const buffer = Math.max(CONFIG.strategy.bufferAmount, amount * bufferPercent);
        const annual = quarterly * 4; // 4 quarters per year
        const quarterlyReturnPercent = CONFIG.strategy.targetQuarterlyDistribution * 100; // 6% per quarter
        
        // Update display with animation
        animateValue(monthlyDistribution, quarterly, '$'); // ID still "monthly-distribution" but shows quarterly
        animateValue(bufferTarget, buffer, '$');
        animateValue(annualDistribution, annual, '$');
        animateValue(annualReturn, quarterlyReturnPercent, '', '%'); // Now shows 6% per quarter
        
        trackEvent('calculator_interaction', { 
            investment_amount: amount,
            quarterly_distribution: quarterly,
            annual_distribution: annual
        });
    }
    
    // Animate number changes
    function animateValue(element, value, prefix = '', suffix = '') {
        if (!element) return;
        
        element.classList.add('calc-result');
        
        if (suffix === '%') {
            element.textContent = `${prefix}${value.toFixed(1)}${suffix}`;
        } else {
            element.textContent = `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${suffix}`;
        }
        
        setTimeout(() => {
            element.classList.remove('calc-result');
        }, 300);
    }
}

// ============================================
// 4. FAQ ACCORDION
// ============================================

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (!question || !answer) return;
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other FAQs
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    if (otherAnswer) {
                        otherAnswer.classList.add('hidden');
                    }
                }
            });
            
            // Toggle current FAQ
            item.classList.toggle('active');
            answer.classList.toggle('hidden');
            
            trackEvent('faq_interaction', { 
                question: question.textContent.trim(),
                action: isActive ? 'close' : 'open'
            });
        });
    });
}

// ============================================
// 5. LEAD CAPTURE FORM
// ============================================

let lastSubmissionTime = 0;

function initLeadForm() {
    const form = document.getElementById('lead-form');
    const formMessage = document.getElementById('form-message');
    
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Rate limiting
        const now = Date.now();
        if (CONFIG.form.enableRateLimit && now - lastSubmissionTime < CONFIG.form.rateLimitDelay) {
            showFormMessage('Please wait a moment before submitting again.', 'error');
            return;
        }
        
        // Honeypot check
        if (CONFIG.form.enableHoneypot) {
            const honeypot = form.querySelector('input[name="honeypot"]');
            if (honeypot && honeypot.value) {
                console.log('Bot detected');
                return;
            }
        }
        
        // Validate form
        if (!validateForm(form)) {
            return;
        }
        
        // Collect form data
        const formData = collectFormData(form);
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
        submitBtn.disabled = true;
        form.classList.add('form-loading');
        
        try {
            // Submit to Google Apps Script webhook
            console.log('Submitting to webhook:', CONFIG.form.webhookUrl);
            console.log('Form data:', formData);
            
            // Using no-cors mode to bypass CORS preflight checks
            // Note: With no-cors, we can't read the response, but data is still sent
            await fetch(CONFIG.form.webhookUrl, {
                method: 'POST',
                mode: 'no-cors', // Required for Google Apps Script cross-origin requests
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            console.log('✅ Webhook submission completed');
            
            // With no-cors mode, we assume success if no error was thrown
            // Data has been sent to Google Sheets and emails are being sent
            
            // Brief delay to allow backend processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Show success message
            showFormMessage(CONFIG.form.successMessage, 'success');
            
            // Reset form
            form.reset();
            
            // Track conversion
            trackEvent('lead_submitted', {
                investment_amount: formData.investment_amount,
                source: formData.utm_source || 'direct'
            });
            
            // Update last submission time
            lastSubmissionTime = now;
            
            // Optional: Redirect to thank you page or calendar
            // window.location.href = '/thank-you.html';
            
        } catch (error) {
            console.error('Form submission error:', error);
            showFormMessage(CONFIG.form.errorMessage, 'error');
            
            trackEvent('form_error', { error: error.message });
        } finally {
            // Restore button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            form.classList.remove('form-loading');
        }
    });
}

// Validate Form Fields
function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, CONFIG.form.validationMessages.required);
            isValid = false;
        } else {
            clearFieldError(field);
            
            // Email validation
            if (field.type === 'email' && !isValidEmail(field.value)) {
                showFieldError(field, CONFIG.form.validationMessages.email);
                isValid = false;
            }
        }
    });
    
    return isValid;
}

// Email Validation
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Show Field Error
function showFieldError(field, message) {
    field.classList.add('border-red-500');
    
    // Remove existing error message
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error text-red-400 text-sm mt-1';
    errorDiv.textContent = message;
    field.parentElement.appendChild(errorDiv);
}

// Clear Field Error
function clearFieldError(field) {
    field.classList.remove('border-red-500');
    const errorDiv = field.parentElement.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Collect Form Data with UTMs
function collectFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    // Handle validation_preference checkboxes specially (array field)
    const validationPrefs = [];
    const checkboxes = form.querySelectorAll('input[name="validation_preference[]"]:checked');
    checkboxes.forEach(cb => validationPrefs.push(cb.value));
    
    if (validationPrefs.length > 0) {
        data.validation_preference = validationPrefs;
    }
    
    // Basic form fields
    formData.forEach((value, key) => {
        if (key !== 'honeypot' && key !== 'validation_preference[]') {
            data[key] = value;
        }
    });
    
    // Add UTM parameters
    const utmParams = getUTMParameters();
    Object.assign(data, utmParams);
    
    // Add metadata
    data.submission_date = new Date().toISOString();
    data.referrer = document.referrer || 'direct';
    data.page_url = window.location.href;
    data.user_agent = navigator.userAgent;
    
    return data;
}

// Show Form Message
function showFormMessage(message, type) {
    const formMessage = document.getElementById('form-message');
    if (!formMessage) return;
    
    formMessage.textContent = message;
    formMessage.className = `rounded-lg p-4 ${type}`;
    formMessage.classList.remove('hidden');
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        formMessage.classList.add('hidden');
    }, 10000);
    
    // Scroll to message
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// 6. UTM PARAMETER TRACKING
// ============================================

function captureUTMParameters() {
    const params = getUTMParameters();
    
    // Store in sessionStorage for persistence
    if (Object.keys(params).length > 0) {
        sessionStorage.setItem('utm_params', JSON.stringify(params));
        console.log('UTM parameters captured:', params);
    }
}

function getUTMParameters() {
    // Check sessionStorage first
    const stored = sessionStorage.getItem('utm_params');
    if (stored) {
        return JSON.parse(stored);
    }
    
    // Parse from URL
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    utmKeys.forEach(key => {
        const value = urlParams.get(key);
        if (value) {
            params[key] = value;
        }
    });
    
    return params;
}

// ============================================
// 7. UTILITY FUNCTIONS
// ============================================

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Format Percentage
function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}

// ============================================
// 8. CTA BUTTON TRACKING
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Track all CTA clicks
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
        button.addEventListener('click', function() {
            trackEvent('cta_click', {
                button_text: this.textContent.trim(),
                button_location: this.closest('section')?.id || 'unknown'
            });
        });
    });
});

// ============================================
// 9. SCROLL ANIMATIONS (Optional Enhancement)
// ============================================

// Intersection Observer for fade-in animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Uncomment to enable scroll animations
// initScrollAnimations();

console.log('All scripts initialized successfully');
