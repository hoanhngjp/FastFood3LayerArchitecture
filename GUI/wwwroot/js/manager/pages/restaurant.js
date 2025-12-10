import { getMyRestaurants, updateRestaurantInfo } from '../services/managerService.js';

// --- DOM ELEMENTS ---
const dom = {
    name: document.getElementById('res-name'),
    address: document.getElementById('res-address'),
    phone: document.getElementById('res-phone'),
    hours: document.getElementById('res-hours'),

    btnEdit: document.getElementById('btn-edit-info'),

    statusBadge: document.getElementById('status-badge'),
    statusIcon: document.getElementById('status-icon'),
    statusText: document.getElementById('status-text'),
    statusCard: document.getElementById('status-card'),

    // Nơi chứa form để tìm input khi edit
    form: document.getElementById('restaurant-info-form')
};

// State
let currentResId = localStorage.getItem('currentRestaurantId');
let isEditing = false;
let originalData = {};
let mapInstance = null;

// --- MAIN LOGIC ---
async function initRestaurantInfo() {
    if (!currentResId) {
        // Nếu chưa có ID trong localStorage, thử lấy list và chọn cái đầu tiên
        try {
            const list = await getMyRestaurants();
            if (list && list.length > 0) {
                currentResId = list[0].restaurantID;
                localStorage.setItem('currentRestaurantId', currentResId);
            } else {
                alert("Bạn chưa quản lý nhà hàng nào!");
                return;
            }
        } catch (e) {
            console.error(e);
            return;
        }
    }

    // 1. Load dữ liệu
    await loadData();

    // 2. Sự kiện nút Cập nhật
    if (dom.btnEdit) {
        dom.btnEdit.addEventListener('click', handleEditClick);
    }
}

async function loadData() {
    try {
        const restaurants = await getMyRestaurants();

        // Tìm nhà hàng theo ID (Lưu ý: JSON trả về restaurantID chứ không phải RestaurantID, JS phân biệt hoa thường)
        // Convert cả 2 về string để so sánh cho an toàn
        const myRes = restaurants.find(r => r.restaurantID == currentResId);

        if (!myRes) {
            alert("Không tìm thấy thông tin nhà hàng.");
            return;
        }

        // --- 1. FILL DỮ LIỆU TEXT ---
        if (dom.name) dom.name.value = myRes.name || "";
        if (dom.address) dom.address.value = myRes.address || "";
        if (dom.phone) dom.phone.value = myRes.phoneNumber || "";
        if (dom.hours) dom.hours.value = myRes.openingHours || "";

        // --- 2. XỬ LÝ TRẠNG THÁI (STATUS) ---
        // 1: Open, 2: Closed, 3: Suspended
        // Logic: Chỉ statusID == 1 mới là Mở, còn lại coi như Đóng
        const isOpen = (myRes.statusID === 1);

        // Nếu muốn hiển thị text kỹ hơn cho Suspended (3)
        let statusLabel = isOpen ? "Đang hoạt động" : "Đang đóng cửa";
        if (myRes.statusID === 3) statusLabel = "Đang bị đình chỉ";

        updateStatusUI(isOpen, statusLabel);

        // --- 3. KHỞI TẠO BẢN ĐỒ ---
        // JSON của bạn trả về: location_Lat, location_Lng
        const lat = myRes.location_Lat || 10.762622; // Default HCM
        const lng = myRes.location_Lng || 106.660172;
        const resName = myRes.name || "Nhà hàng của bạn";

        initMap(lat, lng, resName);

    } catch (e) {
        console.error("Lỗi load data:", e);
    }
}

function initMap(lat, lng, popupText) {
    if (typeof L === 'undefined') {
        console.error("Leaflet JS chưa được load.");
        return;
    }

    if (mapInstance) {
        mapInstance.remove();
    }

    mapInstance = L.map('map').setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    L.marker([lat, lng]).addTo(mapInstance)
        .bindPopup(`<b>${popupText}</b><br>Vị trí hiện tại.`)
        .openPopup();
}

/**
 * Cập nhật giao diện Trạng thái
 * @param {boolean} isOpen - True nếu statusID = 1
 * @param {string} labelText - Text hiển thị cụ thể (nếu cần)
 */
function updateStatusUI(isOpen, labelText) {
    if (!dom.statusBadge) return;

    // Ưu tiên dùng labelText truyền vào, nếu không có thì tự check
    const text = labelText || (isOpen ? "Đang hoạt động" : "Đang đóng cửa");
    dom.statusBadge.textContent = text;

    if (isOpen) {
        // OPEN (Xanh)
        dom.statusBadge.className = "mb-0 text-success";
        dom.statusText.textContent = "Nhà hàng đang mở cửa đón khách";
        if (dom.statusIcon) dom.statusIcon.className = "bi bi-check-circle-fill text-success fs-1";
        if (dom.statusCard) dom.statusCard.className = "card shadow-sm border-success";
    } else {
        // CLOSED / SUSPENDED (Đỏ)
        dom.statusBadge.className = "mb-0 text-danger";
        // Check xem có phải bị suspended không để hiện text warning khác (Optional)
        dom.statusText.textContent = text.includes("đình chỉ")
            ? "Vui lòng liên hệ Admin để mở lại"
            : "Nhà hàng tạm ngưng nhận đơn";

        if (dom.statusIcon) dom.statusIcon.className = "bi bi-dash-circle-fill text-danger fs-1";
        if (dom.statusCard) dom.statusCard.className = "card shadow-sm border-danger";
    }
}

async function handleEditClick() {
    const inputs = dom.form.querySelectorAll('input.form-control-plaintext');

    if (!isEditing) {
        // --- CHUYỂN SANG EDIT MODE (Giữ nguyên logic cũ) ---
        isEditing = true;
        originalData = {};
        inputs.forEach(inp => originalData[inp.id] = inp.value);

        inputs.forEach(input => {
            input.removeAttribute('readonly');
            input.classList.remove('form-control-plaintext');
            input.classList.add('form-control');
            input.classList.add('bg-white');
        });

        dom.btnEdit.innerHTML = '<i class="bi bi-save"></i> Lưu thay đổi';
        dom.btnEdit.classList.remove('btn-outline-primary');
        dom.btnEdit.classList.add('btn-success');

        const btnCancel = document.createElement('button');
        btnCancel.id = 'btn-cancel-edit';
        btnCancel.className = 'btn btn-sm btn-outline-secondary ms-2';
        btnCancel.innerHTML = '<i class="bi bi-x"></i> Hủy';
        btnCancel.onclick = cancelEdit;
        dom.btnEdit.parentElement.appendChild(btnCancel);

    } else {
        // --- SAVE MODE (CÓ THÊM LOGIC GEOCODING) ---
        dom.btnEdit.disabled = true;
        dom.btnEdit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';

        try {
            const newAddress = dom.address.value;
            let lat = null;
            let lng = null;

            // 1. Kiểm tra nếu địa chỉ thay đổi -> Gọi API lấy tọa độ mới
            if (newAddress !== originalData['res-address']) {
                const geoData = await geocodeAddress(newAddress);
                if (geoData) {
                    lat = parseFloat(geoData.lat);
                    lng = parseFloat(geoData.lon); // API Nominatim trả về 'lon'
                    console.log(`Đã tìm thấy tọa độ mới: ${lat}, ${lng}`);
                } else {
                    if (!confirm("Không tìm thấy tọa độ cho địa chỉ mới trên bản đồ. Bạn có muốn giữ nguyên tọa độ cũ không?")) {
                        throw new Error("Hủy cập nhật do không xác định được vị trí.");
                    }
                }
            }

            // 2. Chuẩn bị dữ liệu gửi lên Server
            // Lưu ý: Backend DTO phải có Location_Lat và Location_Lng
            const newData = {
                name: dom.name.value,
                address: dom.address.value,
                phoneNumber: dom.phone.value,
                openingHours: dom.hours.value
            };

            // Chỉ gửi tọa độ nếu tìm thấy cái mới
            if (lat && lng) {
                newData.Location_Lat = lat;
                newData.Location_Lng = lng;
            }

            // 3. Gọi API Update của hệ thống
            await updateRestaurantInfo(currentResId, newData);

            alert("Cập nhật thành công!");

            // 4. Cập nhật lại bản đồ ngay lập tức nếu có tọa độ mới
            if (lat && lng && typeof initMap === 'function') {
                initMap(lat, lng, dom.name.value);
            }

            finishEdit(inputs);

        } catch (e) {
            alert("Lỗi: " + e.message);
        } finally {
            // Reset nút bấm nếu có lỗi hoặc xong
            if (dom.btnEdit) {
                dom.btnEdit.disabled = false;
                if (isEditing) dom.btnEdit.innerHTML = '<i class="bi bi-save"></i> Lưu thay đổi'; // Nếu lỗi vẫn ở Edit mode
            }
        }
    }
}

/**
 * Hàm gọi API OpenStreetMap (Nominatim) với cơ chế thử lại (Retry) thông minh
 * @param {string} address - Địa chỉ cần tìm
 */
async function geocodeAddress(address) {
    // Hàm con để gọi API
    const callApi = async (query) => {
        try {
            console.log("🔍 Đang tìm tọa độ cho:", query);
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=vn`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'FoodDeliveryManagerApp/1.0' }
            });
            if (!response.ok) return null;
            const data = await response.json();
            return (data && data.length > 0) ? data[0] : null;
        } catch (e) {
            console.warn("Lỗi gọi Nominatim:", e);
            return null;
        }
    };

    // --- CHIẾN THUẬT 1: Tìm chính xác 100% ---
    let result = await callApi(address);
    if (result) return result;

    // --- CHIẾN THUẬT 2: Bỏ số nhà (Nếu tìm chính xác thất bại) ---
    // Regex này tìm các số nhà ở đầu chuỗi (VD: "2 ", "145/3 ", "2 Bis ") và xóa nó đi
    // Mục đích: Tìm theo "Tên đường + Phường + Quận" sẽ dễ ra kết quả hơn
    const streetAddress = address.replace(/^[0-9]+[\/A-Za-z0-9]*\s+(đường\s+)?/i, "");

    if (streetAddress !== address) {
        console.log("⚠️ Không tìm thấy số nhà. Đang thử tìm theo tên đường:", streetAddress);
        result = await callApi(streetAddress);
        if (result) return result;
    }

    // --- CHIẾN THUẬT 3: Bỏ bớt đơn vị hành chính nhỏ (Ví dụ bỏ tên Phường) ---
    // Giả sử địa chỉ dạng: "Đường, Phường, Quận, TP" -> tách dấu phẩy
    const parts = address.split(',');
    if (parts.length > 3) {
        // Thử ghép: Tên đường (đã bỏ số) + Quận + TP (Bỏ qua thành phần thứ 2 là Phường)
        // Ví dụ: "Nguyễn Văn Bình, Bến Nghé, Quận 1, HCM" -> "Nguyễn Văn Bình, Quận 1, HCM"
        // Logic này tương đối, áp dụng cho cấu trúc chuỗi phổ biến
        const simpleAddress = `${parts[0].replace(/^[0-9]+[\/A-Za-z0-9]*\s+/i, "")}, ${parts[2]}, ${parts[parts.length - 1]}`;
        console.log("⚠️ Vẫn không thấy. Đang thử tìm kiếm rộng hơn:", simpleAddress);
        result = await callApi(simpleAddress);
        if (result) return result;
    }

    console.error("❌ Thất bại: Không thể tìm thấy tọa độ cho địa chỉ này trên OpenStreetMap.");
    return null;
}

function cancelEdit() {
    const inputs = dom.form.querySelectorAll('input.form-control-plaintext, input.form-control');
    inputs.forEach(inp => {
        if (originalData[inp.id]) inp.value = originalData[inp.id];
    });
    finishEdit(inputs);
}

function finishEdit(inputs) {
    isEditing = false;
    inputs.forEach(input => {
        input.setAttribute('readonly', true);
        input.classList.add('form-control-plaintext');
        input.classList.remove('form-control');
        input.classList.remove('bg-white');
    });

    dom.btnEdit.disabled = false;
    dom.btnEdit.innerHTML = '<i class="bi bi-pencil-square"></i> Cập nhật thông tin';
    dom.btnEdit.classList.add('btn-outline-primary');
    dom.btnEdit.classList.remove('btn-success');

    const btnCancel = document.getElementById('btn-cancel-edit');
    if (btnCancel) btnCancel.remove();
}

// Chạy khi trang load
document.addEventListener('DOMContentLoaded', initRestaurantInfo);