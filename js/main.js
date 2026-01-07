1	/* ========================================
     2	   ECFS Landing Page Main JavaScript
     3	   Handles: Navigation, Calculator, Form, Analytics, FAQs
     4	   ======================================== */
     5	
     6	// ============================================
     7	// 1. INITIALIZATION & ANALYTICS
     8	// ============================================
     9	
    10	document.addEventListener('DOMContentLoaded', function() {
    11	    console.log('ECFS Landing Page Loaded');
    12	    
    13	    // Initialize Analytics
    14	    initAnalytics();
    15	    
    16	    // Initialize All Components
    17	    initMobileMenu();
    18	    initStickyHeader();
    19	    initSmoothScroll();
    20	    initCalculator();
    21	    initFAQ();
    22	    initLeadForm();
    23	    captureUTMParameters();
    24	});
    25	
    26	// Initialize Google Analytics & Facebook Pixel
    27	function initAnalytics() {
    28	    if (!CONFIG.analytics.enableAnalytics) {
    29	        console.log('Analytics disabled in config');
    30	        return;
    31	    }
    32	
    33	    // Google Analytics 4
    34	    if (CONFIG.analytics.googleAnalyticsId && CONFIG.analytics.googleAnalyticsId !== 'G-XXXXXXXXXX') {
    35	        const gaScript = document.createElement('script');
    36	        gaScript.async = true;
    37	        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.analytics.googleAnalyticsId}`;
    38	        document.head.appendChild(gaScript);
    39	
    40	        window.dataLayer = window.dataLayer || [];
    41	        function gtag(){dataLayer.push(arguments);}
    42	        gtag('js', new Date());
    43	        gtag('config', CONFIG.analytics.googleAnalyticsId);
    44	        
    45	        console.log('Google Analytics initialized');
    46	    }
    47	
    48	    // Facebook Pixel
    49	    if (CONFIG.analytics.facebookPixelId) {
    50	        !function(f,b,e,v,n,t,s)
    51	        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    52	        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    53	        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    54	        n.queue=[];t=b.createElement(e);t.async=!0;
    55	        t.src=v;s=b.getElementsByTagName(e)[0];
    56	        s.parentNode.insertBefore(t,s)}(window, document,'script',
    57	        'https://connect.facebook.net/en_US/fbevents.js');
    58	        fbq('init', CONFIG.analytics.facebookPixelId);
    59	        fbq('track', 'PageView');
    60	        
    61	        console.log('Facebook Pixel initialized');
    62	    }
    63	}
    64	
    65	// Track Custom Events
    66	function trackEvent(eventName, eventData = {}) {
    67	    // Google Analytics
    68	    if (typeof gtag !== 'undefined') {
    69	        gtag('event', eventName, eventData);
    70	    }
    71	    
    72	    // Facebook Pixel
    73	    if (typeof fbq !== 'undefined') {
    74	        fbq('track', eventName, eventData);
    75	    }
    76	    
    77	    console.log('Event tracked:', eventName, eventData);
    78	}
    79	
    80	// ============================================
    81	// 2. NAVIGATION & UI COMPONENTS
    82	// ============================================
    83	
    84	// Mobile Menu Toggle
    85	function initMobileMenu() {
    86	    const menuBtn = document.getElementById('mobile-menu-btn');
    87	    const mobileMenu = document.getElementById('mobile-menu');
    88	    
    89	    if (!menuBtn || !mobileMenu) return;
    90	    
    91	    menuBtn.addEventListener('click', function() {
    92	        mobileMenu.classList.toggle('active');
    93	        const isActive = mobileMenu.classList.contains('active');
    94	        
    95	        // Toggle icon
    96	        const icon = menuBtn.querySelector('i');
    97	        icon.classList.toggle('fa-bars', !isActive);
    98	        icon.classList.toggle('fa-times', isActive);
    99	        
   100	        trackEvent('mobile_menu_toggle', { action: isActive ? 'open' : 'close' });
   101	    });
   102	    
   103	    // Close menu when clicking on a link
   104	    const menuLinks = mobileMenu.querySelectorAll('a');
   105	    menuLinks.forEach(link => {
   106	        link.addEventListener('click', () => {
   107	            mobileMenu.classList.remove('active');
   108	            const icon = menuBtn.querySelector('i');
   109	            icon.classList.add('fa-bars');
   110	            icon.classList.remove('fa-times');
   111	        });
   112	    });
   113	}
   114	
   115	// Sticky Header on Scroll
   116	function initStickyHeader() {
   117	    const header = document.getElementById('header');
   118	    let lastScroll = 0;
   119	    
   120	    window.addEventListener('scroll', () => {
   121	        const currentScroll = window.pageYOffset;
   122	        
   123	        if (currentScroll > 100) {
   124	            header.classList.add('scrolled');
   125	        } else {
   126	            header.classList.remove('scrolled');
   127	        }
   128	        
   129	        lastScroll = currentScroll;
   130	    });
   131	}
   132	
   133	// Smooth Scroll for Anchor Links
   134	function initSmoothScroll() {
   135	    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
   136	        anchor.addEventListener('click', function(e) {
   137	            const href = this.getAttribute('href');
   138	            
   139	            // Skip if it's just "#"
   140	            if (href === '#') {
   141	                e.preventDefault();
   142	                return;
   143	            }
   144	            
   145	            const target = document.querySelector(href);
   146	            if (target) {
   147	                e.preventDefault();
   148	                const headerHeight = document.getElementById('header').offsetHeight;
   149	                const targetPosition = target.offsetTop - headerHeight - 20;
   150	                
   151	                window.scrollTo({
   152	                    top: targetPosition,
   153	                    behavior: 'smooth'
   154	                });
   155	                
   156	                trackEvent('navigation_click', { section: href });
   157	            }
   158	        });
   159	    });
   160	}
   161	
   162	// ============================================
   163	// 3. INTERACTIVE CALCULATOR
   164	// ============================================
   165	
   166	function initCalculator() {
   167	    const investmentInput = document.getElementById('investment-amount');
   168	    const monthlyDistribution = document.getElementById('monthly-distribution');
   169	    const bufferTarget = document.getElementById('buffer-target');
   170	    const annualDistribution = document.getElementById('annual-distribution');
   171	    const annualReturn = document.getElementById('annual-return');
   172	    
   173	    if (!investmentInput) return;
   174	    
   175	    // Initial calculation
   176	    updateCalculator();
   177	    
   178	    // Update on input change
   179	    investmentInput.addEventListener('input', debounce(updateCalculator, 300));
   180	    
   181	    function updateCalculator() {
   182	        let amount = parseFloat(investmentInput.value) || CONFIG.strategy.minInvestment;
   183	        
   184	        // Enforce minimum
   185	        if (amount < CONFIG.strategy.minInvestment) {
   186	            amount = CONFIG.strategy.minInvestment;
   187	            investmentInput.value = amount;
   188	        }
   189	        
   190	        // Enforce investment increments - round to nearest valid amount
   191	        const increment = CONFIG.strategy.investmentIncrement || 20000;
   192	        const remainder = amount % increment;
   193	        if (remainder !== 0) {
   194	            // Round to nearest increment
   195	            amount = Math.round(amount / increment) * increment;
   196	            // Ensure still above minimum
   197	            if (amount < CONFIG.strategy.minInvestment) {
   198	                amount = CONFIG.strategy.minInvestment;
   199	            }
   200	            investmentInput.value = amount;
   201	        }
   202	        
   203	        // Calculate values
   204	        const monthly = amount * CONFIG.strategy.targetMonthlyDistribution;
   205	        const bufferPercent = CONFIG.strategy.bufferPercent || 0.06;
   206	        const buffer = Math.max(CONFIG.strategy.bufferAmount, amount * bufferPercent);
   207	        const annual = monthly * 12;
   208	        const returnPercent = (annual / amount) * 100;
   209	        
   210	        // Update display with animation
   211	        animateValue(monthlyDistribution, monthly, '$');
   212	        animateValue(bufferTarget, buffer, '$');
   213	        animateValue(annualDistribution, annual, '$');
   214	        animateValue(annualReturn, returnPercent, '', '%');
   215	        
   216	        trackEvent('calculator_interaction', { 
   217	            investment_amount: amount,
   218	            monthly_distribution: monthly 
   219	        });
   220	    }
   221	    
   222	    // Animate number changes
   223	    function animateValue(element, value, prefix = '', suffix = '') {
   224	        if (!element) return;
   225	        
   226	        element.classList.add('calc-result');
   227	        
   228	        if (suffix === '%') {
   229	            element.textContent = `${prefix}${value.toFixed(1)}${suffix}`;
   230	        } else {
   231	            element.textContent = `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${suffix}`;
   232	        }
   233	        
   234	        setTimeout(() => {
   235	            element.classList.remove('calc-result');
   236	        }, 300);
   237	    }
   238	}
   239	
   240	// ============================================
   241	// 4. FAQ ACCORDION
   242	// ============================================
   243	
   244	function initFAQ() {
   245	    const faqItems = document.querySelectorAll('.faq-item');
   246	    
   247	    faqItems.forEach(item => {
   248	        const question = item.querySelector('.faq-question');
   249	        const answer = item.querySelector('.faq-answer');
   250	        
   251	        if (!question || !answer) return;
   252	        
   253	        question.addEventListener('click', () => {
   254	            const isActive = item.classList.contains('active');
   255	            
   256	            // Close all other FAQs
   257	            faqItems.forEach(otherItem => {
   258	                if (otherItem !== item) {
   259	                    otherItem.classList.remove('active');
   260	                    const otherAnswer = otherItem.querySelector('.faq-answer');
   261	                    if (otherAnswer) {
   262	                        otherAnswer.classList.add('hidden');
   263	                    }
   264	                }
   265	            });
   266	            
   267	            // Toggle current FAQ
   268	            item.classList.toggle('active');
   269	            answer.classList.toggle('hidden');
   270	            
   271	            trackEvent('faq_interaction', { 
   272	                question: question.textContent.trim(),
   273	                action: isActive ? 'close' : 'open'
   274	            });
   275	        });
   276	    });
   277	}
   278	
   279	// ============================================
   280	// 5. LEAD CAPTURE FORM
   281	// ============================================
   282	
   283	let lastSubmissionTime = 0;
   284	
   285	function initLeadForm() {
   286	    const form = document.getElementById('lead-form');
   287	    const formMessage = document.getElementById('form-message');
   288	    
   289	    if (!form) return;
   290	    
   291	    form.addEventListener('submit', async function(e) {
   292	        e.preventDefault();
   293	        
   294	        // Rate limiting
   295	        const now = Date.now();
   296	        if (CONFIG.form.enableRateLimit && now - lastSubmissionTime < CONFIG.form.rateLimitDelay) {
   297	            showFormMessage('Please wait a moment before submitting again.', 'error');
   298	            return;
   299	        }
   300	        
   301	        // Honeypot check
   302	        if (CONFIG.form.enableHoneypot) {
   303	            const honeypot = form.querySelector('input[name="honeypot"]');
   304	            if (honeypot && honeypot.value) {
   305	                console.log('Bot detected');
   306	                return;
   307	            }
   308	        }
   309	        
   310	        // Validate form
   311	        if (!validateForm(form)) {
   312	            return;
   313	        }
   314	        
   315	        // Collect form data
   316	        const formData = collectFormData(form);
   317	        
   318	        // Show loading state
   319	        const submitBtn = form.querySelector('button[type="submit"]');
   320	        const originalBtnText = submitBtn.innerHTML;
   321	        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
   322	        submitBtn.disabled = true;
   323	        form.classList.add('form-loading');
   324	        
   325	        try {
   326	            // Submit to Google Apps Script webhook
   327	            console.log('Submitting to webhook:', CONFIG.form.webhookUrl);
   328	            console.log('Form data:', formData);
   329	            
   330	            // Using no-cors mode to bypass CORS preflight checks
   331	            // Note: With no-cors, we can't read the response, but data is still sent
   332	            await fetch(CONFIG.form.webhookUrl, {
   333	                method: 'POST',
   334	                mode: 'no-cors', // Required for Google Apps Script cross-origin requests
   335	                headers: {
   336	                    'Content-Type': 'application/json'
   337	                },
   338	                body: JSON.stringify(formData)
   339	            });
   340	            
   341	            console.log('✅ Webhook submission completed');
   342	            
   343	            // With no-cors mode, we assume success if no error was thrown
   344	            // Data has been sent to Google Sheets and emails are being sent
   345	            
   346	            // Brief delay to allow backend processing
   347	            await new Promise(resolve => setTimeout(resolve, 1000));
   348	            
   349	            // Show success message
   350	            showFormMessage(CONFIG.form.successMessage, 'success');
   351	            
   352	            // Reset form
   353	            form.reset();
   354	            
   355	            // Track conversion
   356	            trackEvent('lead_submitted', {
   357	                investment_amount: formData.investment_amount,
   358	                source: formData.utm_source || 'direct'
   359	            });
   360	            
   361	            // Update last submission time
   362	            lastSubmissionTime = now;
   363	            
   364	            // Optional: Redirect to thank you page or calendar
   365	            // window.location.href = '/thank-you.html';
   366	            
   367	        } catch (error) {
   368	            console.error('Form submission error:', error);
   369	            showFormMessage(CONFIG.form.errorMessage, 'error');
   370	            
   371	            trackEvent('form_error', { error: error.message });
   372	        } finally {
   373	            // Restore button
   374	            submitBtn.innerHTML = originalBtnText;
   375	            submitBtn.disabled = false;
   376	            form.classList.remove('form-loading');
   377	        }
   378	    });
   379	}
   380	
   381	// Validate Form Fields
   382	function validateForm(form) {
   383	    const requiredFields = form.querySelectorAll('[required]');
   384	    let isValid = true;
   385	    
   386	    requiredFields.forEach(field => {
   387	        if (!field.value.trim()) {
   388	            showFieldError(field, CONFIG.form.validationMessages.required);
   389	            isValid = false;
   390	        } else {
   391	            clearFieldError(field);
   392	            
   393	            // Email validation
   394	            if (field.type === 'email' && !isValidEmail(field.value)) {
   395	                showFieldError(field, CONFIG.form.validationMessages.email);
   396	                isValid = false;
   397	            }
   398	        }
   399	    });
   400	    
   401	    return isValid;
   402	}
   403	
   404	// Email Validation
   405	function isValidEmail(email) {
   406	    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   407	    return re.test(email);
   408	}
   409	
   410	// Show Field Error
   411	function showFieldError(field, message) {
   412	    field.classList.add('border-red-500');
   413	    
   414	    // Remove existing error message
   415	    const existingError = field.parentElement.querySelector('.field-error');
   416	    if (existingError) {
   417	        existingError.remove();
   418	    }
   419	    
   420	    // Add error message
   421	    const errorDiv = document.createElement('div');
   422	    errorDiv.className = 'field-error text-red-400 text-sm mt-1';
   423	    errorDiv.textContent = message;
   424	    field.parentElement.appendChild(errorDiv);
   425	}
   426	
   427	// Clear Field Error
   428	function clearFieldError(field) {
   429	    field.classList.remove('border-red-500');
   430	    const errorDiv = field.parentElement.querySelector('.field-error');
   431	    if (errorDiv) {
   432	        errorDiv.remove();
   433	    }
   434	}
   435	
   436	// Collect Form Data with UTMs
   437	function collectFormData(form) {
   438	    const formData = new FormData(form);
   439	    const data = {};
   440	    
   441	    // Handle validation_preference checkboxes specially (array field)
   442	    const validationPrefs = [];
   443	    const checkboxes = form.querySelectorAll('input[name="validation_preference[]"]:checked');
   444	    checkboxes.forEach(cb => validationPrefs.push(cb.value));
   445	    
   446	    if (validationPrefs.length > 0) {
   447	        data.validation_preference = validationPrefs;
   448	    }
   449	    
   450	    // Basic form fields
   451	    formData.forEach((value, key) => {
   452	        if (key !== 'honeypot' && key !== 'validation_preference[]') {
   453	            data[key] = value;
   454	        }
   455	    });
   456	    
   457	    // Add UTM parameters
   458	    const utmParams = getUTMParameters();
   459	    Object.assign(data, utmParams);
   460	    
   461	    // Add metadata
   462	    data.submission_date = new Date().toISOString();
   463	    data.referrer = document.referrer || 'direct';
   464	    data.page_url = window.location.href;
   465	    data.user_agent = navigator.userAgent;
   466	    
   467	    return data;
   468	}
   469	
   470	// Show Form Message
   471	function showFormMessage(message, type) {
   472	    const formMessage = document.getElementById('form-message');
   473	    if (!formMessage) return;
   474	    
   475	    formMessage.textContent = message;
   476	    formMessage.className = `rounded-lg p-4 ${type}`;
   477	    formMessage.classList.remove('hidden');
   478	    
   479	    // Auto-hide after 10 seconds
   480	    setTimeout(() => {
   481	        formMessage.classList.add('hidden');
   482	    }, 10000);
   483	    
   484	    // Scroll to message
   485	    formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
   486	}
   487	
   488	// ============================================
   489	// 6. UTM PARAMETER TRACKING
   490	// ============================================
   491	
   492	function captureUTMParameters() {
   493	    const params = getUTMParameters();
   494	    
   495	    // Store in sessionStorage for persistence
   496	    if (Object.keys(params).length > 0) {
   497	        sessionStorage.setItem('utm_params', JSON.stringify(params));
   498	        console.log('UTM parameters captured:', params);
   499	    }
   500	}
   501	
   502	function getUTMParameters() {
   503	    // Check sessionStorage first
   504	    const stored = sessionStorage.getItem('utm_params');
   505	    if (stored) {
   506	        return JSON.parse(stored);
   507	    }
   508	    
   509	    // Parse from URL
   510	    const urlParams = new URLSearchParams(window.location.search);
   511	    const params = {};
   512	    
   513	    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
   514	    utmKeys.forEach(key => {
   515	        const value = urlParams.get(key);
   516	        if (value) {
   517	            params[key] = value;
   518	        }
   519	    });
   520	    
   521	    return params;
   522	}
   523	
   524	// ============================================
   525	// 7. UTILITY FUNCTIONS
   526	// ============================================
   527	
   528	// Debounce Function
   529	function debounce(func, wait) {
   530	    let timeout;
   531	    return function executedFunction(...args) {
   532	        const later = () => {
   533	            clearTimeout(timeout);
   534	            func(...args);
   535	        };
   536	        clearTimeout(timeout);
   537	        timeout = setTimeout(later, wait);
   538	    };
   539	}
   540	
   541	// Format Currency
   542	function formatCurrency(amount) {
   543	    return new Intl.NumberFormat('en-US', {
   544	        style: 'currency',
   545	        currency: 'USD',
   546	        minimumFractionDigits: 0,
   547	        maximumFractionDigits: 0
   548	    }).format(amount);
   549	}
   550	
   551	// Format Percentage
   552	function formatPercent(value) {
   553	    return `${value.toFixed(1)}%`;
   554	}
   555	
   556	// ============================================
   557	// 8. CTA BUTTON TRACKING
   558	// ============================================
   559	
   560	document.addEventListener('DOMContentLoaded', function() {
   561	    // Track all CTA clicks
   562	    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
   563	        button.addEventListener('click', function() {
   564	            trackEvent('cta_click', {
   565	                button_text: this.textContent.trim(),
   566	                button_location: this.closest('section')?.id || 'unknown'
   567	            });
   568	        });
   569	    });
   570	});
   571	
   572	// ============================================
   573	// 9. SCROLL ANIMATIONS (Optional Enhancement)
   574	// ============================================
   575	
   576	// Intersection Observer for fade-in animations
   577	function initScrollAnimations() {
   578	    const observerOptions = {
   579	        threshold: 0.1,
   580	        rootMargin: '0px 0px -50px 0px'
   581	    };
   582	    
   583	    const observer = new IntersectionObserver((entries) => {
   584	        entries.forEach(entry => {
   585	            if (entry.isIntersecting) {
   586	                entry.target.classList.add('animate-in');
   587	                observer.unobserve(entry.target);
   588	            }
   589	        });
   590	    }, observerOptions);
   591	    
   592	    // Observe sections
   593	    document.querySelectorAll('section').forEach(section => {
   594	        observer.observe(section);
   595	    });
   596	}
   597	
   598	// Uncomment to enable scroll animations
   599	// initScrollAnimations();
   600	
   601	console.log('All scripts initialized successfully');
   602	
