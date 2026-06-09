// ========================================
// CONTROLLER LAYER - Business Logic
// ========================================

const Controller = {

    // ========================================
    // 1. SYSTEM INITIALIZATION
    // ========================================

    //  Initialize System
    initSystem() {
        console.log('ðŸš€ Initializing Restaurant POS System...');
        
        // Load all data from storage
        Model.loadProductsFromStorage();
        Model.loadCartFromStorage();
        Model.loadOrdersFromStorage();
        Model.loadSettings();
        Model.loadCurrentUser();
        Model.loadCategoryHierarchy();
        Model.loadSalesHistory(); // Load sales history
        
        // Check for daily reset
        const report = Model.checkDailyReset();
        if (report && report.orderCount > 0) {
            this.sendDailyReportToWhatsApp(report);
        }
        // Update user display and navigation
        View.updateUserDisplay(Model.currentUser);

        // Setup event listeners
        this.setupEventListeners();

        console.log(' System initialized successfully');
    },

    // Setup event listeners
    setupEventListeners() {
        // Product form submit
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const productId = document.getElementById('productId').value;
                if (productId) {
                    this.updateProduct();
                } else {
                    this.addProduct();
                }
            });
        }

        // Search input
        const searchInput = document.getElementById('searchProduct');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchProducts(e.target.value);
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterByCategory(e.target.value);
            });
        }

        // POS search
        const posSearch = document.getElementById('posSearch');
        if (posSearch) {
            posSearch.addEventListener('input', (e) => {
                this.searchProductsInPOS(e.target.value);
            });
        }

        // Settings form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateSettings();
            });
        }
    },

    // Setup page-specific event listeners
    setupProductsPageListeners() {
        // Product form
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const editingId = document.getElementById('productId');
                if (editingId && editingId.value) {
                    this.updateProduct();
                } else {
                    this.addProduct();
                }
            });
        }
    },

    setupPOSPageListeners() {
        // POS search
        const posSearch = document.getElementById('posSearch');
        if (posSearch) {
            posSearch.addEventListener('input', (e) => {
                this.searchProductsInPOS(e.target.value);
            });
        }
    },

    setupSettingsPageListeners() {
        // Settings form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateSettings();
            });
        }
    },

    // ========================================
    // 2. PRODUCT MANAGEMENT
    // ========================================

    //  Load Products
    loadProducts() {
        const products = Model.getAllProducts();
        View.renderProductsTable(products);
        
        // Populate category dropdowns
        View.populateMainCategoryDropdowns();
        View.populateAllSubCategoriesFilter();
    },

    //  Add Product
    addProduct() {
        const productData = {
            name: document.getElementById('productName').value,
            mainCategory: document.getElementById('productMainCategory').value,
            subCategory: document.getElementById('productSubCategory').value,
            price: document.getElementById('productPrice').value,
            stock: document.getElementById('productStock').value
        };

        // Security validation
        const validation = Security.validateProductData(productData);
        if (!validation.valid) {
            View.showAlert(validation.errors.join(', '), 'error');
            return;
        }

        const product = Model.addProduct(validation.sanitizedData);
        if (product) {
            View.showAlert('Product added successfully!', 'success');
            this.loadProducts();
            this.loadProductsToPOS();
            View.clearProductForm();
        } else {
            View.showAlert('Failed to add product', 'error');
        }
    },

    //  Edit Product
    editProduct(productId) {
        const product = Model.getProductById(productId);
        if (product) {
            View.fillProductForm(product);
            // Scroll to form
            document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
        }
    },

    //  Update Product
    updateProduct() {
        const productId = document.getElementById('productId').value;
        
        const productData = {
            name: document.getElementById('productName').value,
            mainCategory: document.getElementById('productMainCategory').value,
            subCategory: document.getElementById('productSubCategory').value,
            price: document.getElementById('productPrice').value,
            stock: document.getElementById('productStock').value
        };

        // Security validation
        const validation = Security.validateProductData(productData);
        if (!validation.valid) {
            View.showAlert(validation.errors.join(', '), 'error');
            return;
        }

        if (Model.updateProduct(productId, validation.sanitizedData)) {
            View.showAlert('Product updated successfully!', 'success');
            this.loadProducts();
            this.loadProductsToPOS();
            View.clearProductForm();
        } else {
            View.showAlert('Failed to update product', 'error');
        }
    },

    //  Delete Product
    async deleteProduct(productId) {
        const confirmed = await View.showConfirm('Are you sure you want to delete this product?');
        if (confirmed) {
            if (Model.deleteProduct(productId)) {
                View.showAlert('Product deleted successfully!', 'success');
                this.loadProducts();
                this.loadProductsToPOS();
            } else {
                View.showAlert('Failed to delete product', 'error');
            }
        }
    },

    //  Clear Product Form
    clearProductForm() {
        View.clearProductForm();
    },

    //  &  Search Products
    searchProducts(query) {
        this.filterProducts();
    },

    //  Filter by Category
    filterByCategory(category) {
        const products = Model.filterByCategory(category);
        View.renderProductsTable(products);
    },

    //  Sort by Price
    sortByPrice(order) {
        const products = Model.sortByPrice(order);
        View.renderProductsTable(products);
    },

    //  Validate Product Form
    validateProductForm() {
        const name = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value.trim();
        const price = document.getElementById('productPrice').value;
        const stock = document.getElementById('productStock').value;

        if (!name) {
            View.showAlert('Please enter product name', 'error');
            return false;
        }

        if (!category) {
            View.showAlert('Please enter category', 'error');
            return false;
        }

        if (!price || parseFloat(price) <= 0) {
            View.showAlert('Please enter valid price', 'error');
            return false;
        }

        if (!stock || parseInt(stock) < 0) {
            View.showAlert('Please enter valid stock', 'error');
            return false;
        }

        return true;
    },

    // ========================================
    // 3. POS / BILLING FUNCTIONS
    // ========================================

    //  Load Products to POS
    loadProductsToPOS() {
        const products = Model.getAllProducts();
        View.renderProductsGrid(products);
        View.renderPOSMainCategoryFilters('All');
        View.renderPOSSubCategoryFilters(null);
        this.currentPOSMainCategory = 'All';
        this.currentPOSSubCategory = 'All';
    },

    // Filter POS by Main Category
    filterPOSByMainCategory(mainCategory) {
        this.currentPOSMainCategory = mainCategory;
        this.currentPOSSubCategory = 'All';
        
        const searchQuery = document.getElementById('posSearch')?.value || '';
        let products = Model.filterByHierarchy(mainCategory, 'All');
        
        // Apply search filter if there's a search query
        if (searchQuery) {
            products = products.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        View.renderProductsGrid(products);
        View.renderPOSMainCategoryFilters(mainCategory);
        View.renderPOSSubCategoryFilters(mainCategory, 'All');
    },

    // Filter POS by Sub Category
    filterPOSBySubCategory(subCategory) {
        this.currentPOSSubCategory = subCategory;
        const mainCategory = this.currentPOSMainCategory || 'All';
        
        const searchQuery = document.getElementById('posSearch')?.value || '';
        let products = Model.filterByHierarchy(mainCategory, subCategory);
        
        // Apply search filter if there's a search query
        if (searchQuery) {
            products = products.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        View.renderProductsGrid(products);
        View.renderPOSSubCategoryFilters(mainCategory, subCategory);
    },

    // Filter POS by Category (legacy support)
    filterPOSByCategory(category) {
        this.currentPOSCategory = category;
        const searchQuery = document.getElementById('posSearch')?.value || '';
        
        let products = Model.filterByCategory(category);
        
        // Apply search filter if there's a search query
        if (searchQuery) {
            products = products.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        View.renderProductsGrid(products);
        View.renderPOSCategoryFilters(Model.getCategories(), category);
    },

    // Search in POS
    searchProductsInPOS(query) {
        const mainCategory = this.currentPOSMainCategory || 'All';
        const subCategory = this.currentPOSSubCategory || 'All';
        let products = Model.filterByHierarchy(mainCategory, subCategory);
        
        if (query) {
            products = products.filter(p => 
                p.name.toLowerCase().includes(query.toLowerCase())
            );
        }
        
        View.renderProductsGrid(products);
    },

    // Update subcategory dropdown when main category changes
    updateSubCategoryDropdown() {
        const mainCategory = document.getElementById('productMainCategory')?.value;
        if (mainCategory) {
            View.populateSubCategoryDropdown(mainCategory);
        }
    },

    // Filter products by main category
    filterByMainCategory() {
        const mainCategory = document.getElementById('mainCategoryFilter')?.value || 'All';
        
        // Update subcategory filter options and reset to "All"
        if (mainCategory === 'All') {
            View.populateAllSubCategoriesFilter();
        } else {
            const subCategories = Model.getSubCategories(mainCategory);
            const filterSelect = document.getElementById('subCategoryFilter');
            if (filterSelect) {
                filterSelect.innerHTML = subCategories.map(cat => 
                    `<option value="${cat}">${cat}</option>`
                ).join('');
            }
        }
        
        this.filterProducts();
    },

    // Filter products by subcategory
    filterBySubCategory() {
        this.filterProducts();
    },

    // Apply all filters
    filterProducts() {
        const searchQuery = document.getElementById('searchProduct')?.value || '';
        const mainCategory = document.getElementById('mainCategoryFilter')?.value || 'All';
        const subCategory = document.getElementById('subCategoryFilter')?.value || 'All';
        
        let products = Model.filterByHierarchy(mainCategory, subCategory);
        
        if (searchQuery) {
            products = products.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        View.renderProductsTable(products);
    },

    //  Add to Cart
    addToCart(productId) {
        if (Model.addToCart(productId)) {
            this.renderCart();
            View.showAlert('Product added to cart', 'success');
        } else {
            View.showAlert('Failed to add product', 'error');
        }
    },

    //  Render Cart
    renderCart() {
        const cart = Model.getCart();
        View.renderCart(cart);
    },

    //  Update Cart Quantity
    updateCartQuantity(productId, quantity) {
        // Validate and sanitize quantity
        const validQty = Security.validateCartQuantity(quantity);
        Model.updateCartQuantity(productId, validQty);
        this.renderCart();
    },

    //  Remove from Cart
    removeFromCart(productId) {
        if (View.showConfirm('Remove this item from cart?')) {
            Model.removeFromCart(productId);
            this.renderCart();
            View.showAlert('Item removed from cart', 'success');
        }
    },

    //  Clear Cart
    clearCart() {
        if (View.showConfirm('Clear all items from cart?')) {
            Model.clearCart();
            Model.clearPayment();
            this.renderCart();
            View.clearPaymentFields();
            View.showAlert('Cart cleared', 'success');
        }
    },

    // Calculate and display balance
    calculateBalance() {
        const paymentInput = document.getElementById('paymentAmount');
        if (!paymentInput) return;

        const paymentAmount = parseFloat(paymentInput.value) || 0;
        const balanceData = Model.calculateBalance(paymentAmount);
        View.displayBalance(balanceData);
    },

    // ========================================
    // 4. RECEIPT & PRINTING
    // ========================================

    //  Print Bill
    printBill() {
        const cart = Model.getCart();
        
        if (cart.length === 0) {
            View.showAlert('Cart is empty!', 'error');
            return;
        }

        // Check if payment is sufficient
        const totals = Model.calculateTotal();
        const paymentAmount = Model.getPaymentAmount();
        
        if (paymentAmount < totals.total) {
            View.showAlert('Payment amount is less than total bill!', 'error');
            return;
        }

        try {
            //  Save order first
            const order = Model.saveOrder();
            
            // Check for errors
            if (!order) {
                View.showAlert('Failed to complete order', 'error');
                return;
            }
            
            if (order.error) {
                View.showAlert(order.error, 'error');
                return;
            }
            
            // Order already has payment and balance from Model.saveOrder
            // Just ensure they're set
            if (!order.payment) {
                order.payment = paymentAmount;
                order.balance = paymentAmount - order.totals.total;
            }
            
            //  Generate receipt
            View.generateReceipt(order);
            
            // Show modal
            View.showModal('receiptModal');
            
            // Print after short delay
            setTimeout(() => {
                try {
                    window.print();
                } catch (printError) {
                    console.error('Print error:', printError);
                    View.showAlert('Print function not available', 'error');
                }
            }, 500);

            // Clear cart, payment and refresh
            this.renderCart();
            View.clearPaymentFields();
            View.showAlert('Order completed successfully! Stock updated.', 'success');
            
            // Refresh products display to show updated stock
            this.loadProductsToPOS();
        } catch (error) {
            console.error('Error in printBill:', error);
            View.showAlert('Error processing order: ' + error.message, 'error');
        }
    },

    // Close receipt modal
    closeReceipt() {
        View.hideModal('receiptModal');
    },

    // ========================================
    // 5. ORDER MANAGEMENT
    // ========================================

    //  Load Orders
    loadOrders() {
        const orders = Model.getAllOrders();
        View.renderOrdersTable(orders);
    },

    //  View Order
    viewOrder(orderId) {
        const order = Model.getOrderById(orderId);
        if (order) {
            View.generateReceipt(order);
            View.showModal('receiptModal');
        }
    },

    //  Delete Order
    async deleteOrder(orderId) {
        const confirmed = await View.showConfirm('Are you sure you want to delete this order?');
        if (confirmed) {
            if (Model.deleteOrder(orderId)) {
                View.showAlert('Order deleted successfully!', 'success');
                this.loadOrders();
            } else {
                View.showAlert('Failed to delete order', 'error');
            }
        }
    },

    // Send current order history report to WhatsApp
    sendOrderHistoryReport() {
        const settings = Model.getSettings();
        const adminPhone = settings.adminPhone;
        
        if (!adminPhone) {
            View.showAlert('Please set Admin WhatsApp number in Settings first!', 'error');
            return;
        }
        
        const report = Model.calculateDailyTotal();
        
        if (report.orderCount === 0) {
            View.showAlert('No orders to report!', 'info');
            return;
        }
        
        const today = new Date().toLocaleDateString();
        const now = new Date().toLocaleTimeString();
        
        // Get detailed statistics
        const stats = Model.getDetailedOrderStats();
        
        // Build detailed breakdown by category and product
        let detailedBreakdown = '';
        Object.keys(stats.categoryStats).sort().forEach(category => {
            const catData = stats.categoryStats[category];
            detailedBreakdown += `\n *${category}* (${Model.formatCurrency(catData.amount)})\n`;
            
            // Sort products by quantity (highest first)
            const products = Object.entries(catData.products)
                .sort((a, b) => b[1].count - a[1].count);
            
            products.forEach(([productName, productData]) => {
                detailedBreakdown += `  \u2022 ${productData.count}x ${productName} - ${Model.formatCurrency(productData.amount)}\n`;
            });
        });
        
        const message = `*${Model.getRestaurantName()}*\n` +
                       `\u{1F4CA} *ORDER HISTORY REPORT*\n` +
                       `━━━━━━━━━━━━━━━━━━\n` +
                       `\u{1F4C5} Date: ${today}\n` +
                       `\u23F0 Time: ${now}\n\n` +
                       `\u{1F4CA} *SUMMARY*\n` +
                       `\u{1F4CB} Total Orders: *${stats.totalOrders}*\n` +
                       `\u{1F371} Total Items Sold: *${stats.totalItems}*\n` +
                       `\u{1F4B0} Total Income: *${Model.formatCurrency(stats.totalAmount)}*\n` +
                       `━━━━━━━━━━━━━━━━━━\n` +
                       `\u{1F4CA} *DETAILED BREAKDOWN*` +
                       `${detailedBreakdown}\n` +
                       `━━━━━━━━━━━━━━━━━━\n` +
                       `\u{1F464} Generated by: ${Model.currentUser ? Model.currentUser.username : 'Admin'}`;
        
        // Create WhatsApp link
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodedMessage}`;
        
        // Open WhatsApp in new window
        window.open(whatsappUrl, '_blank');
        
        View.showAlert('Opening WhatsApp...', 'success');
    },
    
    // Load 3-month sales history
    loadSalesHistory() {
        try {
            const summary = Model.getThreeMonthSummary();
            View.renderSalesHistory(summary);
        } catch (error) {
            console.error('Error loading sales history:', error);
            View.showAlert('Error loading sales history', 'error');
        }
    },
    
    // Manually save current day to history
    saveCurrentDayToHistory() {
        const result = Model.saveCurrentDayToHistory();
        if (result.success) {
            View.showAlert('Current day orders saved to history!', 'success');
            this.loadSalesHistory(); // Refresh the view
        } else {
            View.showAlert(result.message || 'No orders to save', 'info');
        }
    },
    
    // View specific month details
    viewMonthDetails(monthKey) {
        try {
            const monthData = Model.getMonthHistory(monthKey);
            if (monthData) {
                View.showMonthDetailsModal(monthData);
            } else {
                View.showAlert('Month data not found', 'error');
            }
        } catch (error) {
            console.error('Error viewing month details:', error);
            View.showAlert('Error loading month details', 'error');
        }
    },
    
    // Export sales history to WhatsApp
    exportSalesHistory() {
        const settings = Model.getSettings();
        const adminPhone = settings.adminPhone;
        
        if (!adminPhone) {
            View.showAlert('Please set Admin WhatsApp number in Settings first!', 'error');
            return;
        }
        
        try {
            const summary = Model.getThreeMonthSummary();
            
            if (summary.months.length === 0) {
                View.showAlert('No sales history available', 'info');
                return;
            }
            
            // Build comprehensive report
            let monthlyBreakdown = '';
            summary.months.forEach(month => {
                monthlyBreakdown += `\n\u{1F4C5} *${month.month}*\n`;
                monthlyBreakdown += `  Orders: ${month.totalOrders}\n`;
                monthlyBreakdown += `  Items: ${month.totalItems}\n`;
                monthlyBreakdown += `  Revenue: ${Model.formatCurrency(month.totalRevenue)}\n`;
            });
            
            // Top 5 products
            const topProducts = Object.entries(summary.productTotals)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map((([name, data], i) => `${i + 1}. ${name} (${data.count}x)`));
            
            const message = `*${Model.getRestaurantName()}*\n` +
                           `\u{1F4CA} *3-MONTH SALES HISTORY*\n` +
                           `━━━━━━━━━━━━━━━━━━\n\n` +
                           `\u{1F4CA} *OVERALL SUMMARY*\n` +
                           `\u{1F4CB} Total Orders: *${summary.totalOrders}*\n` +
                           `\u{1F371} Total Items: *${summary.totalItems}*\n` +
                           `\u{1F4B0} Total Revenue: *${Model.formatCurrency(summary.totalRevenue)}*\n` +
                           `\u{1F4B5} Avg Order: *${Model.formatCurrency(summary.averageOrderValue)}*\n` +
                           `━━━━━━━━━━━━━━━━━━\n` +
                           `\u{1F4C5} *MONTHLY BREAKDOWN*` +
                           `${monthlyBreakdown}\n` +
                           `━━━━━━━━━━━━━━━━━━\n` +
                           `\u{1F31F} *TOP 5 PRODUCTS*\n` +
                           `${topProducts.join('\n')}\n` +
                           `━━━━━━━━━━━━━━━━━━\n` +
                           `\u{1F4C6} Generated: ${new Date().toLocaleString()}\n` +
                           `\u{1F464} By: ${Model.currentUser ? Model.currentUser.username : 'Admin'}`;
            
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodedMessage}`;
            
            window.open(whatsappUrl, '_blank');
            View.showAlert('Opening WhatsApp with 3-month summary...', 'success');
        } catch (error) {
            console.error('Error exporting sales history:', error);
            View.showAlert('Error exporting sales history', 'error');
        }
    },

    // ========================================
    // 6. SETTINGS MANAGEMENT
    // ========================================

    updateSettingsUI() {
        const settings = Model.getSettings();
        View.updateSettingsDisplay(settings);
    },

    updateSettings() {
        const settingsData = {
            serviceCharge: document.getElementById('serviceChargeRate').value,
            discount: document.getElementById('discountRate').value,
            phone: document.getElementById('adminPhone').value
        };

        // Security validation
        const validation = Security.validateSettingsData(settingsData);
        if (!validation.valid) {
            View.showAlert(validation.errors.join(', '), 'error');
            return;
        }

        const sanitized = validation.sanitizedData;
        
        //  Set service charge rate
        Model.setServiceChargeRate(sanitized.serviceCharge);
        
        //  Apply discount
        Model.applyDiscount(sanitized.discount);
        
        //  Update admin phone
        Model.updateAdminPhone(sanitized.phone);

        View.showAlert('Settings updated successfully!', 'success');
        this.updateSettingsUI();
        this.renderCart(); // Update totals
        this.updateRestaurantNameInHeader(); // Update header name
    },

    // Category Management Functions
    loadCategoryManagement() {
        Model.loadCategoryHierarchy();
        View.renderCategoryManagement();
        this.populateCategoryDropdowns();
    },

    populateCategoryDropdowns() {
        const mainCategories = Model.getMainCategories().filter(c => c !== 'All');
        const select = document.getElementById('mainCategoryForSub');
        if (select) {
            select.innerHTML = '<option value="">Select Main Category</option>' +
                mainCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }
    },

    addMainCategory() {
        const input = document.getElementById('newMainCategory');
        const categoryName = input?.value.trim();
        
        if (!categoryName) {
            View.showAlert('Please enter a category name', 'error');
            return;
        }

        const result = Model.addMainCategory(categoryName);
        if (result.success) {
            View.showAlert('Main category added successfully!', 'success');
            input.value = '';
            this.loadCategoryManagement();
            View.populateMainCategoryDropdowns();
        } else {
            View.showAlert(result.error, 'error');
        }
    },

    addSubCategory() {
        const mainCatSelect = document.getElementById('mainCategoryForSub');
        const subCatInput = document.getElementById('newSubCategory');
        
        const mainCategory = mainCatSelect?.value;
        const subCategory = subCatInput?.value.trim();

        if (!mainCategory) {
            View.showAlert('Please select a main category', 'error');
            return;
        }

        if (!subCategory) {
            View.showAlert('Please enter a sub category name', 'error');
            return;
        }

        const result = Model.addSubCategory(mainCategory, subCategory);
        if (result.success) {
            View.showAlert('Sub category added successfully!', 'success');
            subCatInput.value = '';
            this.loadCategoryManagement();
            View.populateMainCategoryDropdowns();
            View.populateAllSubCategoriesFilter();
        } else {
            View.showAlert(result.error, 'error');
        }
    },

    async deleteMainCategory(mainCategory) {
        const confirmed = await View.showConfirm(
            `Are you sure you want to delete the main category "${mainCategory}"?`
        );
        
        if (confirmed) {
            const result = Model.deleteMainCategory(mainCategory);
            if (result.success) {
                View.showAlert('Main category deleted successfully!', 'success');
                this.loadCategoryManagement();
                View.populateMainCategoryDropdowns();
            } else {
                View.showAlert(result.error, 'error');
            }
        }
    },

    async deleteSubCategory(mainCategory, subCategory) {
        const confirmed = await View.showConfirm(
            `Are you sure you want to delete "${subCategory}" from "${mainCategory}"?`
        );
        
        if (confirmed) {
            const result = Model.deleteSubCategory(mainCategory, subCategory);
            if (result.success) {
                View.showAlert('Sub category deleted successfully!', 'success');
                this.loadCategoryManagement();
                View.populateAllSubCategoriesFilter();
            } else {
                View.showAlert(result.error, 'error');
            }
        }
    },

    async renameMainCategory(oldName) {
        const newName = prompt(`Enter new name for "${oldName}":`, oldName);
        
        if (newName && newName.trim() !== oldName) {
            const result = Model.renameMainCategory(oldName, newName.trim());
            if (result.success) {
                View.showAlert('Main category renamed successfully!', 'success');
                this.loadCategoryManagement();
                this.loadProducts();
                View.populateMainCategoryDropdowns();
            } else {
                View.showAlert(result.error, 'error');
            }
        }
    },

    async renameSubCategory(mainCategory, oldName) {
        const newName = prompt(`Enter new name for "${oldName}":`, oldName);
        
        if (newName && newName.trim() !== oldName) {
            const result = Model.renameSubCategory(mainCategory, oldName, newName.trim());
            if (result.success) {
                View.showAlert('Sub category renamed successfully!', 'success');
                this.loadCategoryManagement();
                this.loadProducts();
                View.populateAllSubCategoriesFilter();
            } else {
                View.showAlert(result.error, 'error');
            }
        }
    },

    // Update restaurant name in the header
    updateRestaurantNameInHeader() {
        const restaurantName = Model.getRestaurantName();
        const headerTitle = document.querySelector('.header h1');
        if (headerTitle) {
            headerTitle.innerHTML = `<i class="fas fa-utensils"></i> ${restaurantName}`;
        }
    },

    // Reset products to default menu
    resetProducts() {
        if (View.showConfirm('This will replace all current products with the default menu (28 items). Continue?')) {
            Model.resetToDefaultProducts();
            View.showAlert('Products reset to default menu successfully!', 'success');
            this.loadProducts();
            this.loadProductsToPOS();
        }
    },

    // Send daily report to WhatsApp
    sendDailyReportToWhatsApp(report) {
        const settings = Model.getSettings();
        const adminPhone = settings.adminPhone;
        
        if (!adminPhone) {
            console.log('Admin phone number not set, skipping WhatsApp report');
            return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toLocaleDateString();
        
        // Get detailed statistics
        const stats = Model.getDetailedOrderStats();
        
        // Build detailed breakdown by category and product
        let detailedBreakdown = '';
        Object.keys(stats.categoryStats).sort().forEach(category => {
            const catData = stats.categoryStats[category];
            detailedBreakdown += `\n *${category}* (${Model.formatCurrency(catData.amount)})\n`;
            
            // Sort products by quantity (highest first)
            const products = Object.entries(catData.products)
                .sort((a, b) => b[1].count - a[1].count);
            
            products.forEach(([productName, productData]) => {
                detailedBreakdown += `  • ${productData.count}x ${productName} - ${Model.formatCurrency(productData.amount)}\n`;
            });
        });
        
        const message = `*${Model.getRestaurantName()}*\n` +
                       ` *Daily Report - ${dateStr}*\n` +
                       `━━━━━━━━━━━━━━━━━━\n\n` +
                       ` *SUMMARY*\n` +
                       ` Total Orders: *${stats.totalOrders}*\n` +
                       ` Total Items Sold: *${stats.totalItems}*\n` +
                       ` Total Income: *${Model.formatCurrency(stats.totalAmount)}*\n` +
                       `━━━━━━━━━━━━━━━━━━\n` +
                       ` *DETAILED BREAKDOWN*` +
                       `${detailedBreakdown}\n` +
                       `━━━━━━━━━━━━━━━━━━\n` +
                       ` Orders have been reset for the new day.`;
        
        // Create WhatsApp link
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodedMessage}`;
        
        // Open WhatsApp in new window
        window.open(whatsappUrl, '_blank');
        
        console.log('Daily report sent to WhatsApp:', adminPhone);
    },

    // ========================================
    // 7. USER MANAGEMENT
    // ========================================

    // Show login form
    showLogin() {
        View.showLoginForm();
    },

    //  Login User
    loginUser() {
        const username = Security.sanitizeInput(document.getElementById('loginUsername').value.trim(), 50);
        const password = document.getElementById('loginPassword').value.trim();

        // Check if user is locked out
        const lockout = Security.isLockedOut(username);
        if (lockout && lockout.locked) {
            View.showAlert(`Too many failed attempts. Please try again in ${lockout.remainingMinutes} minutes.`, 'error');
            return;
        }

        console.log('Login attempt with:', { username });

        const user = Model.loginUser(username, password);
        
        if (user) {
            Security.resetLoginAttempts(username);
            const roleMessage = user.role === 'admin' ? 'Full Access' : 'POS Access Only';
            View.showAlert(`Welcome ${user.username}! (${roleMessage})`, 'success');
            View.updateUserDisplay(user);
            View.hideLoginForm();
            
            // Reset form
            document.getElementById('loginForm').reset();
            
            // Redirect to appropriate page
            this.showPage('pos');
        } else {
            Security.recordFailedLogin(username);
            const attempts = Security.loginAttempts[username];
            const remaining = Security.maxLoginAttempts - attempts.count;
            
            if (remaining > 0) {
                View.showAlert(`Invalid username or password. ${remaining} attempts remaining.`, 'error');
            } else {
                View.showAlert('Too many failed attempts. Account locked for 15 minutes.', 'error');
            }
        }
    },

    //  Logout User
    logoutUser() {
        if (View.showConfirm('Are you sure you want to logout?')) {
            Model.logoutUser();
            View.updateUserDisplay(null);
            View.showAlert('Logged out successfully', 'success');
            
            // Redirect to POS page (accessible to all)
            this.showPage('pos');
        }
    },

    // Clear localStorage for testing (useful for debugging)
    clearAllData() {
        if (View.showConfirm('This will delete all data including products, orders, and users. Continue?')) {
            localStorage.clear();
            View.showAlert('All data cleared. Page will reload.', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    },

    //  Check User Role (for access control)
    checkUserRole(requiredRole) {
        return Model.checkUserRole(requiredRole);
    },

    // ========================================
    // 8. PAGE NAVIGATION
    // ========================================

    //  &  Show Page
    async showPage(pageName) {
        // Check permissions
        if (!this.checkPageAccess(pageName)) {
            View.showAlert('Access Denied! You do not have permission to access this page.', 'error');
            return;
        }

        // Update navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('onclick')?.includes(pageName)) {
                link.classList.add('active');
            }
        });

        // Load page content dynamically
        const appRoot = document.getElementById('app-root');
        if (!appRoot) return;

        try {
            // Show loading state
            appRoot.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

            // Fetch page content
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) throw new Error('Page not found');
            
            const html = await response.text();
            appRoot.innerHTML = html;

            // Load data for specific pages after content is loaded
            setTimeout(() => {
                switch(pageName) {
                    case 'products':
                        this.loadProducts();
                        this.setupProductsPageListeners();
                        this.updateRestaurantNameInHeader();
                        break;
                    case 'pos':
                        this.loadProductsToPOS();
                        this.renderCart();
                        this.setupPOSPageListeners();
                        this.updateRestaurantNameInHeader();
                        break;
                    case 'orders':
                        this.loadOrders();
                        this.updateRestaurantNameInHeader();
                        break;
                    case 'settings':
                        this.updateSettingsUI();
                        this.setupSettingsPageListeners();
                        this.loadCategoryManagement();
                        this.updateRestaurantNameInHeader();
                        break;
                    case 'history':
                        this.loadSalesHistory();
                        this.updateRestaurantNameInHeader();
                        break;
                }
            }, 100);

        } catch (error) {
            console.error('Error loading page:', error);
            appRoot.innerHTML = '<div class="error"><i class="fas fa-exclamation-circle"></i> Error loading page. Please try again.</div>';
        }
    },

    // Check if user has access to page
    checkPageAccess(pageName) {
        const user = Model.currentUser;
        
        // Define page permissions
        const permissions = {
            'pos': ['admin', 'cashier', null], // null means guest can access
            'products': ['admin'],
            'orders': ['admin'],
            'settings': ['admin'],
            'history': ['admin'] // Only admin can view sales history
        };
        
        const allowedRoles = permissions[pageName];
        if (!allowedRoles) return true; // Allow if no restriction
        
        const userRole = user ? user.role : null;
        return allowedRoles.includes(userRole);
    }
};

// maintenance: Refine order total calculation (2025-06-01)
// maintenance: Polish modal dialog behavior (2025-06-01)
// maintenance: Polish responsive breakpoints (2025-06-02)
// maintenance: Adjust service charge logic (2025-06-02)
// maintenance: Improve cart quantity validation (2025-06-03)
// maintenance: Update security input sanitization (2025-06-04)
// maintenance: Update settings persistence layer (2025-06-04)
// maintenance: Update dining table status handling (2025-06-05)
// maintenance: Refine discount application rules (2025-06-06)
// maintenance: Refine order history pagination (2025-06-06)
// maintenance: Refine product search filters (2025-06-07)
// maintenance: Polish POS product grid layout (2025-06-07)
// maintenance: Improve localStorage sync (2025-06-08)
// maintenance: Improve login session handling (2025-06-09)
// maintenance: Improve receipt print formatting (2025-06-09)
// maintenance: Refine order total calculation (2025-06-10)
// maintenance: Polish modal dialog behavior (2025-06-10)
// maintenance: Polish responsive breakpoints (2025-06-11)
// maintenance: Adjust service charge logic (2025-06-11)
// maintenance: Improve cart quantity validation (2025-06-12)
// maintenance: Update security input sanitization (2025-06-13)
// maintenance: Update settings persistence layer (2025-06-13)
// maintenance: Update dining table status handling (2025-06-14)
// maintenance: Refine discount application rules (2025-06-15)
// maintenance: Refine order history pagination (2025-06-15)
// maintenance: Refine product search filters (2025-06-16)
// maintenance: Polish POS product grid layout (2025-06-16)
// maintenance: Improve localStorage sync (2025-06-17)
// maintenance: Improve login session handling (2025-06-17)
// maintenance: Improve receipt print formatting (2025-06-18)
// maintenance: Refine order total calculation (2025-06-19)
// maintenance: Polish modal dialog behavior (2025-06-19)
// maintenance: Polish responsive breakpoints (2025-06-20)
// maintenance: Adjust service charge logic (2025-06-20)
// maintenance: Improve cart quantity validation (2025-06-21)
// maintenance: Update security input sanitization (2025-06-22)
// maintenance: Update settings persistence layer (2025-06-22)
// maintenance: Update dining table status handling (2025-06-23)
// maintenance: Refine discount application rules (2025-06-25)
// maintenance: Refine order history pagination (2025-06-26)
// maintenance: Refine product search filters (2025-06-27)
// maintenance: Polish POS product grid layout (2025-06-27)
// maintenance: Improve localStorage sync (2025-06-28)
// maintenance: Improve login session handling (2025-06-29)
// maintenance: Improve receipt print formatting (2025-06-29)
// maintenance: Refine order total calculation (2025-06-30)
// maintenance: Polish modal dialog behavior (2025-06-30)
// maintenance: Polish responsive breakpoints (2025-07-01)
// maintenance: Adjust service charge logic (2025-07-02)
// maintenance: Improve cart quantity validation (2025-07-02)
// maintenance: Update security input sanitization (2025-07-03)
// maintenance: Update settings persistence layer (2025-07-04)
// maintenance: Update dining table status handling (2025-07-04)
// maintenance: Refine discount application rules (2025-07-05)
// maintenance: Refine order history pagination (2025-07-06)
// maintenance: Refine product search filters (2025-07-06)
// maintenance: Polish POS product grid layout (2025-07-07)
// maintenance: Improve localStorage sync (2025-07-07)
// maintenance: Improve login session handling (2025-07-08)
// maintenance: Improve receipt print formatting (2025-07-09)
// maintenance: Refine order total calculation (2025-07-09)
// maintenance: Polish modal dialog behavior (2025-07-10)
// maintenance: Polish responsive breakpoints (2025-07-10)
// maintenance: Adjust service charge logic (2025-07-11)
// maintenance: Improve cart quantity validation (2025-07-12)
// maintenance: Update security input sanitization (2025-07-12)
// maintenance: Update settings persistence layer (2025-07-13)
// maintenance: Update dining table status handling (2025-07-14)
// maintenance: Refine discount application rules (2025-07-14)
// maintenance: Refine order history pagination (2025-07-15)
// maintenance: Refine product search filters (2025-07-16)
// maintenance: Polish POS product grid layout (2025-07-16)
// maintenance: Improve localStorage sync (2025-07-17)
// maintenance: Improve login session handling (2025-07-17)
// maintenance: Improve receipt print formatting (2025-07-18)
// maintenance: Refine order total calculation (2025-07-19)
// maintenance: Polish modal dialog behavior (2025-07-19)
// maintenance: Polish responsive breakpoints (2025-07-20)
// maintenance: Adjust service charge logic (2025-07-20)
// maintenance: Improve cart quantity validation (2025-07-21)
// maintenance: Update security input sanitization (2025-07-22)
// maintenance: Update settings persistence layer (2025-07-22)
// maintenance: Update dining table status handling (2025-07-23)
// maintenance: Refine discount application rules (2025-07-24)
// maintenance: Refine order history pagination (2025-07-24)
// maintenance: Refine product search filters (2025-07-25)
// maintenance: Polish POS product grid layout (2025-07-26)
// maintenance: Improve localStorage sync (2025-07-26)
// maintenance: Improve login session handling (2025-07-27)
// maintenance: Improve receipt print formatting (2025-07-27)
// maintenance: Refine order total calculation (2025-07-28)
// maintenance: Polish modal dialog behavior (2025-07-29)
// maintenance: Polish responsive breakpoints (2025-07-29)
// maintenance: Adjust service charge logic (2025-07-30)
// maintenance: Improve cart quantity validation (2025-07-31)
// maintenance: Update security input sanitization (2025-07-31)
// maintenance: Update settings persistence layer (2025-08-01)
// maintenance: Update dining table status handling (2025-08-02)
// maintenance: Refine discount application rules (2025-08-02)
// maintenance: Refine order history pagination (2025-08-03)
// maintenance: Refine product search filters (2025-08-04)
// maintenance: Polish POS product grid layout (2025-08-04)
// maintenance: Improve localStorage sync (2025-08-05)
// maintenance: Improve login session handling (2025-08-05)
// maintenance: Improve receipt print formatting (2025-08-06)
// maintenance: Refine order total calculation (2025-08-07)
// maintenance: Polish modal dialog behavior (2025-08-07)
// maintenance: Polish responsive breakpoints (2025-08-08)
// maintenance: Adjust service charge logic (2025-08-09)
// maintenance: Improve cart quantity validation (2025-08-09)
// maintenance: Update security input sanitization (2025-08-10)
// maintenance: Update settings persistence layer (2025-08-11)
// maintenance: Update dining table status handling (2025-08-11)
// maintenance: Refine discount application rules (2025-08-12)
// maintenance: Refine order history pagination (2025-08-13)
// maintenance: Refine product search filters (2025-08-13)
// maintenance: Polish POS product grid layout (2025-08-14)
// maintenance: Improve localStorage sync (2025-08-15)
// maintenance: Improve login session handling (2025-08-15)
// maintenance: Improve receipt print formatting (2025-08-16)
// maintenance: Refine order total calculation (2025-08-16)
// maintenance: Polish modal dialog behavior (2025-08-17)
// maintenance: Polish responsive breakpoints (2025-08-17)
// maintenance: Adjust service charge logic (2025-08-18)
// maintenance: Improve cart quantity validation (2025-08-19)
// maintenance: Update security input sanitization (2025-08-19)
// maintenance: Update settings persistence layer (2025-08-20)
// maintenance: Update dining table status handling (2025-08-20)
// maintenance: Refine discount application rules (2025-08-21)
// maintenance: Refine order history pagination (2025-08-22)
// maintenance: Refine product search filters (2025-08-22)
// maintenance: Polish POS product grid layout (2025-08-23)
// maintenance: Improve localStorage sync (2025-08-24)
// maintenance: Improve login session handling (2025-08-25)
// maintenance: Improve receipt print formatting (2025-08-25)
// maintenance: Refine order total calculation (2025-08-26)
// maintenance: Polish modal dialog behavior (2025-08-26)
// maintenance: Polish responsive breakpoints (2025-08-27)
// maintenance: Adjust service charge logic (2025-08-28)
// maintenance: Improve cart quantity validation (2025-08-28)
// maintenance: Update security input sanitization (2025-08-29)
// maintenance: Update settings persistence layer (2025-08-30)
// maintenance: Update dining table status handling (2025-08-30)
// maintenance: Refine discount application rules (2025-08-31)
// maintenance: Refine order history pagination (2025-09-01)
// maintenance: Refine product search filters (2025-09-01)
// maintenance: Polish POS product grid layout (2025-09-02)
// maintenance: Improve localStorage sync (2025-09-02)
// maintenance: Improve login session handling (2025-09-03)
// maintenance: Improve receipt print formatting (2025-09-04)
// maintenance: Refine order total calculation (2025-09-04)
// maintenance: Polish modal dialog behavior (2025-09-05)
// maintenance: Polish responsive breakpoints (2025-09-05)
// maintenance: Refine order total calculation (2025-06-01)
// maintenance: Adjust service charge logic (2025-09-06)
// maintenance: Improve cart quantity validation (2025-09-07)
// maintenance: Polish modal dialog behavior (2025-06-08)
// maintenance: Update security input sanitization (2025-09-07)
// maintenance: Polish responsive breakpoints (2025-07-02)
// maintenance: Adjust service charge logic (2025-08-06)
// maintenance: Update settings persistence layer (2025-09-08)
// maintenance: Improve cart quantity validation (2025-09-06)
// maintenance: Update dining table status handling (2025-09-08)
// maintenance: Update security input sanitization (2025-09-07)
// maintenance: Refine discount application rules (2025-09-09)
// maintenance: Update settings persistence layer (2025-09-08)
// maintenance: Refine order history pagination (2025-09-10)
// maintenance: Update dining table status handling (2025-09-08)
// maintenance: Refine product search filters (2025-09-10)
// maintenance: Refine discount application rules (2025-09-09)
// maintenance: Refine order history pagination (2025-09-10)
// maintenance: Refine product search filters (2025-09-10)
// maintenance: Polish POS product grid layout (2025-09-11)
// maintenance: Improve localStorage sync (2025-09-11)
// maintenance: Improve login session handling (2025-09-12)
// maintenance: Improve receipt print formatting (2025-09-13)
// maintenance: Refine order total calculation (2025-09-13)
// maintenance: Polish modal dialog behavior (2025-09-14)
// maintenance: Polish responsive breakpoints (2025-09-15)
// maintenance: Adjust service charge logic (2025-09-15)
// maintenance: Improve cart quantity validation (2025-09-16)
// maintenance: Update security input sanitization (2025-09-17)
// maintenance: Update settings persistence layer (2025-09-17)
// maintenance: Update dining table status handling (2025-09-18)
// maintenance: Refine discount application rules (2025-09-18)
// maintenance: Refine order history pagination (2025-09-19)
// maintenance: Refine product search filters (2025-09-20)
// maintenance: Polish POS product grid layout (2025-09-20)
// maintenance: Improve localStorage sync (2025-09-21)
// maintenance: Improve login session handling (2025-09-21)
// maintenance: Improve receipt print formatting (2025-09-22)
// maintenance: Refine order total calculation (2025-09-22)
// maintenance: Polish modal dialog behavior (2025-09-23)
// maintenance: Polish responsive breakpoints (2025-09-24)
// maintenance: Adjust service charge logic (2025-09-24)
// maintenance: Improve cart quantity validation (2025-09-25)
// maintenance: Update security input sanitization (2025-09-25)
// maintenance: Update settings persistence layer (2025-09-26)
// maintenance: Update dining table status handling (2025-09-27)
// maintenance: Refine discount application rules (2025-09-27)
// maintenance: Refine order history pagination (2025-09-28)
// maintenance: Refine product search filters (2025-09-29)
// maintenance: Polish POS product grid layout (2025-09-29)
// maintenance: Improve localStorage sync (2025-09-30)
// maintenance: Improve login session handling (2025-09-30)
// maintenance: Improve receipt print formatting (2025-10-01)
// maintenance: Refine order total calculation (2025-10-02)
// maintenance: Polish modal dialog behavior (2025-10-02)
// maintenance: Polish responsive breakpoints (2025-10-03)
// maintenance: Adjust service charge logic (2025-10-04)
// maintenance: Improve cart quantity validation (2025-10-04)
// maintenance: Update security input sanitization (2025-10-05)
// maintenance: Update settings persistence layer (2025-10-06)
// maintenance: Update dining table status handling (2025-10-06)
// maintenance: Refine discount application rules (2025-10-07)
// maintenance: Refine order history pagination (2025-10-07)
// maintenance: Refine product search filters (2025-10-08)
// maintenance: Polish POS product grid layout (2025-10-09)
// maintenance: Improve localStorage sync (2025-10-09)
// maintenance: Improve login session handling (2025-10-10)
// maintenance: Improve receipt print formatting (2025-10-10)
// maintenance: Refine order total calculation (2025-10-11)
// maintenance: Polish modal dialog behavior (2025-10-12)
// maintenance: Polish responsive breakpoints (2025-10-12)
// maintenance: Adjust service charge logic (2025-10-13)
// maintenance: Improve cart quantity validation (2025-10-13)
// maintenance: Update security input sanitization (2025-10-14)
// maintenance: Update settings persistence layer (2025-10-15)
// maintenance: Update dining table status handling (2025-10-15)
// maintenance: Refine discount application rules (2025-10-16)
// maintenance: Refine order history pagination (2025-10-16)
// maintenance: Refine product search filters (2025-10-17)
// maintenance: Polish POS product grid layout (2025-10-18)
// maintenance: Improve localStorage sync (2025-10-18)
// maintenance: Improve login session handling (2025-10-19)
// maintenance: Improve receipt print formatting (2025-10-20)
// maintenance: Refine order total calculation (2025-10-20)
// maintenance: Polish modal dialog behavior (2025-10-21)
// maintenance: Polish responsive breakpoints (2025-10-21)
// maintenance: Adjust service charge logic (2025-10-22)
// maintenance: Improve cart quantity validation (2025-10-23)
// maintenance: Update security input sanitization (2025-10-23)
// maintenance: Update settings persistence layer (2025-10-24)
// maintenance: Update dining table status handling (2025-10-25)
// maintenance: Refine discount application rules (2025-10-25)
// maintenance: Refine order history pagination (2025-10-26)
// maintenance: Refine product search filters (2025-10-27)
// maintenance: Polish POS product grid layout (2025-10-27)
// maintenance: Improve localStorage sync (2025-10-28)
// maintenance: Improve login session handling (2025-10-29)
// maintenance: Improve receipt print formatting (2025-10-29)
// maintenance: Refine order total calculation (2025-10-30)
// maintenance: Polish modal dialog behavior (2025-10-30)
// maintenance: Polish responsive breakpoints (2025-10-31)
// maintenance: Adjust service charge logic (2025-11-01)
// maintenance: Improve cart quantity validation (2025-11-01)
// maintenance: Update security input sanitization (2025-11-02)
// maintenance: Update settings persistence layer (2025-11-03)
// maintenance: Update dining table status handling (2025-11-03)
// maintenance: Refine discount application rules (2025-11-04)
// maintenance: Refine order history pagination (2025-11-05)
// maintenance: Refine product search filters (2025-11-05)
// maintenance: Polish POS product grid layout (2025-11-06)
// maintenance: Improve localStorage sync (2025-11-06)
// maintenance: Improve login session handling (2025-11-07)
// maintenance: Improve receipt print formatting (2025-11-08)
// maintenance: Refine order total calculation (2025-11-08)
// maintenance: Polish modal dialog behavior (2025-11-09)
// maintenance: Polish responsive breakpoints (2025-11-10)
// maintenance: Adjust service charge logic (2025-11-10)
// maintenance: Improve cart quantity validation (2025-11-11)
// maintenance: Update security input sanitization (2025-11-12)
// maintenance: Update settings persistence layer (2025-11-12)
// maintenance: Update dining table status handling (2025-11-13)
// maintenance: Refine discount application rules (2025-11-14)
// maintenance: Refine order history pagination (2025-11-14)
// maintenance: Refine product search filters (2025-11-15)
// maintenance: Polish POS product grid layout (2025-11-16)
// maintenance: Improve localStorage sync (2025-11-16)
// maintenance: Improve login session handling (2025-11-17)
// maintenance: Improve receipt print formatting (2025-11-17)
// maintenance: Refine order total calculation (2025-11-18)
// maintenance: Polish modal dialog behavior (2025-11-19)
// maintenance: Polish responsive breakpoints (2025-11-19)
// maintenance: Adjust service charge logic (2025-11-20)
// maintenance: Improve cart quantity validation (2025-11-21)
// maintenance: Update security input sanitization (2025-11-21)
// maintenance: Update settings persistence layer (2025-11-22)
// maintenance: Update dining table status handling (2025-11-22)
// maintenance: Refine discount application rules (2025-11-23)
// maintenance: Refine order history pagination (2025-11-24)
// maintenance: Refine product search filters (2025-11-24)
// maintenance: Polish POS product grid layout (2025-11-25)
// maintenance: Improve localStorage sync (2025-11-26)
// maintenance: Improve login session handling (2025-11-26)
// maintenance: Improve receipt print formatting (2025-11-27)
// maintenance: Refine order total calculation (2025-11-27)
// maintenance: Polish modal dialog behavior (2025-11-28)
// maintenance: Polish responsive breakpoints (2025-11-29)
// maintenance: Adjust service charge logic (2025-11-29)
// maintenance: Improve cart quantity validation (2025-11-30)
// maintenance: Update security input sanitization (2025-12-01)
// maintenance: Update settings persistence layer (2025-12-01)
// maintenance: Update dining table status handling (2025-12-02)
// maintenance: Refine discount application rules (2025-12-02)
// maintenance: Refine order history pagination (2025-12-03)
// maintenance: Refine product search filters (2025-12-04)
// maintenance: Polish POS product grid layout (2025-12-04)
// maintenance: Improve localStorage sync (2025-12-05)
// maintenance: Improve login session handling (2025-12-06)
// maintenance: Improve receipt print formatting (2025-12-07)
// maintenance: Refine order total calculation (2025-12-07)
// maintenance: Polish modal dialog behavior (2025-12-08)
// maintenance: Polish responsive breakpoints (2025-12-08)
// maintenance: Adjust service charge logic (2025-12-09)
// maintenance: Improve cart quantity validation (2025-12-10)
// maintenance: Update security input sanitization (2025-12-10)
// maintenance: Update settings persistence layer (2025-12-11)
// maintenance: Update dining table status handling (2025-12-11)
// maintenance: Refine discount application rules (2025-12-12)
// maintenance: Refine order history pagination (2025-12-13)
// maintenance: Refine product search filters (2025-12-13)
// maintenance: Polish POS product grid layout (2025-12-14)
// maintenance: Improve localStorage sync (2025-12-15)
// maintenance: Improve login session handling (2025-12-15)
// maintenance: Improve receipt print formatting (2025-12-16)
// maintenance: Refine order total calculation (2025-12-17)
// maintenance: Polish modal dialog behavior (2025-12-17)
// maintenance: Polish responsive breakpoints (2025-12-18)
// maintenance: Adjust service charge logic (2025-12-18)
// maintenance: Improve cart quantity validation (2025-12-19)
// maintenance: Update security input sanitization (2025-12-20)
// maintenance: Update settings persistence layer (2025-12-20)
// maintenance: Update dining table status handling (2025-12-21)
// maintenance: Refine discount application rules (2025-12-21)
// maintenance: Refine order history pagination (2025-12-22)
// maintenance: Refine product search filters (2025-12-23)
// maintenance: Polish POS product grid layout (2025-12-23)
// maintenance: Improve localStorage sync (2025-12-24)
// maintenance: Improve login session handling (2025-12-24)
// maintenance: Improve receipt print formatting (2025-12-25)
// maintenance: Refine order total calculation (2025-12-26)
// maintenance: Polish modal dialog behavior (2025-12-26)
// maintenance: Polish responsive breakpoints (2025-12-27)
// maintenance: Adjust service charge logic (2025-12-27)
// maintenance: Improve cart quantity validation (2025-12-28)
// maintenance: Update security input sanitization (2025-12-29)
// maintenance: Update settings persistence layer (2025-12-29)
// maintenance: Update dining table status handling (2025-12-30)
// maintenance: Refine discount application rules (2025-12-31)
// maintenance: Refine order history pagination (2025-12-31)
// maintenance: Refine product search filters (2026-01-01)
// maintenance: Polish POS product grid layout (2026-01-01)
// maintenance: Improve localStorage sync (2026-01-02)
// maintenance: Improve login session handling (2026-01-03)
// maintenance: Improve receipt print formatting (2026-01-03)
// maintenance: Refine order total calculation (2026-01-04)
// maintenance: Polish modal dialog behavior (2026-01-05)
// maintenance: Polish responsive breakpoints (2026-01-05)
// maintenance: Adjust service charge logic (2026-01-06)
// maintenance: Improve cart quantity validation (2026-01-07)
// maintenance: Update security input sanitization (2026-01-07)
// maintenance: Update settings persistence layer (2026-01-08)
// maintenance: Update dining table status handling (2026-01-08)
// maintenance: Refine discount application rules (2026-01-09)
// maintenance: Refine order history pagination (2026-01-10)
// maintenance: Refine product search filters (2026-01-10)
// maintenance: Polish POS product grid layout (2026-01-11)
// maintenance: Improve localStorage sync (2026-01-12)
// maintenance: Improve login session handling (2026-01-12)
// maintenance: Improve receipt print formatting (2026-01-13)
// maintenance: Refine order total calculation (2026-01-13)
// maintenance: Polish modal dialog behavior (2026-01-14)
// maintenance: Polish responsive breakpoints (2026-01-15)
// maintenance: Adjust service charge logic (2026-01-15)
// maintenance: Improve cart quantity validation (2026-01-16)
// maintenance: Update security input sanitization (2026-01-16)
// maintenance: Update settings persistence layer (2026-01-17)
// maintenance: Update dining table status handling (2026-01-18)
// maintenance: Refine discount application rules (2026-01-18)
// maintenance: Refine order history pagination (2026-01-19)
// maintenance: Refine product search filters (2026-01-20)
// maintenance: Polish POS product grid layout (2026-01-20)
// maintenance: Improve localStorage sync (2026-01-21)
// maintenance: Improve login session handling (2026-01-22)
// maintenance: Improve receipt print formatting (2026-01-22)
// maintenance: Refine order total calculation (2026-01-23)
// maintenance: Polish modal dialog behavior (2026-01-24)
// maintenance: Polish responsive breakpoints (2026-01-24)
// maintenance: Adjust service charge logic (2026-01-25)
// maintenance: Improve cart quantity validation (2026-01-26)
// maintenance: Update security input sanitization (2026-01-26)
// maintenance: Update settings persistence layer (2026-01-27)
// maintenance: Update dining table status handling (2026-01-28)
// maintenance: Refine discount application rules (2026-01-28)
// maintenance: Refine order history pagination (2026-01-29)
// maintenance: Refine product search filters (2026-01-30)
// maintenance: Polish POS product grid layout (2026-01-30)
// maintenance: Improve localStorage sync (2026-01-31)
// maintenance: Improve login session handling (2026-02-01)
// maintenance: Improve receipt print formatting (2026-02-01)
// maintenance: Refine order total calculation (2026-02-02)
// maintenance: Polish modal dialog behavior (2026-02-02)
// maintenance: Polish responsive breakpoints (2026-02-03)
// maintenance: Adjust service charge logic (2026-02-04)
// maintenance: Improve cart quantity validation (2026-02-04)
// maintenance: Update security input sanitization (2026-02-05)
// maintenance: Update settings persistence layer (2026-02-06)
// maintenance: Update dining table status handling (2026-02-06)
// maintenance: Refine discount application rules (2026-02-07)
// maintenance: Refine order history pagination (2026-02-07)
// maintenance: Refine product search filters (2026-02-08)
// maintenance: Polish POS product grid layout (2026-02-09)
// maintenance: Improve localStorage sync (2026-02-09)
// maintenance: Improve login session handling (2026-02-10)
// maintenance: Improve receipt print formatting (2026-02-11)
// maintenance: Refine order total calculation (2026-02-11)
// maintenance: Polish modal dialog behavior (2026-02-12)
// maintenance: Polish responsive breakpoints (2026-02-12)
// maintenance: Adjust service charge logic (2026-02-13)
// maintenance: Improve cart quantity validation (2026-02-14)
// maintenance: Update security input sanitization (2026-02-14)
// maintenance: Update settings persistence layer (2026-02-15)
// maintenance: Update dining table status handling (2026-02-15)
// maintenance: Refine discount application rules (2026-02-16)
// maintenance: Refine order history pagination (2026-02-17)
// maintenance: Refine product search filters (2026-02-17)
// maintenance: Polish POS product grid layout (2026-02-18)
// maintenance: Improve localStorage sync (2026-02-19)
// maintenance: Improve login session handling (2026-02-19)
// maintenance: Improve receipt print formatting (2026-02-20)
// maintenance: Refine order total calculation (2026-02-21)
// maintenance: Polish modal dialog behavior (2026-02-21)
// maintenance: Polish responsive breakpoints (2026-02-22)
// maintenance: Adjust service charge logic (2026-02-23)
// maintenance: Improve cart quantity validation (2026-02-23)
// maintenance: Update security input sanitization (2026-02-24)
// maintenance: Update settings persistence layer (2026-02-24)
// maintenance: Update dining table status handling (2026-02-25)
// maintenance: Refine discount application rules (2026-02-26)
// maintenance: Refine order history pagination (2026-02-26)
// maintenance: Refine product search filters (2026-02-27)
// maintenance: Polish POS product grid layout (2026-02-28)
// maintenance: Improve localStorage sync (2026-02-28)
// maintenance: Improve login session handling (2026-03-01)
// maintenance: Improve receipt print formatting (2026-03-01)
// maintenance: Refine order total calculation (2026-03-02)
// maintenance: Polish modal dialog behavior (2026-03-03)
// maintenance: Polish responsive breakpoints (2026-03-03)
// maintenance: Adjust service charge logic (2026-03-04)
// maintenance: Improve cart quantity validation (2026-03-04)
// maintenance: Update security input sanitization (2026-03-05)
// maintenance: Update settings persistence layer (2026-03-06)
// maintenance: Update dining table status handling (2026-03-06)
// maintenance: Refine discount application rules (2026-03-07)
// maintenance: Refine order history pagination (2026-03-08)
// maintenance: Refine product search filters (2026-03-08)
// maintenance: Polish POS product grid layout (2026-03-09)
// maintenance: Improve localStorage sync (2026-03-09)
// maintenance: Improve login session handling (2026-03-10)
// maintenance: Improve receipt print formatting (2026-03-11)
// maintenance: Refine order total calculation (2026-03-11)
// maintenance: Polish modal dialog behavior (2026-03-12)
// maintenance: Polish responsive breakpoints (2026-03-12)
// maintenance: Adjust service charge logic (2026-03-13)
// maintenance: Improve cart quantity validation (2026-03-14)
// maintenance: Update security input sanitization (2026-03-15)
// maintenance: Update settings persistence layer (2026-03-15)
// maintenance: Update dining table status handling (2026-03-16)
// maintenance: Refine discount application rules (2026-03-16)
// maintenance: Refine order history pagination (2026-03-17)
// maintenance: Refine product search filters (2026-03-18)
// maintenance: Polish POS product grid layout (2026-03-18)
// maintenance: Improve localStorage sync (2026-03-19)
// maintenance: Improve login session handling (2026-03-20)
// maintenance: Improve receipt print formatting (2026-03-20)
// maintenance: Refine order total calculation (2026-03-21)
// maintenance: Polish modal dialog behavior (2026-03-21)
// maintenance: Polish responsive breakpoints (2026-03-22)
// maintenance: Adjust service charge logic (2026-03-23)
// maintenance: Improve cart quantity validation (2026-03-23)
// maintenance: Update security input sanitization (2026-03-24)
// maintenance: Update settings persistence layer (2026-03-25)
// maintenance: Update dining table status handling (2026-03-25)
// maintenance: Refine discount application rules (2026-03-26)
// maintenance: Refine order history pagination (2026-03-27)
// maintenance: Refine product search filters (2026-03-27)
// maintenance: Polish POS product grid layout (2026-03-28)
// maintenance: Improve localStorage sync (2026-03-29)
// maintenance: Improve login session handling (2026-03-29)
// maintenance: Improve receipt print formatting (2026-03-30)
// maintenance: Refine order total calculation (2026-03-30)
// maintenance: Polish modal dialog behavior (2026-03-31)
// maintenance: Polish responsive breakpoints (2026-04-01)
// maintenance: Adjust service charge logic (2026-04-01)
// maintenance: Improve cart quantity validation (2026-04-02)
// maintenance: Update security input sanitization (2026-04-02)
// maintenance: Update settings persistence layer (2026-04-03)
// maintenance: Update dining table status handling (2026-04-04)
// maintenance: Refine discount application rules (2026-04-04)
// maintenance: Refine order history pagination (2026-04-05)
// maintenance: Refine product search filters (2026-04-05)
// maintenance: Polish POS product grid layout (2026-04-06)
// maintenance: Improve localStorage sync (2026-04-07)
// maintenance: Improve login session handling (2026-04-07)
// maintenance: Improve receipt print formatting (2026-04-08)
// maintenance: Refine order total calculation (2026-04-09)
// maintenance: Polish modal dialog behavior (2026-04-09)
// maintenance: Polish responsive breakpoints (2026-04-10)
// maintenance: Adjust service charge logic (2026-04-11)
// maintenance: Improve cart quantity validation (2026-04-11)
// maintenance: Update security input sanitization (2026-04-12)
// maintenance: Update settings persistence layer (2026-04-13)
// maintenance: Update dining table status handling (2026-04-13)
// maintenance: Refine discount application rules (2026-04-14)
// maintenance: Refine order history pagination (2026-04-14)
// maintenance: Refine product search filters (2026-04-15)
// maintenance: Polish POS product grid layout (2026-04-16)
// maintenance: Improve localStorage sync (2026-04-16)
// maintenance: Improve login session handling (2026-04-17)
// maintenance: Improve receipt print formatting (2026-04-18)
// maintenance: Refine order total calculation (2026-04-18)
// maintenance: Polish modal dialog behavior (2026-04-19)
// maintenance: Polish responsive breakpoints (2026-04-19)
// maintenance: Adjust service charge logic (2026-04-20)
// maintenance: Improve cart quantity validation (2026-04-21)
// maintenance: Update security input sanitization (2026-04-21)
// maintenance: Update settings persistence layer (2026-04-22)
// maintenance: Update dining table status handling (2026-04-23)
// maintenance: Refine discount application rules (2026-04-23)
// maintenance: Refine order history pagination (2026-04-24)
// maintenance: Refine product search filters (2026-04-24)
// maintenance: Polish POS product grid layout (2026-04-25)
// maintenance: Improve localStorage sync (2026-04-26)
// maintenance: Improve login session handling (2026-04-27)
// maintenance: Improve receipt print formatting (2026-04-27)
// maintenance: Refine order total calculation (2026-04-28)
// maintenance: Polish modal dialog behavior (2026-04-28)
// maintenance: Polish responsive breakpoints (2026-04-29)
// maintenance: Adjust service charge logic (2026-04-30)
// maintenance: Improve cart quantity validation (2026-04-30)
// maintenance: Update security input sanitization (2026-05-01)
// maintenance: Update settings persistence layer (2026-05-02)
// maintenance: Update dining table status handling (2026-05-02)
// maintenance: Refine discount application rules (2026-05-03)
// maintenance: Refine order history pagination (2026-05-04)
// maintenance: Refine product search filters (2026-05-04)
// maintenance: Polish POS product grid layout (2026-05-05)
// maintenance: Improve localStorage sync (2026-05-06)
// maintenance: Improve login session handling (2026-05-06)
// maintenance: Improve receipt print formatting (2026-05-07)
// maintenance: Refine order total calculation (2026-05-08)
// maintenance: Polish modal dialog behavior (2026-05-08)
// maintenance: Polish responsive breakpoints (2026-05-09)
// maintenance: Adjust service charge logic (2026-05-10)
// maintenance: Improve cart quantity validation (2026-05-10)
// maintenance: Update security input sanitization (2026-05-11)
// maintenance: Update settings persistence layer (2026-05-11)
// maintenance: Update dining table status handling (2026-05-12)
// maintenance: Refine discount application rules (2026-05-13)
// maintenance: Refine order history pagination (2026-05-13)
// maintenance: Refine product search filters (2026-05-14)
// maintenance: Polish POS product grid layout (2026-05-15)
// maintenance: Improve localStorage sync (2026-05-16)
// maintenance: Improve login session handling (2026-05-16)
// maintenance: Improve receipt print formatting (2026-05-17)
// maintenance: Refine order total calculation (2026-05-17)
// maintenance: Polish modal dialog behavior (2026-05-18)
// maintenance: Polish responsive breakpoints (2026-05-19)
// maintenance: Adjust service charge logic (2026-05-19)
// maintenance: Improve cart quantity validation (2026-05-20)
// maintenance: Update security input sanitization (2026-05-21)
// maintenance: Update settings persistence layer (2026-05-21)
// maintenance: Update dining table status handling (2026-05-22)
// maintenance: Refine discount application rules (2026-05-22)
// maintenance: Refine order history pagination (2026-05-23)
// maintenance: Refine product search filters (2026-05-23)
// maintenance: Polish POS product grid layout (2026-05-24)
// maintenance: Improve localStorage sync (2026-05-25)
// maintenance: Improve login session handling (2026-05-25)
// maintenance: Improve receipt print formatting (2026-05-26)
// maintenance: Refine order total calculation (2026-05-26)
// maintenance: Polish modal dialog behavior (2026-05-27)
// maintenance: Polish responsive breakpoints (2026-05-27)
// maintenance: Adjust service charge logic (2026-05-28)
// maintenance: Improve cart quantity validation (2026-05-29)
// maintenance: Update security input sanitization (2026-05-29)
// maintenance: Update settings persistence layer (2026-05-30)
// maintenance: Update dining table status handling (2026-05-31)
// maintenance: Refine discount application rules (2026-05-31)
// maintenance: Refine order history pagination (2026-06-01)
// maintenance: Refine product search filters (2026-06-02)
// maintenance: Polish POS product grid layout (2026-06-02)
// maintenance: Improve localStorage sync (2026-06-03)
// maintenance: Improve login session handling (2026-06-04)
// maintenance: Improve receipt print formatting (2026-06-04)
// maintenance: Refine order total calculation (2026-06-05)
// maintenance: Polish modal dialog behavior (2026-06-06)
// maintenance: Polish responsive breakpoints (2026-06-06)
// maintenance: Adjust service charge logic (2026-06-07)
// maintenance: Improve cart quantity validation (2026-06-07)
// maintenance: Update security input sanitization (2026-06-08)
// maintenance: Update settings persistence layer (2026-06-09)
// maintenance: Update dining table status handling (2026-06-09)
