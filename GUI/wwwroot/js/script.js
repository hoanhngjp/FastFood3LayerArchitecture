'use strict';

document.addEventListener("DOMContentLoaded", function () {
    const navbar = document.querySelector("[data-navbar]");
    const navbarLinks = document.querySelectorAll("[data-nav-link]");
    const menuToggleBtn = document.querySelector("[data-menu-toggle-btn]");
    const header = document.querySelector("[data-header]");
    const backTopBtn = document.querySelector("[data-back-top-btn]");
    const searchBtn = document.querySelector("[data-search-btn]");
    const searchContainer = document.querySelector("[data-search-container]");
    const searchSubmitBtn = document.querySelector("[data-search-submit-btn]");
    const searchCloseBtn = document.querySelector("[data-search-close-btn]");

    // === User dropdown ===
    const userToggleBtn = document.getElementById('userMenuToggle');
    const userDropdown = document.getElementById('userMenuDropdown');

    if (!header) return; // nếu không có header, thoát

    // ================= Navbar toggle =================
    menuToggleBtn?.addEventListener("click", function () {
        navbar.classList.toggle("active");
        this.classList.toggle("active");
    });

    navbarLinks.forEach(link => {
        link.addEventListener("click", function () {
            navbar.classList.toggle("active");
            menuToggleBtn.classList.toggle("active");
        });
    });

    // ================= Header sticky & back to top =================
    window.addEventListener("scroll", function () {
        if (window.scrollY >= 100) {
            header.classList.add("active");
            backTopBtn?.classList.add("active");
        } else {
            header.classList.remove("active");
            backTopBtn?.classList.remove("active");
        }
    });

    // ================= Search box toggle =================
    [searchBtn, searchSubmitBtn, searchCloseBtn].forEach(btn => {
        btn?.addEventListener("click", function () {
            searchContainer?.classList.toggle("active");
            document.body.classList.toggle("active");
        });
    });

    // ================= Lazy-load images handling =================
    const images = document.querySelectorAll("img");

    images.forEach(img => {
        if (img.complete) {
            handleImageLoad(img);
        } else {
            img.addEventListener("load", () => handleImageLoad(img));
        }
    });

    function handleImageLoad(img) {
        img.classList.add("loaded");
        img.removeAttribute("data-placeholder");
    }

    // ================= User dropdown toggle =================
    userToggleBtn?.addEventListener("click", function (e) {
        e.stopPropagation(); // tránh click lan ra document
        userDropdown?.classList.toggle("show");
    });

    document.addEventListener("click", function () {
        userDropdown?.classList.remove("show");
    });
});
