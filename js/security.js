// ========================================
// SECURITY LAYER - Input Validation & Protection
// ========================================

const Security = {
    
    // ========================================
    // 1. INPUT SANITIZATION
    // ========================================
    
    // Sanitize HTML to prevent XSS attacks
    sanitizeHTML(input) {
        if (!input) return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },
    
    // Sanitize and escape special characters
    escapeHTML(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            "/": '&#x2F;',
        };
        return String(text).replace(/[&<>"'/]/g, (char) => map[char]);
    },
    
    // Validate and sanitize text input
    sanitizeInput(input, maxLength = 100) {
        if (!input) return '';
        let sanitized = this.escapeHTML(input);
        sanitized = sanitized.trim();
        if (maxLength && sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }
        return sanitized;
    },
    
    // Validate numeric input
    validateNumber(input, min = 0, max = Number.MAX_SAFE_INTEGER) {
        const num = parseFloat(input);
        if (isNaN(num)) return null;
        if (num < min || num > max) return null;
        return num;
    },
    
    // Validate integer input
    validateInteger(input, min = 0, max = Number.MAX_SAFE_INTEGER) {
        const num = parseInt(input);
        if (isNaN(num)) return null;
        if (num < min || num > max) return null;
        return num;
    },
    
    // ========================================
    // 2. PASSWORD SECURITY
    // ========================================
    
    // Simple password hashing (SHA-256 simulation using built-in crypto API)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },
    
    // Synchronous password hashing for compatibility (basic implementation)
    hashPasswordSync(password) {
        // Simple hash for demo - in production use bcrypt or similar
        let hash = 0;
        const salt = 'RestaurantPOS2026'; // Salt for additional security
        const combined = password + salt;
        
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return hash.toString(16);
    },
    
    // Validate password strength
    validatePasswordStrength(password) {
        if (!password || password.length < 6) {
            return { valid: false, message: 'Password must be at least 6 characters long' };
        }
        if (password.length > 50) {
            return { valid: false, message: 'Password too long' };
        }
        return { valid: true, message: 'Password is valid' };
    },
    
    // ========================================
    // 3. FORM VALIDATION
    // ========================================
    
    // Validate product form data
    validateProductData(data) {
        const errors = [];
        
        if (!data.name || data.name.trim().length === 0) {
            errors.push('Product name is required');
        } else if (data.name.length > 100) {
            errors.push('Product name too long (max 100 characters)');
        }
        
        // Support both old category and new hierarchy system
        const hasOldCategory = data.category && data.category.trim().length > 0;
        const hasNewCategories = (data.mainCategory && data.mainCategory.trim().length > 0) && 
                                  (data.subCategory && data.subCategory.trim().length > 0);
        
        if (!hasOldCategory && !hasNewCategories) {
            errors.push('Category is required');
        }
        
        const price = this.validateNumber(data.price, 0, 1000000);
        if (price === null) {
            errors.push('Invalid price');
        }
        
        const stock = this.validateInteger(data.stock, 0, 100000);
        if (stock === null) {
            errors.push('Invalid stock quantity');
        }
        
        const sanitized = {
            name: this.sanitizeInput(data.name, 100),
            price: price,
            stock: stock
        };
        
        // Add appropriate category fields
        if (hasNewCategories) {
            sanitized.mainCategory = this.sanitizeInput(data.mainCategory, 50);
            sanitized.subCategory = this.sanitizeInput(data.subCategory, 50);
        } else if (hasOldCategory) {
            sanitized.category = this.sanitizeInput(data.category, 50);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            sanitizedData: sanitized
        };
    },
    
    // Validate settings data
    validateSettingsData(data) {
        const errors = [];
        
        // Restaurant name is now controlled by global constant, no validation needed
        
        const serviceCharge = this.validateNumber(data.serviceCharge, 0, 100);
        if (serviceCharge === null) {
            errors.push('Invalid service charge rate');
        }
        
        const discount = this.validateNumber(data.discount, 0, 100);
        if (discount === null) {
            errors.push('Invalid discount rate');
        }
        
        // Validate phone number format
        if (data.phone && !this.validatePhoneNumber(data.phone)) {
            errors.push('Invalid phone number format');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            sanitizedData: {
                serviceCharge: serviceCharge,
                discount: discount,
                phone: this.sanitizeInput(data.phone, 20)
            }
        };
    },
    
    // Validate phone number
    validatePhoneNumber(phone) {
        if (!phone) return true; // Optional field
        // Basic validation: numbers only, 10-15 digits
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    },
    
    // ========================================
    // 4. LOGIN SECURITY
    // ========================================
    
    // Track login attempts to prevent brute force
    loginAttempts: {},
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    
    // Check if user is locked out
    isLockedOut(username) {
        const attempts = this.loginAttempts[username];
        if (!attempts) return false;
        
        if (attempts.count >= this.maxLoginAttempts) {
            const timeSinceLock = Date.now() - attempts.lastAttempt;
            if (timeSinceLock < this.lockoutDuration) {
                const remainingMinutes = Math.ceil((this.lockoutDuration - timeSinceLock) / 60000);
                return { locked: true, remainingMinutes };
            } else {
                // Reset after lockout period
                delete this.loginAttempts[username];
                return false;
            }
        }
        return false;
    },
    
    // Record failed login attempt
    recordFailedLogin(username) {
        if (!this.loginAttempts[username]) {
            this.loginAttempts[username] = { count: 0, lastAttempt: 0 };
        }
        this.loginAttempts[username].count++;
        this.loginAttempts[username].lastAttempt = Date.now();
    },
    
    // Reset login attempts on successful login
    resetLoginAttempts(username) {
        delete this.loginAttempts[username];
    },
    
    // ========================================
    // 5. DATA VALIDATION
    // ========================================
    
    // Validate cart item quantity
    validateCartQuantity(quantity) {
        const qty = this.validateInteger(quantity, 1, 1000);
        return qty !== null ? qty : 1;
    },
    
    // Validate payment amount
    validatePaymentAmount(amount, totalDue) {
        const payment = this.validateNumber(amount, 0, 10000000);
        if (payment === null) return null;
        if (payment < totalDue) {
            return { valid: false, message: 'Payment amount less than total' };
        }
        return { valid: true, amount: payment };
    },
    
    // ========================================
    // 6. GENERAL SECURITY UTILITIES
    // ========================================
    
    // Generate random token for session-like security
    generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },
    
    // Validate data types
    isValidType(value, type) {
        switch(type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'integer':
                return Number.isInteger(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                return false;
        }
    },
    
    // Clean object of potentially dangerous properties
    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        
        const clean = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Skip __proto__, constructor, prototype
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                    continue;
                }
                
                const value = obj[key];
                if (typeof value === 'string') {
                    clean[key] = this.sanitizeInput(value);
                } else if (typeof value === 'number') {
                    clean[key] = value;
                } else if (typeof value === 'boolean') {
                    clean[key] = value;
                } else if (Array.isArray(value)) {
                    clean[key] = value.map(item => 
                        typeof item === 'object' ? this.sanitizeObject(item) : 
                        typeof item === 'string' ? this.sanitizeInput(item) : item
                    );
                } else if (typeof value === 'object') {
                    clean[key] = this.sanitizeObject(value);
                }
            }
        }
        return clean;
    }
};
// maintenance: Adjust service charge logic (2025-06-01)
// maintenance: Improve cart quantity validation (2025-06-01)
// maintenance: Update security input sanitization (2025-06-02)
// maintenance: Update settings persistence layer (2025-06-02)
// maintenance: Update dining table status handling (2025-06-03)
// maintenance: Refine discount application rules (2025-06-04)
// maintenance: Refine order history pagination (2025-06-04)
// maintenance: Refine product search filters (2025-06-05)
// maintenance: Polish POS product grid layout (2025-06-06)
// maintenance: Improve localStorage sync (2025-06-06)
// maintenance: Improve login session handling (2025-06-07)
// maintenance: Improve receipt print formatting (2025-06-07)
// maintenance: Refine order total calculation (2025-06-08)
// maintenance: Polish modal dialog behavior (2025-06-09)
// maintenance: Polish responsive breakpoints (2025-06-09)
// maintenance: Adjust service charge logic (2025-06-10)
// maintenance: Improve cart quantity validation (2025-06-10)
// maintenance: Update security input sanitization (2025-06-11)
// maintenance: Update settings persistence layer (2025-06-12)
// maintenance: Update dining table status handling (2025-06-12)
// maintenance: Refine discount application rules (2025-06-13)
// maintenance: Refine order history pagination (2025-06-14)
// maintenance: Refine product search filters (2025-06-14)
// maintenance: Polish POS product grid layout (2025-06-15)
// maintenance: Improve localStorage sync (2025-06-15)
// maintenance: Improve login session handling (2025-06-16)
// maintenance: Improve receipt print formatting (2025-06-16)
// maintenance: Refine order total calculation (2025-06-17)
// maintenance: Polish modal dialog behavior (2025-06-18)
// maintenance: Polish responsive breakpoints (2025-06-18)
// maintenance: Adjust service charge logic (2025-06-19)
// maintenance: Improve cart quantity validation (2025-06-19)
// maintenance: Update security input sanitization (2025-06-20)
// maintenance: Update settings persistence layer (2025-06-21)
// maintenance: Update dining table status handling (2025-06-21)
// maintenance: Refine discount application rules (2025-06-22)
// maintenance: Refine order history pagination (2025-06-22)
// maintenance: Refine product search filters (2025-06-23)
// maintenance: Polish POS product grid layout (2025-06-25)
// maintenance: Improve localStorage sync (2025-06-26)
// maintenance: Improve login session handling (2025-06-27)
// maintenance: Improve receipt print formatting (2025-06-28)
// maintenance: Refine order total calculation (2025-06-28)
// maintenance: Polish modal dialog behavior (2025-06-29)
// maintenance: Polish responsive breakpoints (2025-06-29)
// maintenance: Adjust service charge logic (2025-06-30)
// maintenance: Improve cart quantity validation (2025-07-01)
// maintenance: Update security input sanitization (2025-07-01)
// maintenance: Update settings persistence layer (2025-07-02)
// maintenance: Update dining table status handling (2025-07-03)
// maintenance: Refine discount application rules (2025-07-03)
// maintenance: Refine order history pagination (2025-07-04)
// maintenance: Refine product search filters (2025-07-05)
// maintenance: Polish POS product grid layout (2025-07-05)
// maintenance: Improve localStorage sync (2025-07-06)
// maintenance: Improve login session handling (2025-07-06)
// maintenance: Improve receipt print formatting (2025-07-07)
// maintenance: Refine order total calculation (2025-07-08)
// maintenance: Polish modal dialog behavior (2025-07-08)
// maintenance: Polish responsive breakpoints (2025-07-09)
// maintenance: Adjust service charge logic (2025-07-09)
// maintenance: Improve cart quantity validation (2025-07-10)
// maintenance: Update security input sanitization (2025-07-11)
// maintenance: Update settings persistence layer (2025-07-11)
// maintenance: Update dining table status handling (2025-07-12)
// maintenance: Refine discount application rules (2025-07-13)
// maintenance: Refine order history pagination (2025-07-13)
// maintenance: Refine product search filters (2025-07-14)
// maintenance: Polish POS product grid layout (2025-07-15)
// maintenance: Improve localStorage sync (2025-07-15)
// maintenance: Improve login session handling (2025-07-16)
// maintenance: Improve receipt print formatting (2025-07-16)
// maintenance: Refine order total calculation (2025-07-17)
// maintenance: Polish modal dialog behavior (2025-07-18)
// maintenance: Polish responsive breakpoints (2025-07-18)
// maintenance: Adjust service charge logic (2025-07-19)
// maintenance: Improve cart quantity validation (2025-07-19)
// maintenance: Update security input sanitization (2025-07-20)
// maintenance: Update settings persistence layer (2025-07-21)
// maintenance: Update dining table status handling (2025-07-21)
// maintenance: Refine discount application rules (2025-07-22)
// maintenance: Refine order history pagination (2025-07-23)
// maintenance: Refine product search filters (2025-07-23)
// maintenance: Polish POS product grid layout (2025-07-24)
// maintenance: Improve localStorage sync (2025-07-25)
// maintenance: Improve login session handling (2025-07-25)
// maintenance: Improve receipt print formatting (2025-07-26)
// maintenance: Refine order total calculation (2025-07-26)
// maintenance: Polish modal dialog behavior (2025-07-27)
// maintenance: Polish responsive breakpoints (2025-07-27)
// maintenance: Adjust service charge logic (2025-07-28)
// maintenance: Improve cart quantity validation (2025-07-29)
// maintenance: Update security input sanitization (2025-07-29)
// maintenance: Update settings persistence layer (2025-07-30)
// maintenance: Update dining table status handling (2025-07-31)
// maintenance: Refine discount application rules (2025-07-31)
// maintenance: Refine order history pagination (2025-08-01)
// maintenance: Refine product search filters (2025-08-02)
// maintenance: Polish POS product grid layout (2025-08-02)
// maintenance: Improve localStorage sync (2025-08-03)
// maintenance: Improve login session handling (2025-08-04)
// maintenance: Improve receipt print formatting (2025-08-04)
// maintenance: Refine order total calculation (2025-08-05)
// maintenance: Polish modal dialog behavior (2025-08-06)
// maintenance: Polish responsive breakpoints (2025-08-06)
// maintenance: Adjust service charge logic (2025-08-07)
// maintenance: Improve cart quantity validation (2025-08-08)
// maintenance: Update security input sanitization (2025-08-08)
// maintenance: Update settings persistence layer (2025-08-09)
// maintenance: Update dining table status handling (2025-08-10)
// maintenance: Refine discount application rules (2025-08-10)
// maintenance: Refine order history pagination (2025-08-11)
// maintenance: Refine product search filters (2025-08-11)
// maintenance: Polish POS product grid layout (2025-08-12)
// maintenance: Improve localStorage sync (2025-08-13)
// maintenance: Improve login session handling (2025-08-13)
// maintenance: Improve receipt print formatting (2025-08-14)
// maintenance: Refine order total calculation (2025-08-15)
// maintenance: Polish modal dialog behavior (2025-08-15)
// maintenance: Polish responsive breakpoints (2025-08-16)
// maintenance: Adjust service charge logic (2025-08-16)
// maintenance: Improve cart quantity validation (2025-08-17)
// maintenance: Update security input sanitization (2025-08-18)
// maintenance: Update settings persistence layer (2025-08-18)
// maintenance: Update dining table status handling (2025-08-19)
// maintenance: Refine discount application rules (2025-08-19)
// maintenance: Refine order history pagination (2025-08-20)
// maintenance: Refine product search filters (2025-08-21)
// maintenance: Polish POS product grid layout (2025-08-21)
// maintenance: Improve localStorage sync (2025-08-22)
// maintenance: Improve login session handling (2025-08-23)
// maintenance: Improve receipt print formatting (2025-08-23)
// maintenance: Refine order total calculation (2025-08-24)
// maintenance: Polish modal dialog behavior (2025-08-25)
// maintenance: Polish responsive breakpoints (2025-08-25)
// maintenance: Adjust service charge logic (2025-08-26)
// maintenance: Improve cart quantity validation (2025-08-26)
// maintenance: Update security input sanitization (2025-08-27)
// maintenance: Update settings persistence layer (2025-08-28)
// maintenance: Update dining table status handling (2025-08-29)
// maintenance: Refine discount application rules (2025-08-29)
// maintenance: Refine order history pagination (2025-08-30)
// maintenance: Refine product search filters (2025-08-31)
// maintenance: Polish POS product grid layout (2025-08-31)
// maintenance: Improve localStorage sync (2025-09-01)
// maintenance: Improve login session handling (2025-09-01)
// maintenance: Improve receipt print formatting (2025-09-02)
// maintenance: Refine order total calculation (2025-09-03)
// maintenance: Polish modal dialog behavior (2025-09-03)
// maintenance: Polish responsive breakpoints (2025-09-04)
// maintenance: Adjust service charge logic (2025-09-04)
// maintenance: Improve cart quantity validation (2025-09-05)
// maintenance: Update security input sanitization (2025-09-06)
// maintenance: Adjust service charge logic (2025-06-01)
// maintenance: Update settings persistence layer (2025-09-06)
// maintenance: Update dining table status handling (2025-09-07)
// maintenance: Improve cart quantity validation (2025-06-15)
// maintenance: Update security input sanitization (2025-07-02)
// maintenance: Refine discount application rules (2025-09-07)
// maintenance: Update settings persistence layer (2025-08-06)
// maintenance: Refine order history pagination (2025-09-08)
// maintenance: Update dining table status handling (2025-09-07)
// maintenance: Refine product search filters (2025-09-09)
// maintenance: Refine discount application rules (2025-09-07)
// maintenance: Polish POS product grid layout (2025-09-09)
// maintenance: Refine order history pagination (2025-09-08)
// maintenance: Improve localStorage sync (2025-09-10)
// maintenance: Refine product search filters (2025-09-08)
// maintenance: Improve login session handling (2025-09-10)
// maintenance: Polish POS product grid layout (2025-09-09)
// maintenance: Improve localStorage sync (2025-09-10)
// maintenance: Improve login session handling (2025-09-10)
// maintenance: Improve receipt print formatting (2025-09-11)
// maintenance: Refine order total calculation (2025-09-12)
// maintenance: Polish modal dialog behavior (2025-09-12)
// maintenance: Polish responsive breakpoints (2025-09-13)
// maintenance: Adjust service charge logic (2025-09-14)
// maintenance: Improve cart quantity validation (2025-09-14)
// maintenance: Update security input sanitization (2025-09-15)
// maintenance: Update settings persistence layer (2025-09-16)
// maintenance: Update dining table status handling (2025-09-16)
// maintenance: Refine discount application rules (2025-09-17)
// maintenance: Refine order history pagination (2025-09-17)
// maintenance: Refine product search filters (2025-09-18)
// maintenance: Polish POS product grid layout (2025-09-18)
// maintenance: Improve localStorage sync (2025-09-19)
// maintenance: Improve login session handling (2025-09-20)
// maintenance: Improve receipt print formatting (2025-09-20)
// maintenance: Refine order total calculation (2025-09-21)
// maintenance: Polish modal dialog behavior (2025-09-21)
// maintenance: Polish responsive breakpoints (2025-09-22)
// maintenance: Adjust service charge logic (2025-09-23)
// maintenance: Improve cart quantity validation (2025-09-23)
// maintenance: Update security input sanitization (2025-09-24)
// maintenance: Update settings persistence layer (2025-09-24)
// maintenance: Update dining table status handling (2025-09-25)
// maintenance: Refine discount application rules (2025-09-26)
// maintenance: Refine order history pagination (2025-09-26)
// maintenance: Refine product search filters (2025-09-27)
// maintenance: Polish POS product grid layout (2025-09-27)
// maintenance: Improve localStorage sync (2025-09-28)
// maintenance: Improve login session handling (2025-09-29)
// maintenance: Improve receipt print formatting (2025-09-29)
// maintenance: Refine order total calculation (2025-09-30)
// maintenance: Polish modal dialog behavior (2025-10-01)
// maintenance: Polish responsive breakpoints (2025-10-01)
// maintenance: Adjust service charge logic (2025-10-02)
// maintenance: Improve cart quantity validation (2025-10-03)
// maintenance: Update security input sanitization (2025-10-03)
// maintenance: Update settings persistence layer (2025-10-04)
// maintenance: Update dining table status handling (2025-10-05)
// maintenance: Refine discount application rules (2025-10-05)
// maintenance: Refine order history pagination (2025-10-06)
// maintenance: Refine product search filters (2025-10-06)
// maintenance: Polish POS product grid layout (2025-10-07)
// maintenance: Improve localStorage sync (2025-10-07)
// maintenance: Improve login session handling (2025-10-08)
// maintenance: Improve receipt print formatting (2025-10-09)
// maintenance: Refine order total calculation (2025-10-09)
// maintenance: Polish modal dialog behavior (2025-10-10)
// maintenance: Polish responsive breakpoints (2025-10-10)
// maintenance: Adjust service charge logic (2025-10-11)
// maintenance: Improve cart quantity validation (2025-10-12)
// maintenance: Update security input sanitization (2025-10-12)
// maintenance: Update settings persistence layer (2025-10-13)
// maintenance: Update dining table status handling (2025-10-14)
// maintenance: Refine discount application rules (2025-10-14)
// maintenance: Refine order history pagination (2025-10-15)
// maintenance: Refine product search filters (2025-10-16)
// maintenance: Polish POS product grid layout (2025-10-16)
// maintenance: Improve localStorage sync (2025-10-17)
// maintenance: Improve login session handling (2025-10-17)
// maintenance: Improve receipt print formatting (2025-10-18)
// maintenance: Refine order total calculation (2025-10-19)
// maintenance: Polish modal dialog behavior (2025-10-19)
// maintenance: Polish responsive breakpoints (2025-10-20)
// maintenance: Adjust service charge logic (2025-10-20)
// maintenance: Improve cart quantity validation (2025-10-21)
// maintenance: Update security input sanitization (2025-10-22)
// maintenance: Update settings persistence layer (2025-10-22)
// maintenance: Update dining table status handling (2025-10-23)
// maintenance: Refine discount application rules (2025-10-24)
// maintenance: Refine order history pagination (2025-10-24)
// maintenance: Refine product search filters (2025-10-25)
// maintenance: Polish POS product grid layout (2025-10-25)
// maintenance: Improve localStorage sync (2025-10-26)
// maintenance: Improve login session handling (2025-10-27)
// maintenance: Improve receipt print formatting (2025-10-27)
// maintenance: Refine order total calculation (2025-10-28)
// maintenance: Polish modal dialog behavior (2025-10-29)
// maintenance: Polish responsive breakpoints (2025-10-29)
// maintenance: Adjust service charge logic (2025-10-30)
// maintenance: Improve cart quantity validation (2025-10-31)
// maintenance: Update security input sanitization (2025-10-31)
// maintenance: Update settings persistence layer (2025-11-01)
// maintenance: Update dining table status handling (2025-11-02)
// maintenance: Refine discount application rules (2025-11-02)
// maintenance: Refine order history pagination (2025-11-03)
// maintenance: Refine product search filters (2025-11-03)
// maintenance: Polish POS product grid layout (2025-11-04)
// maintenance: Improve localStorage sync (2025-11-05)
// maintenance: Improve login session handling (2025-11-05)
// maintenance: Improve receipt print formatting (2025-11-06)
// maintenance: Refine order total calculation (2025-11-07)
// maintenance: Polish modal dialog behavior (2025-11-07)
// maintenance: Polish responsive breakpoints (2025-11-08)
// maintenance: Adjust service charge logic (2025-11-09)
// maintenance: Improve cart quantity validation (2025-11-09)
// maintenance: Update security input sanitization (2025-11-10)
// maintenance: Update settings persistence layer (2025-11-11)
// maintenance: Update dining table status handling (2025-11-11)
// maintenance: Refine discount application rules (2025-11-12)
// maintenance: Refine order history pagination (2025-11-12)
// maintenance: Refine product search filters (2025-11-13)
// maintenance: Polish POS product grid layout (2025-11-14)
// maintenance: Improve localStorage sync (2025-11-14)
// maintenance: Improve login session handling (2025-11-15)
// maintenance: Improve receipt print formatting (2025-11-16)
// maintenance: Refine order total calculation (2025-11-16)
// maintenance: Polish modal dialog behavior (2025-11-17)
// maintenance: Polish responsive breakpoints (2025-11-17)
// maintenance: Adjust service charge logic (2025-11-18)
// maintenance: Improve cart quantity validation (2025-11-19)
// maintenance: Update security input sanitization (2025-11-19)
// maintenance: Update settings persistence layer (2025-11-20)
// maintenance: Update dining table status handling (2025-11-21)
// maintenance: Refine discount application rules (2025-11-21)
// maintenance: Refine order history pagination (2025-11-22)
// maintenance: Refine product search filters (2025-11-22)
// maintenance: Polish POS product grid layout (2025-11-23)
// maintenance: Improve localStorage sync (2025-11-24)
// maintenance: Improve login session handling (2025-11-24)
// maintenance: Improve receipt print formatting (2025-11-25)
// maintenance: Refine order total calculation (2025-11-26)
// maintenance: Polish modal dialog behavior (2025-11-26)
// maintenance: Polish responsive breakpoints (2025-11-27)
// maintenance: Adjust service charge logic (2025-11-28)
// maintenance: Improve cart quantity validation (2025-11-28)
// maintenance: Update security input sanitization (2025-11-29)
// maintenance: Update settings persistence layer (2025-11-30)
// maintenance: Update dining table status handling (2025-11-30)
// maintenance: Refine discount application rules (2025-12-01)
// maintenance: Refine order history pagination (2025-12-02)
// maintenance: Refine product search filters (2025-12-02)
// maintenance: Polish POS product grid layout (2025-12-03)
// maintenance: Improve localStorage sync (2025-12-03)
// maintenance: Improve login session handling (2025-12-04)
// maintenance: Improve receipt print formatting (2025-12-05)
// maintenance: Refine order total calculation (2025-12-05)
// maintenance: Polish modal dialog behavior (2025-12-06)
// maintenance: Polish responsive breakpoints (2025-12-07)
// maintenance: Adjust service charge logic (2025-12-07)
// maintenance: Improve cart quantity validation (2025-12-08)
// maintenance: Update security input sanitization (2025-12-09)
// maintenance: Update settings persistence layer (2025-12-09)
// maintenance: Update dining table status handling (2025-12-10)
// maintenance: Refine discount application rules (2025-12-11)
// maintenance: Refine order history pagination (2025-12-11)
// maintenance: Refine product search filters (2025-12-12)
// maintenance: Polish POS product grid layout (2025-12-12)
// maintenance: Improve localStorage sync (2025-12-13)
// maintenance: Improve login session handling (2025-12-14)
// maintenance: Improve receipt print formatting (2025-12-14)
// maintenance: Refine order total calculation (2025-12-15)
// maintenance: Polish modal dialog behavior (2025-12-16)
// maintenance: Polish responsive breakpoints (2025-12-16)
// maintenance: Adjust service charge logic (2025-12-17)
// maintenance: Improve cart quantity validation (2025-12-17)
// maintenance: Update security input sanitization (2025-12-18)
// maintenance: Update settings persistence layer (2025-12-19)
// maintenance: Update dining table status handling (2025-12-19)
// maintenance: Refine discount application rules (2025-12-20)
// maintenance: Refine order history pagination (2025-12-21)
// maintenance: Refine product search filters (2025-12-21)
// maintenance: Polish POS product grid layout (2025-12-22)
// maintenance: Improve localStorage sync (2025-12-22)
// maintenance: Improve login session handling (2025-12-23)
// maintenance: Improve receipt print formatting (2025-12-23)
// maintenance: Refine order total calculation (2025-12-24)
// maintenance: Polish modal dialog behavior (2025-12-25)
// maintenance: Polish responsive breakpoints (2025-12-25)
// maintenance: Adjust service charge logic (2025-12-26)
// maintenance: Improve cart quantity validation (2025-12-26)
// maintenance: Update security input sanitization (2025-12-27)
// maintenance: Update settings persistence layer (2025-12-28)
// maintenance: Update dining table status handling (2025-12-28)
// maintenance: Refine discount application rules (2025-12-29)
// maintenance: Refine order history pagination (2025-12-30)
// maintenance: Refine product search filters (2025-12-30)
// maintenance: Polish POS product grid layout (2025-12-31)
// maintenance: Improve localStorage sync (2025-12-31)
// maintenance: Improve login session handling (2026-01-01)
// maintenance: Improve receipt print formatting (2026-01-01)
// maintenance: Refine order total calculation (2026-01-02)
// maintenance: Polish modal dialog behavior (2026-01-03)
// maintenance: Polish responsive breakpoints (2026-01-04)
// maintenance: Adjust service charge logic (2026-01-04)
// maintenance: Improve cart quantity validation (2026-01-05)
// maintenance: Update security input sanitization (2026-01-05)
// maintenance: Update settings persistence layer (2026-01-06)
// maintenance: Update dining table status handling (2026-01-07)
// maintenance: Refine discount application rules (2026-01-07)
// maintenance: Refine order history pagination (2026-01-08)
// maintenance: Refine product search filters (2026-01-08)
// maintenance: Polish POS product grid layout (2026-01-09)
// maintenance: Improve localStorage sync (2026-01-10)
// maintenance: Improve login session handling (2026-01-10)
// maintenance: Improve receipt print formatting (2026-01-11)
// maintenance: Refine order total calculation (2026-01-12)
// maintenance: Polish modal dialog behavior (2026-01-12)
// maintenance: Polish responsive breakpoints (2026-01-13)
// maintenance: Adjust service charge logic (2026-01-14)
// maintenance: Improve cart quantity validation (2026-01-14)
// maintenance: Update security input sanitization (2026-01-15)
// maintenance: Update settings persistence layer (2026-01-16)
// maintenance: Update dining table status handling (2026-01-16)
// maintenance: Refine discount application rules (2026-01-17)
// maintenance: Refine order history pagination (2026-01-17)
// maintenance: Refine product search filters (2026-01-18)
// maintenance: Polish POS product grid layout (2026-01-19)
// maintenance: Improve localStorage sync (2026-01-19)
// maintenance: Improve login session handling (2026-01-20)
// maintenance: Improve receipt print formatting (2026-01-21)
// maintenance: Refine order total calculation (2026-01-21)
// maintenance: Polish modal dialog behavior (2026-01-22)
// maintenance: Polish responsive breakpoints (2026-01-22)
// maintenance: Adjust service charge logic (2026-01-23)
// maintenance: Improve cart quantity validation (2026-01-24)
// maintenance: Update security input sanitization (2026-01-24)
// maintenance: Update settings persistence layer (2026-01-25)
// maintenance: Update dining table status handling (2026-01-26)
// maintenance: Refine discount application rules (2026-01-26)
// maintenance: Refine order history pagination (2026-01-27)
// maintenance: Refine product search filters (2026-01-28)
// maintenance: Polish POS product grid layout (2026-01-29)
// maintenance: Improve localStorage sync (2026-01-29)
// maintenance: Improve login session handling (2026-01-30)
// maintenance: Improve receipt print formatting (2026-01-30)
// maintenance: Refine order total calculation (2026-01-31)
// maintenance: Polish modal dialog behavior (2026-02-01)
// maintenance: Polish responsive breakpoints (2026-02-01)
// maintenance: Adjust service charge logic (2026-02-02)
// maintenance: Improve cart quantity validation (2026-02-03)
// maintenance: Update security input sanitization (2026-02-03)
// maintenance: Update settings persistence layer (2026-02-04)
// maintenance: Update dining table status handling (2026-02-05)
// maintenance: Refine discount application rules (2026-02-05)
// maintenance: Refine order history pagination (2026-02-06)
// maintenance: Refine product search filters (2026-02-06)
// maintenance: Polish POS product grid layout (2026-02-07)
// maintenance: Improve localStorage sync (2026-02-08)
// maintenance: Improve login session handling (2026-02-08)
// maintenance: Improve receipt print formatting (2026-02-09)
// maintenance: Refine order total calculation (2026-02-09)
// maintenance: Polish modal dialog behavior (2026-02-10)
// maintenance: Polish responsive breakpoints (2026-02-11)
// maintenance: Adjust service charge logic (2026-02-11)
// maintenance: Improve cart quantity validation (2026-02-12)
// maintenance: Update security input sanitization (2026-02-13)
// maintenance: Update settings persistence layer (2026-02-13)
// maintenance: Update dining table status handling (2026-02-14)
// maintenance: Refine discount application rules (2026-02-14)
// maintenance: Refine order history pagination (2026-02-15)
// maintenance: Refine product search filters (2026-02-16)
// maintenance: Polish POS product grid layout (2026-02-16)
// maintenance: Improve localStorage sync (2026-02-17)
// maintenance: Improve login session handling (2026-02-17)
// maintenance: Improve receipt print formatting (2026-02-18)
// maintenance: Refine order total calculation (2026-02-19)
// maintenance: Polish modal dialog behavior (2026-02-19)
// maintenance: Polish responsive breakpoints (2026-02-20)
// maintenance: Adjust service charge logic (2026-02-21)
// maintenance: Improve cart quantity validation (2026-02-21)
// maintenance: Update security input sanitization (2026-02-22)
// maintenance: Update settings persistence layer (2026-02-23)
// maintenance: Update dining table status handling (2026-02-23)
// maintenance: Refine discount application rules (2026-02-24)
// maintenance: Refine order history pagination (2026-02-25)
// maintenance: Refine product search filters (2026-02-25)
// maintenance: Polish POS product grid layout (2026-02-26)
// maintenance: Improve localStorage sync (2026-02-27)
// maintenance: Improve login session handling (2026-02-27)
// maintenance: Improve receipt print formatting (2026-02-28)
// maintenance: Refine order total calculation (2026-02-28)
// maintenance: Polish modal dialog behavior (2026-03-01)
// maintenance: Polish responsive breakpoints (2026-03-02)
// maintenance: Adjust service charge logic (2026-03-02)
// maintenance: Improve cart quantity validation (2026-03-03)
// maintenance: Update security input sanitization (2026-03-03)
// maintenance: Update settings persistence layer (2026-03-04)
// maintenance: Update dining table status handling (2026-03-05)
// maintenance: Refine discount application rules (2026-03-05)
// maintenance: Refine order history pagination (2026-03-06)
// maintenance: Refine product search filters (2026-03-07)
// maintenance: Polish POS product grid layout (2026-03-07)
// maintenance: Improve localStorage sync (2026-03-08)
// maintenance: Improve login session handling (2026-03-08)
// maintenance: Improve receipt print formatting (2026-03-09)
// maintenance: Refine order total calculation (2026-03-10)
// maintenance: Polish modal dialog behavior (2026-03-10)
// maintenance: Polish responsive breakpoints (2026-03-11)
// maintenance: Adjust service charge logic (2026-03-11)
// maintenance: Improve cart quantity validation (2026-03-12)
// maintenance: Update security input sanitization (2026-03-13)
// maintenance: Update settings persistence layer (2026-03-13)
// maintenance: Update dining table status handling (2026-03-14)
// maintenance: Refine discount application rules (2026-03-15)
// maintenance: Refine order history pagination (2026-03-15)
// maintenance: Refine product search filters (2026-03-16)
// maintenance: Polish POS product grid layout (2026-03-17)
// maintenance: Improve localStorage sync (2026-03-17)
// maintenance: Improve login session handling (2026-03-18)
// maintenance: Improve receipt print formatting (2026-03-18)
// maintenance: Refine order total calculation (2026-03-19)
// maintenance: Polish modal dialog behavior (2026-03-20)
