'use strict';

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebarMenu');
    const mainContent = document.querySelector('.main-content');
    const toggleBtn = document.getElementById('toggleButton');

    // Toggle sidebar
    toggleBtn?.addEventListener('click', function () {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('collapsed');
    });

    // Reset collapsed nếu desktop
    window.addEventListener('resize', function () {
        if (window.innerWidth >= 992) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('collapsed');
        }
    });

    // Highlight active menu
    const navLinks = sidebar.querySelectorAll('.nav-link');
    const currentUrl = window.location.pathname.toLowerCase();

    navLinks.forEach(link => {
        const href = link.getAttribute('href')?.toLowerCase() || '';
        if (currentUrl.includes(href) && href !== '/') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Optional: dropdown user menu handled by Bootstrap
});
