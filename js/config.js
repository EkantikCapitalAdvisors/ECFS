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
        
        // Distribution Model: Quarterly
        distributionFrequency: 'quarterly', // Changed from monthly to quarterly
        targetQuarterlyDistribution: 0.06, // 6% per quarter (preferred distribution rate)
        targetMonthlyEquivalent: 0.02, // 2% monthly equivalent for reference
        targetAnnualDistribution: 0.24, // 24% annual (4 quarters × 6%)
        
        // Buffer Requirements
        bufferAmount: 1200, // Minimum buffer (6% of $20k)
        bufferPercent: 0.06, // 6% buffer calculation
        bufferEnforcement: 'hard-gate', // Hard gate before any incentive fees
        
        // Risk Controls
        dailyRiskLimit: 0.025, // 2.5% daily risk limit
        weeklyRiskLimit: 0.05, // 5% weekly loss limit
        
        // Fee Structure: Waterfall Model
        feeModel: 'quarterly-waterfall', // New waterfall fee structure
        preferredDistribution: 0.06, // 6% quarterly preferred to investors first
        catchUpEnabled: true, // Manager catch-up after preferred paid
        profitSplit: 0.50, // 50/50 split after catch-up
        highWaterMark: true, // HWM tracking enabled
        hwmFrequency: 'quarterly', // HWM calculated quarterly
        
        // Legacy/Reference (for migration)
        edgePerDay: 0.25, // 25% (illustrative, educational reference)
        legacyAnnualHWMFee: 0.10 // Old 10% fee model (replaced by waterfall)
    },

    // Copy/Content Configuration
    copy: {
        heroHeadline: 'Targeted Quarterly Cash Flow',
        heroSubheadline: 'With Preferred Distribution & Buffer Protection',
        heroDescription: 'A disciplined strategy designed for reliable quarterly distributions with a 6% preferred rate (2% monthly equivalent), built on strict risk controls, waterfall fee alignment, and transparent performance tracking.',
        
        metaTitle: 'Ekantik Cash Flow Strategy (ECFS) | Targeted Quarterly Distributions with Waterfall Fees',
        metaDescription: 'Professional cash flow strategy targeting 6% quarterly distributions (2% monthly equivalent) with preferred distribution waterfall, buffer-based protection, and high-water mark investor safeguards.',
        
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

    // Timeline Phases - Quarterly Model
    timeline: [
        {
            phase: 'Pre-Launch',
            title: 'Validation & Interest Building',
            description: 'During soft launch, investors validate the strategy through virtual demos ($15-20/month) or weekly performance reports (FREE). Join the founding member interest list to lock in preferred terms. No capital deployment until CTA licensing complete.'
        },
        {
            phase: 'Q1 (Months 1–3)',
            title: 'Buffer Building & First Quarter',
            description: 'Strategy focuses on building the initial $1,200 safety buffer while trading actively. At quarter-end, if buffer is met and profitable, first 6% preferred distribution may be processed.'
        },
        {
            phase: 'Q2 (Months 4–6)',
            title: 'Quarterly Distribution Cycle',
            description: 'Second quarter performance evaluated. If profitable and buffer intact, 6% preferred distribution paid first, then waterfall fees apply. HWM tracks highest quarter-end value.'
        },
        {
            phase: 'Q3+ (Ongoing)',
            title: 'Regular Quarterly Distributions',
            description: 'Consistent quarterly cycle continues. Preferred distributions paid first when earned. In losing quarters, no distributions paid and buffer rebuilds. Manager fees only after investor preferred rate satisfied and above HWM.'
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
