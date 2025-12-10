import { getManagerStats, getMyRestaurants } from '../services/managerService.js';

// --- DOM ELEMENTS ---
const dom = {
    // Stats
    revenue: document.getElementById('stat-revenue'),
    orders: document.getElementById('stat-orders'),
    foods: document.getElementById('stat-foods'),
    recentTable: document.getElementById('recent-orders-body'),
    revenueLabel: document.getElementById('label-revenue'),

    // Filters
    resSelector: document.getElementById('restaurant-selector'),
    timeFilter: document.getElementById('time-filter'),
    customDateArea: document.querySelector('.custom-date-range'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    btnApplyDate: document.getElementById('btn-apply-date'),

    // Charts
    chartRevenue: document.getElementById('revenueChart'),
    chartStatus: document.getElementById('statusChart'),
    chartTopFood: document.getElementById('topFoodChart'),

    // State
    loading: document.getElementById('dashboard-loading-area'),
    error: document.getElementById('dashboard-error-area'),
    errorMsg: document.getElementById('error-message')
};

// Store Chart Instances
let charts = { revenue: null, status: null, topFood: null };

// --- UTILS ---
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getStatusBadge = (status) => {
    const colors = {
        'Pending': 'warning text-dark',
        'Confirmed': 'info text-dark',
        'Shipping': 'primary',
        'Delivering': 'primary',
        'Success': 'success',
        'Completed': 'success',
        'Cancelled': 'danger'
    };
    const color = colors[status] || 'secondary';
    return `<span class="badge bg-${color}">${status}</span>`;
};

// --- MAIN LOGIC ---

async function initDashboard() {
    try {
        const restaurants = await getMyRestaurants();
        if (!restaurants || restaurants.length === 0) {
            showError("Bạn chưa được gán quản lý nhà hàng nào.");
            return;
        }

        // Setup Selector
        dom.resSelector.innerHTML = '';
        restaurants.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.restaurantID;
            opt.textContent = r.name;
            dom.resSelector.appendChild(opt);
        });

        // Select Saved or First
        const savedId = localStorage.getItem('currentRestaurantId');
        if (savedId && restaurants.find(r => r.restaurantID == savedId)) {
            dom.resSelector.value = savedId;
        } else {
            dom.resSelector.value = restaurants[0].restaurantID;
            localStorage.setItem('currentRestaurantId', restaurants[0].restaurantID);
        }

        setupEventListeners();
        loadStats();

    } catch (e) {
        console.error(e);
        showError(e.message);
    }
}

function setupEventListeners() {
    // Change Restaurant
    dom.resSelector.addEventListener('change', () => {
        localStorage.setItem('currentRestaurantId', dom.resSelector.value);
        loadStats();
    });

    // Change Time Filter
    dom.timeFilter.addEventListener('change', () => {
        const val = dom.timeFilter.value;
        if (val === 'custom') {
            dom.customDateArea.style.display = 'flex';
        } else {
            dom.customDateArea.style.display = 'none';
            loadStats();
        }
    });

    // Apply Custom Date
    dom.btnApplyDate.addEventListener('click', () => {
        if (!dom.dateFrom.value || !dom.dateTo.value) {
            alert("Vui lòng chọn ngày bắt đầu và kết thúc");
            return;
        }
        loadStats();
    });
}

async function loadStats() {
    if (dom.loading) dom.loading.style.display = 'block';
    if (dom.error) dom.error.style.display = 'none';

    const resId = dom.resSelector.value;
    const filter = dom.timeFilter.value;
    const from = dom.dateFrom.value;
    const to = dom.dateTo.value;

    // Update Label Text
    const filterText = dom.timeFilter.options[dom.timeFilter.selectedIndex].text;
    if (dom.revenueLabel) dom.revenueLabel.innerText = `Doanh thu (${filterText})`;

    try {
        const data = await getManagerStats(resId, filter, from, to);

        // 1. Cards
        dom.revenue.innerText = formatCurrency(data.todayRevenue);
        dom.orders.innerText = data.todayOrderCount;
        dom.foods.innerText = data.totalFoodItemCount;

        // 2. Table
        renderRecentTable(data.recentOrders);

        // 3. Charts
        drawRevenueChart(data.revenueChartData);
        drawStatusChart(data.orderStatusStats);
        drawTopFoodChart(data.topSellingFoods);

    } catch (e) {
        console.error(e);
        showError("Lỗi tải dữ liệu: " + e.message);
    } finally {
        if (dom.loading) dom.loading.style.display = 'none';
    }
}

// --- RENDERING ---

function renderRecentTable(orders) {
    if (!dom.recentTable) return;
    dom.recentTable.innerHTML = '';

    if (!orders || orders.length === 0) {
        dom.recentTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Không có dữ liệu trong khoảng thời gian này.</td></tr>`;
        return;
    }

    orders.forEach(o => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="fw-bold text-primary">#${o.orderID}</span></td>
            <td>User ${o.userID}</td>
            <td>${formatDate(o.orderTime)}</td>
            <td class="fw-bold">${formatCurrency(o.totalAmount)}</td>
            <td>${getStatusBadge(o.statusName)}</td>
        `;
        dom.recentTable.appendChild(row);
    });
}

// CHART 1: REVENUE (Line + Gradient)
function drawRevenueChart(data) {
    if (!dom.chartRevenue) return;
    if (charts.revenue) charts.revenue.destroy();

    const ctx = dom.chartRevenue.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(25, 135, 84, 0.5)');
    gradient.addColorStop(1, 'rgba(25, 135, 84, 0.0)');

    const labels = data ? data.map(d => d.label) : [];
    const values = data ? data.map(d => d.value) : [];

    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu',
                data: values,
                borderColor: '#198754',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}` }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            // Format trục Y thành tiền đầy đủ
                            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumSignificantDigits: 3 }).format(value);
                        },
                        font: { size: 11 }
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// CHART 2: STATUS (Doughnut)
function drawStatusChart(data) {
    if (!dom.chartStatus) return;
    if (charts.status) charts.status.destroy();

    const colorMap = {
        'Pending': '#ffc107', 'Confirmed': '#0dcaf0', 'Shipping': '#0d6efd',
        'Delivering': '#0d6efd', 'Success': '#198754', 'Completed': '#198754', 'Cancelled': '#dc3545'
    };

    const labels = data ? data.map(d => d.label) : [];
    const values = data ? data.map(d => d.value) : [];
    const bgColors = labels.map(l => colorMap[l] || '#6c757d');

    charts.status = new Chart(dom.chartStatus, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: bgColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
            },
            cutout: '65%'
        }
    });
}

// CHART 3: TOP FOOD (Bar)
function drawTopFoodChart(data) {
    if (!dom.chartTopFood) return;
    if (charts.topFood) charts.topFood.destroy();

    const labels = data ? data.map(d => d.label) : [];
    const values = data ? data.map(d => d.value) : [];

    charts.topFood = new Chart(dom.chartTopFood, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Số lượng',
                data: values,
                backgroundColor: '#fd7e14',
                borderRadius: 4,
                barThickness: 15
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { display: false } },
                y: { grid: { display: false } }
            }
        }
    });
}

function showError(msg) {
    if (dom.loading) dom.loading.style.display = 'none';
    if (dom.error) {
        if (dom.errorMsg) dom.errorMsg.textContent = msg;
        dom.error.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);