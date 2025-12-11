import { getSystemStats, getAllRestaurantsList } from '../services/adminService.js';

// --- UTILS ---
const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumSignificantDigits: 3 }).format(amount);
const formatTime = (dateString) => {
    if (!dateString) return "--/--";
    const d = new Date(dateString);
    return d.toLocaleTimeString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// --- DOM ELEMENTS ---
const dom = {
    // Stats Cards
    revenue: document.getElementById('sys-revenue'),
    orders: document.getElementById('sys-orders'),
    users: document.getElementById('sys-users'),
    drones: document.getElementById('sys-drones'),
    revenueLabel: document.getElementById('label-revenue'),
    recentTable: document.getElementById('system-recent-orders'),

    // Filters
    resSelector: document.getElementById('admin-res-selector'),
    timeFilter: document.getElementById('time-filter'),
    customDateArea: document.querySelector('.custom-date-range'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    btnApplyDate: document.getElementById('btn-apply-date'),

    // Charts (6 Canvas)
    chartRevenue: document.getElementById('adminRevenueChart'),
    chartTopRes: document.getElementById('topResChart'),
    chartOrderCount: document.getElementById('orderCountChart'),
    chartOrderStatus: document.getElementById('orderStatusChart'),
    chartDroneStatus: document.getElementById('droneStatusChart'),
    chartDroneBattery: document.getElementById('droneBatteryChart'),

    // Loading & Error
    loading: document.getElementById('dashboard-loading'),
    error: document.getElementById('dashboard-error')
};

// Lưu trữ instance biểu đồ
let charts = {
    revenue: null,
    topRes: null,
    orderCount: null,
    orderStatus: null,
    droneStatus: null,
    droneBattery: null
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

async function initPage() {
    await loadRestaurantDropdown();
    setupEventListeners();
    loadDashboardData();
}

async function loadRestaurantDropdown() {
    try {
        const list = await getAllRestaurantsList();
        if (list && dom.resSelector) {
            dom.resSelector.innerHTML = '<option value="0" selected>-- Tất cả hệ thống --</option>';
            list.forEach(res => {
                const id = res.restaurantID || res.RestaurantID;
                const name = res.name || res.Name;
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = name;
                dom.resSelector.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Lỗi tải danh sách quán:", e);
    }
}

function setupEventListeners() {
    if (dom.resSelector) {
        dom.resSelector.addEventListener('change', loadDashboardData);
    }
    if (dom.timeFilter) {
        dom.timeFilter.addEventListener('change', () => {
            const val = dom.timeFilter.value;
            if (val === 'custom') {
                if (dom.customDateArea) dom.customDateArea.style.display = 'flex';
            } else {
                if (dom.customDateArea) dom.customDateArea.style.display = 'none';
                loadDashboardData();
            }
        });
    }
    if (dom.btnApplyDate) {
        dom.btnApplyDate.addEventListener('click', () => {
            if (!dom.dateFrom.value || !dom.dateTo.value) {
                alert("Vui lòng chọn ngày bắt đầu và kết thúc");
                return;
            }
            loadDashboardData();
        });
    }
}

async function loadDashboardData() {
    if (dom.loading) dom.loading.style.display = 'block';

    const resId = dom.resSelector ? dom.resSelector.value : 0;
    const filter = dom.timeFilter ? dom.timeFilter.value : 'today';
    const from = dom.dateFrom ? dom.dateFrom.value : '';
    const to = dom.dateTo ? dom.dateTo.value : '';

    try {
        const data = await getSystemStats(resId, filter, from, to);

        if (data) {
            // 1. Update Cards
            dom.revenue.innerText = formatMoney(data.totalRevenue || data.TotalRevenue || 0);
            dom.orders.innerText = data.totalOrders || data.TotalOrders || 0;
            dom.users.innerText = data.totalUsers || data.TotalUsers || 0;

            const active = data.activeDrones || data.ActiveDrones || 0;
            const totalD = data.totalDrones || data.TotalDrones || 0;
            dom.drones.innerText = `${active}/${totalD}`;

            // 2. Render Table
            renderTable(data.recentOrders || data.RecentOrders);

            // 3. Render 6 Charts
            drawRevenueChart(data.revenueChart || data.RevenueChart);
            drawTopResChart(data.topRestaurants || data.TopRestaurants);

            drawOrderCountChart(data.orderCountChart || data.OrderCountChart);
            drawOrderStatusChart(data.orderStatusChart || data.OrderStatusChart);

            drawDroneStatusChart(data.droneStatusChart || data.DroneStatusChart);
            drawDroneBatteryChart(data.droneBatteryChart || data.DroneBatteryChart);
        }

    } catch (e) {
        console.error("Lỗi tải dashboard:", e);
    } finally {
        if (dom.loading) dom.loading.style.display = 'none';
    }
}

// --- RENDER FUNCTIONS ---

function renderTable(orders) {
    if (!dom.recentTable) return;
    dom.recentTable.innerHTML = '';

    if (!orders || orders.length === 0) {
        dom.recentTable.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Không có dữ liệu.</td></tr>`;
        return;
    }

    orders.forEach(o => {
        const id = o.orderID || o.OrderID;
        const resName = o.restaurantName || o.RestaurantName || 'N/A';
        const user = o.userID || o.UserID;
        const time = formatTime(o.orderTime || o.OrderTime);
        const amount = formatMoney(o.totalAmount || o.TotalAmount);
        const status = o.statusName || o.StatusName || 'Unknown';

        let badgeColor = 'secondary';
        if (['Success', 'Completed', 'Delivered'].includes(status)) badgeColor = 'success';
        else if (['Pending', 'Preparing'].includes(status)) badgeColor = 'warning text-dark';
        else if (['Cancelled', 'Failed'].includes(status)) badgeColor = 'danger';
        else if (['Delivering', 'Picking Up', 'Dropping Off'].includes(status)) badgeColor = 'primary';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="fw-bold text-primary">#${id}</span></td>
            <td><span class="fw-bold text-dark">${resName}</span></td>
            <td>User #${user}</td>
            <td>${time}</td>
            <td class="fw-bold">${amount}</td>
            <td><span class="badge bg-${badgeColor}">${status}</span></td>
        `;
        dom.recentTable.appendChild(row);
    });
}

// --- CHART DRAWING FUNCTIONS ---

function drawRevenueChart(data) {
    if (!dom.chartRevenue) return;
    if (charts.revenue) charts.revenue.destroy();
    if (!data || data.length === 0) return;

    const ctx = dom.chartRevenue.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(13, 110, 253, 0.4)');
    gradient.addColorStop(1, 'rgba(13, 110, 253, 0.0)');

    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.label || d.Label),
            datasets: [{
                label: 'Doanh thu',
                data: data.map(d => d.value || d.Value),
                borderColor: '#0d6efd',
                backgroundColor: gradient,
                fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${formatMoney(ctx.parsed.y)}` } } },
            scales: { y: { beginAtZero: true, ticks: { callback: (val) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(val) } }, x: { grid: { display: false } } }
        }
    });
}

function drawOrderCountChart(data) {
    if (!dom.chartOrderCount) return;
    if (charts.orderCount) charts.orderCount.destroy();
    if (!data || data.length === 0) return;

    charts.orderCount = new Chart(dom.chartOrderCount, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label || d.Label),
            datasets: [{
                label: 'Đơn hàng',
                data: data.map(d => d.value || d.Value),
                backgroundColor: 'rgba(13, 202, 240, 0.6)',
                borderColor: '#0dcaf0', borderWidth: 1, borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}

function drawOrderStatusChart(data) {
    if (!dom.chartOrderStatus) return;
    if (charts.orderStatus) charts.orderStatus.destroy();
    if (!data || data.length === 0) return;

    const labels = data.map(d => d.label || d.Label);
    const bgColors = labels.map(l => {
        if (['Completed', 'Delivered'].includes(l)) return '#198754';
        if (['Cancelled', 'Failed'].includes(l)) return '#dc3545';
        if (['Pending', 'Preparing'].includes(l)) return '#ffc107';
        if (['Delivering', 'Picking Up'].includes(l)) return '#0d6efd';
        return '#6c757d';
    });

    charts.orderStatus = new Chart(dom.chartOrderStatus, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{ data: data.map(d => d.value || d.Value), backgroundColor: bgColors, borderWidth: 1 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10 } } },
            layout: { padding: 10 }
        }
    });
}

function drawTopResChart(data) {
    if (!dom.chartTopRes) return;
    if (charts.topRes) charts.topRes.destroy();
    if (!data || data.length === 0) return;

    const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d'];
    charts.topRes = new Chart(dom.chartTopRes, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.name || d.Name),
            datasets: [{ data: data.map(d => d.revenue || d.Revenue), backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, padding: 15 } }, tooltip: { callbacks: { label: (ctx) => ` ${formatMoney(ctx.parsed)}` } } },
            cutout: '70%', layout: { padding: 10 }
        }
    });
}

function drawDroneStatusChart(data) {
    if (!dom.chartDroneStatus) return;
    if (charts.droneStatus) charts.droneStatus.destroy();
    if (!data || data.length === 0) return;

    const labels = data.map(d => d.label || d.Label);
    const bgColors = labels.map(l => {
        if (l === 'Idle') return '#198754';
        if (['Busy', 'Delivering', 'Dropping Off', 'Picking Up'].includes(l)) return '#0d6efd';
        if (l === 'Maintenance') return '#dc3545';
        if (l === 'Charging') return '#ffc107';
        return '#6c757d';
    });

    charts.droneStatus = new Chart(dom.chartDroneStatus, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{ data: data.map(d => d.value || d.Value), backgroundColor: bgColors, borderWidth: 1 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } },
            layout: { padding: 10 }
        }
    });
}

function drawDroneBatteryChart(data) {
    if (!dom.chartDroneBattery) return;
    if (charts.droneBattery) charts.droneBattery.destroy();
    if (!data || data.length === 0) return;

    const labels = data.map(d => d.label || d.Label);
    const bgColors = labels.map(l => {
        if (l.includes('Cao') || l.includes('>50')) return '#198754';
        if (l.includes('Trung') || l.includes('50%')) return '#ffc107';
        return '#dc3545';
    });

    charts.droneBattery = new Chart(dom.chartDroneBattery, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Số lượng Drone', data: data.map(d => d.value || d.Value), backgroundColor: bgColors, borderRadius: 5 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
        }
    });
}