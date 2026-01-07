## 📦 File Contents

### **File 1: `js/config.js`**

```javascript
/* ========================================
   ECFS Configuration File
   Edit these values to customize the landing page content
   ======================================== */

const CONFIG = {
    // Analytics Configuration
    analytics: {
        googleAnalyticsId: 'G-XXXXXXXXXX', // Replace with your GA4 Measurement ID
        facebookPixelId: '', // Replace with your Meta Pixel ID (optional)
        enableAnalytics: false // Set to true when you add your IDs
    },

    // Company Information
    company: {
        name: 'Ekantik Capital Advisors LLC',
        shortName: 'ECA',
        email: 'info@ekantikcapital.com',
        phone: '(555) 123-4567',
        website: 'https://ekantikcapital.com'
    },

    // Strategy Configuration
    strategy: {
        name: 'Ekantik Cash Flow Strategy',
        shortName: 'ECFS',
        minInvestment: 20000,
        investmentIncrement: 20000, // Must be in $20k increments
        targetMonthlyDistribution: 0.02, // 2%
        targetGrossReturn: 0.05, // 5%
        bufferAmount: 1200, // Minimum buffer (also equals 6% of $20k)
        bufferPercent: 0.06, // 6% buffer calculation
        dailyRiskLimit: 0.025, // 2.5%
        weeklyRiskLimit: 0.05, // 5% weekly loss limit
        edgePerDay: 0.25, // 25% (illustrative)
        annualHWMFee: 0.10, // 10%
        profitSplit: 0.50 // 50/50
    },

    // Copy/Content Configuration
    copy: {
        heroHeadline: 'Targeted Monthly Cash Flow',
        heroSubheadline: 'With a Buffer-First Protection Model',
        heroDescription: 'A disciplined strategy designed for reliable monthly distributions targeting 2% of capital, built on strict risk controls, buffer-based protection, and transparent performance tracking.',
        
        metaTitle: 'Ekantik Cash Flow Strategy (ECFS) | Targeted Monthly Distributions with Buffer Protection',
        metaDescription: 'Professional cash flow strategy targeting 2% monthly distributions with buffer-based protection. Disciplined risk controls and transparent performance tracking by Ekantik Capital Advisors.',
        
        ctaPrimary: 'Schedule Consultation',
        ctaSecondary: 'See Performance Model'
    },

    // Form Configuration
    form: {
        webhookUrl: 'https://script.google.com/macros/s/AKfycbwsusvrXwFJXG7wlX7iqETM14e_HrGbtYb8EfuBivuUyUqstHAKvg3fpVngsm045UMt/exec',
        enableHoneypot: true,
        enableRateLimit: true,
        rateLimitDelay: 3000, // 3 seconds between submissions
        successMessage: 'Thank you for your interest! We\'ll be in touch within 1 business day to schedule your consultation.',
        errorMessage: 'Sorry, there was an error submitting your request. Please try again or contact us directly.',
        validationMessages: {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            phone: 'Please enter a valid phone number',
            minInvestment: 'Minimum investment is $20,000'
        }
    },

    // Feature Flags
    features: {
        showCalculator: true,
        showTimeline: true,
        showFAQ: true,
        showRiskDisclosure: true,
        enableFormSubmission: true
    },

    // Social Proof / Trust Indicators
    trustIndicators: [
        {
            icon: 'fa-university',
            title: 'Third-Party',
            subtitle: 'Custody & Reporting'
        },
        {
            icon: 'fa-lock',
            title: 'Broker-Level',
            subtitle: 'Risk Controls'
        },
        {
            icon: 'fa-chart-line',
            title: '24/7 Dashboard',
            subtitle: 'Real-Time Access'
        },
        {
            icon: 'fa-file-contract',
            title: 'Transparent',
            subtitle: 'Fee Structure'
        }
    ],

    // Timeline Phases
    timeline: [
        {
            phase: 'Day 1',
            title: 'Setup & Allocation',
            description: 'Complete onboarding, fund your account, and activate the strategy. All systems go live immediately.'
        },
        {
            phase: 'Months 1–2',
            title: 'Buffer Accumulation',
            description: 'Strategy focuses on building the initial $1,200 safety buffer. No distributions yet, no management fees charged.'
        },
        {
            phase: 'Month 3',
            title: 'First Distribution',
            description: 'Once buffer is met, your first targeted 2% monthly distribution is processed. Welcome to cash flow mode!'
        },
        {
            phase: 'Months 4–10+',
            title: 'Regular Monthly Payouts',
            description: 'Consistent targeted distributions continue monthly. In losing months, distributions pause automatically to rebuild buffer—then resume.'
        }
    ],

    // Asset Range Options for Form
    assetRanges: [
        '$20,000 - $50,000',
        '$50,000 - $100,000',
        '$100,000 - $250,000',
        '$250,000 - $500,000',
        '$500,000 - $1,000,000',
        '$1,000,000+'
    ]
};

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
