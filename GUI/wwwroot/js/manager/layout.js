'use strict';
document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('managerSidebar'); // ID khác Admin 1 chút
    const toggleBtn = document.getElementById('sidebarToggle');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            document.body.classList.toggle('sb-sidenav-toggled');
        });
    }
});