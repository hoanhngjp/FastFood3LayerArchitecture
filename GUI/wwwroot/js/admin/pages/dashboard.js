import { getSystemStats, getAllRestaurantsList } from '../services/adminService.js';

// --- UTILS ---
const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumSignificantDigits: 3 }).format(amount);
const formatTime = (dateString) => {
    if (!dateString) return "--/--";
    const d = new Date(dateString);
    return d.toLocaleTimeString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// --- DOM ELEMENTS ---
// LƯU Ý: ID ở đây phải khớp chính xác 100% với id="..." trong file .cshtml
const dom = {
    // Stats Cards
    revenue: document.getElementById('sys-revenue'),
    orders: document.getElementById('sys-orders'),
    users: document.getElementById('sys-users'),
    drones: document.getElementById('sys-drones'),
    revenueLabel: document.getElementById('label-revenue'),
    recentTable: document.getElementById('system-recent-orders'),

    // Filters
    resSelector: document.getElementById('admin-res-selector'), // <-- ĐÃ SỬA: Khớp với HTML Admin
    timeFilter: document.getElementById('time-filter'),
    customDateArea: document.querySelector('.custom-date-range'),
    dateFrom: document.getElementById('date-from'),
    dateTo: document.getElementById('date-to'),
    btnApplyDate: document.getElementById('btn-apply-date'),

    // Charts
    chartRevenue: document.getElementById('adminRevenueChart'),
    chartTopRes: document.getElementById('topResChart'),

    // Loading & Error
    loading: document.getElementById('dashboard-loading'),
    error: document.getElementById('dashboard-error')
};

// Lưu trữ instance biểu đồ để hủy trước khi vẽ lại
let charts = { revenue: null, topRes: null };

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

async function initPage() {
    console.log("Dashboard Init..."); // Debug log

    // 1. Load Dropdown trước
    await loadRestaurantDropdown();

    // 2. Gắn sự kiện
    setupEventListeners();

    // 3. Load dữ liệu mặc định
    loadDashboardData();
}

async function loadRestaurantDropdown() {
    try {
        const list = await getAllRestaurantsList();
        console.log("Danh sách nhà hàng:", list); // Debug log

        if (list && dom.resSelector) {
            // Reset dropdown
            dom.resSelector.innerHTML = '<option value="0" selected>-- Tất cả hệ thống --</option>';

            list.forEach(res => {
                // Xử lý an toàn cả chữ hoa/thường
                const id = res.restaurantID || res.RestaurantID;
                const name = res.name || res.Name;

                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = name;
                dom.resSelector.appendChild(opt);
            });
        } else {
            console.error("Không tìm thấy DOM 'admin-res-selector' hoặc API trả về rỗng.");
        }
    } catch (e) {
        console.error("Lỗi tải danh sách quán:", e);
    }
}

function setupEventListeners() {
    // Sự kiện thay đổi Nhà hàng
    if (dom.resSelector) {
        dom.resSelector.addEventListener('change', () => {
            console.log("Đã đổi nhà hàng:", dom.resSelector.value);
            loadDashboardData();
        });
    }

    // Sự kiện thay đổi Thời gian
    if (dom.timeFilter) {
        dom.timeFilter.addEventListener('change', () => {
            const val = dom.timeFilter.value;
            console.log("Đổi thời gian:", val);

            if (val === 'custom') {
                if (dom.customDateArea) dom.customDateArea.style.display = 'flex';
            } else {
                if (dom.customDateArea) dom.customDateArea.style.display = 'none';
                loadDashboardData();
            }
        });
    }

    // Nút Xem (Custom Date)
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

    // Lấy giá trị filter
    const resId = dom.resSelector ? dom.resSelector.value : 0;
    const filter = dom.timeFilter ? dom.timeFilter.value : 'today';
    const from = dom.dateFrom ? dom.dateFrom.value : '';
    const to = dom.dateTo ? dom.dateTo.value : '';

    // Cập nhật Label
    if (dom.revenueLabel && dom.timeFilter) {
        const filterText = dom.timeFilter.options[dom.timeFilter.selectedIndex].text;
        dom.revenueLabel.innerText = `Doanh Thu (${filterText})`;
    }

    try {
        console.log(`Calling API: resId=${resId}, filter=${filter}`); // Debug Log

        const data = await getSystemStats(resId, filter, from, to);
        console.log("Dữ liệu Dashboard nhận được:", data); // KIỂM TRA DỮ LIỆU TẠI ĐÂY

        if (data) {
            // 1. Cập nhật thẻ số liệu (Dùng || để fallback nếu null)
            // Lưu ý: API trả về camelCase (totalRevenue) hay PascalCase (TotalRevenue) tùy settings JSON.
            // Code này chấp nhận cả 2.
            dom.revenue.innerText = formatMoney(data.totalRevenue || data.TotalRevenue || 0);
            dom.orders.innerText = data.totalOrders || data.TotalOrders || 0;
            dom.users.innerText = data.totalUsers || data.TotalUsers || 0;

            const active = data.activeDrones || data.ActiveDrones || 0;
            const totalD = data.totalDrones || data.TotalDrones || 0;
            dom.drones.innerText = `${active}/${totalD}`;

            // 2. Render Bảng
            renderTable(data.recentOrders || data.RecentOrders);

            // 3. Render Biểu đồ
            drawRevenueChart(data.revenueChart || data.RevenueChart);
            drawTopResChart(data.topRestaurants || data.TopRestaurants);
        }

    } catch (e) {
        console.error("Dashboard Logic Error:", e);
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
        // Map dữ liệu an toàn
        const id = o.orderID || o.OrderID;
        const resName = o.restaurantName || o.RestaurantName || 'N/A';
        const user = o.userID || o.UserID;
        const time = formatTime(o.orderTime || o.OrderTime);
        const amount = formatMoney(o.totalAmount || o.TotalAmount);
        const status = o.statusName || o.StatusName || 'Unknown';

        let badgeColor = 'secondary';
        if (['Success', 'Completed', 'Delivered'].includes(status)) badgeColor = 'success';
        else if (status === 'Pending') badgeColor = 'warning text-dark';
        else if (status === 'Cancelled') badgeColor = 'danger';
        else if (['Delivering', 'Shipping'].includes(status)) badgeColor = 'primary';

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

function drawRevenueChart(data) {
    if (!dom.chartRevenue) return;
    if (charts.revenue) charts.revenue.destroy(); // Xóa biểu đồ cũ để vẽ lại

    if (!data || data.length === 0) {
        // Nếu không có data thì không vẽ
        return;
    }

    const ctx = dom.chartRevenue.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(13, 110, 253, 0.4)');
    gradient.addColorStop(1, 'rgba(13, 110, 253, 0.0)');

    // Map an toàn label/value
    const labels = data.map(d => d.label || d.Label);
    const values = data.map(d => d.value || d.Value);

    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu hệ thống',
                data: values,
                borderColor: '#0d6efd',
                backgroundColor: gradient,
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` ${formatMoney(ctx.parsed.y)}` } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (val) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(val) }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function drawTopResChart(data) {
    const container = dom.chartTopRes.parentElement; // Lấy thẻ cha chứa canvas

    // 1. Kiểm tra dữ liệu rỗng
    if (!data || data.length === 0) {
        if (charts.topRes) charts.topRes.destroy();
        // Hiển thị thông báo nếu chưa có
        if (!container.querySelector('.no-data-msg')) {
            container.innerHTML += `<div class="no-data-msg position-absolute top-50 start-50 translate-middle text-muted small text-center w-100">
                                        <i class="bi bi-inbox fs-3 d-block mb-1"></i>
                                        Chưa có dữ liệu Top Nhà hàng
                                    </div>`;
        }
        return;
    }

    // Xóa thông báo rỗng nếu có dữ liệu
    const msg = container.querySelector('.no-data-msg');
    if (msg) msg.remove();

    // 2. Vẽ Chart
    if (!dom.chartTopRes) return;
    if (charts.topRes) charts.topRes.destroy();

    const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d'];
    // Map an toàn camelCase/PascalCase
    const labels = data.map(d => d.name || d.Name);
    const values = data.map(d => d.revenue || d.Revenue);

    charts.topRes = new Chart(dom.chartTopRes, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11 },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${formatMoney(ctx.parsed)}`
                    }
                }
            },
            cutout: '70%',
            layout: {
                padding: 10
            }
        }
    });
}