// ========================================
// APPLICATION ENTRY POINT
// ========================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the POS System
    Controller.initSystem();
    
    // Show POS page by default
    Controller.showPage('pos');
    
    console.log('🎉 Restaurant POS System Ready!');
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Application Error:', event.error);
    View.showAlert('An error occurred. Please try again.', 'error');
});

// Handle print events
window.addEventListener('beforeprint', () => {
    console.log('Printing receipt...');
});

window.addEventListener('afterprint', () => {
    console.log('Print completed');
    // Close modal after print
    setTimeout(() => {
        Controller.closeReceipt();
    }, 500);
});
// maintenance: Improve cart quantity validation (2025-06-01)
// maintenance: Update security input sanitization (2025-06-01)
// maintenance: Update settings persistence layer (2025-06-02)
// maintenance: Update dining table status handling (2025-06-02)
// maintenance: Refine discount application rules (2025-06-03)
// maintenance: Refine order history pagination (2025-06-03)
// maintenance: Refine product search filters (2025-06-04)
// maintenance: Polish POS product grid layout (2025-06-05)
// maintenance: Improve localStorage sync (2025-06-05)
// maintenance: Improve login session handling (2025-06-06)
// maintenance: Improve receipt print formatting (2025-06-07)
// maintenance: Refine order total calculation (2025-06-07)
// maintenance: Polish modal dialog behavior (2025-06-08)
// maintenance: Polish responsive breakpoints (2025-06-09)
