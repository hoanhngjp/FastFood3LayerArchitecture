import { placeOrder } from '../services/orderService.js';
import { getCartSummaryForCheckout, formatCurrency } from '../services/cartService.js';
import { getMyAddresses, addAddress } from '../services/addressService.js';
import { callApi } from '../services/apiClient.js';

// DOM Elements
const checkoutBtn = document.getElementById('complete-checkout-btn');
const restaurantSelect = document.getElementById('restaurant-select');
const addressSelect = document.getElementById('address-select');

// Restaurant Info Elements (MỚI)
const restInfoArea = document.getElementById('restaurant-info-area');
const restAddressEl = document.getElementById('rest-address');
const restPhoneEl = document.getElementById('rest-phone');
const restTimeEl = document.getElementById('rest-time');

// Form inputs
const inputName = document.getElementById('ho-ten');
const inputPhone = document.getElementById('dien-thoai');
const inputAddress = document.getElementById('dia-chi');
const inputNote = document.getElementById('ghi-chu');

// Dữ liệu tạm
let myAddresses = [];
let availableRestaurants = []; // (MỚI) Lưu danh sách nhà hàng để tra cứu

// --- 1. LOGIC RENDER UI ---

function renderSummary() {
    getCartSummaryForCheckout().then(summary => {
        const { cartItems, subtotal, totalAmount, shippingFee } = summary;

        // Badge số lượng
        const badge = document.querySelector('.checkout-summary-card .badge');
        if (badge) badge.textContent = `${cartItems.length} món`;

        // List items
        const listEl = document.getElementById('summary-items-list');
        if (listEl) {
            listEl.innerHTML = '';

            if (cartItems.length === 0) {
                listEl.innerHTML = '<li class="text-muted small">Giỏ hàng trống</li>';
                if (checkoutBtn) checkoutBtn.disabled = true;
                return;
            }

            cartItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'list-group-item bg-light d-flex justify-content-between px-0 py-1';
                li.innerHTML = `
                    <div class="small">
                        <span class="fw-bold">${item.quantity}x</span> ${item.name}
                    </div>
                    <span class="small">${formatCurrency(item.price * item.quantity)}</span>
                `;
                listEl.appendChild(li);
            });
        }

        // Totals
        const subEl = document.getElementById('summary-subtotal');
        if (subEl) subEl.textContent = formatCurrency(subtotal);

        const shipEl = document.getElementById('summary-shipping');
        if (shipEl) shipEl.textContent = shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee);

        const totalEl = document.getElementById('summary-total');
        if (totalEl) totalEl.textContent = formatCurrency(totalAmount);
    });
}

async function loadRestaurants() {
    try {
        const data = await callApi('/restaurants', null, 'GET');

        // (MỚI) Lưu lại dữ liệu để dùng khi user chọn
        availableRestaurants = Array.isArray(data) ? data : [];

        restaurantSelect.innerHTML = '<option value="" selected disabled>-- Chọn nhà hàng --</option>';

        if (availableRestaurants.length > 0) {
            availableRestaurants.forEach(r => {
                const option = document.createElement('option');
                // Support cả camelCase (json) và PascalCase (C# default)
                option.value = r.restaurantID || r.RestaurantID;
                option.textContent = r.name || r.Name || r.restaurantName || r.RestaurantName;
                restaurantSelect.appendChild(option);
            });

            // Nếu chỉ có 1 nhà hàng, chọn luôn và hiển thị thông tin
            if (availableRestaurants.length === 1) {
                restaurantSelect.selectedIndex = 1;
                displayRestaurantInfo(restaurantSelect.value);
            }
        }
    } catch (e) {
        console.error("Lỗi tải nhà hàng:", e);
        restaurantSelect.innerHTML = '<option disabled>Lỗi tải dữ liệu</option>';
    }
}

// (MỚI) Hàm hiển thị thông tin nhà hàng
function displayRestaurantInfo(restaurantId) {
    if (!restaurantId || !restInfoArea) return;

    // Tìm nhà hàng trong mảng đã load
    const restaurant = availableRestaurants.find(r =>
        (r.restaurantID || r.RestaurantID) == restaurantId
    );

    if (restaurant) {
        // Support cả 2 kiểu casing
        restAddressEl.textContent = restaurant.address || restaurant.Address || 'Chưa cập nhật';
        restPhoneEl.textContent = restaurant.phoneNumber || restaurant.PhoneNumber || 'Chưa cập nhật';
        restTimeEl.textContent = restaurant.openingHours || restaurant.OpeningHours || 'Chưa cập nhật';

        // Hiện khung thông tin (Bootstrap collapse class 'show')
        restInfoArea.classList.add('show');
    } else {
        restInfoArea.classList.remove('show');
    }
}

async function loadAddresses() {
    try {
        myAddresses = await getMyAddresses() || [];

        addressSelect.innerHTML = '<option value="new">-- Nhập địa chỉ mới --</option>';

        myAddresses.forEach(addr => {
            const option = document.createElement('option');
            option.value = addr.adrsID;
            option.textContent = `${addr.adrsCustomerName} - ${addr.phone}`;
            addressSelect.appendChild(option);
        });

        const defaultAddr = myAddresses.find(a => a.isDefault);
        if (defaultAddr) {
            addressSelect.value = defaultAddr.adrsID;
            fillAddressForm(defaultAddr);
        }

    } catch (e) {
        console.error("Lỗi tải địa chỉ:", e);
    }
}

function fillAddressForm(addr) {
    if (!addr) return;
    inputName.value = addr.adrsCustomerName || '';
    inputPhone.value = addr.phone || '';
    inputAddress.value = addr.adrsLine || '';
}

function clearAddressForm() {
    inputName.value = '';
    inputPhone.value = '';
    inputAddress.value = '';
}

// --- 2. EVENT LISTENERS ---

// (MỚI) Khi chọn nhà hàng -> Hiển thị thông tin
if (restaurantSelect) {
    restaurantSelect.addEventListener('change', function () {
        displayRestaurantInfo(this.value);
    });
}

// Khi thay đổi dropdown địa chỉ
if (addressSelect) {
    addressSelect.addEventListener('change', () => {
        const val = addressSelect.value;
        if (val === 'new') {
            clearAddressForm();
            inputName.readOnly = false;
            inputPhone.readOnly = false;
            inputAddress.readOnly = false;
        } else {
            const selectedAddr = myAddresses.find(a => a.adrsID == val);
            if (selectedAddr) {
                fillAddressForm(selectedAddr);
            }
        }
    });
}

// Xử lý nút ĐẶT HÀNG
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const customerForm = document.getElementById('customer-form');
        if (!customerForm.checkValidity()) {
            customerForm.reportValidity();
            return;
        }

        const restaurantId = restaurantSelect.value;
        if (!restaurantId || restaurantId === "0" || restaurantId === "") {
            alert("Vui lòng chọn Nhà hàng để đặt món.");
            restaurantSelect.focus();
            return;
        }

        let adrsIdToSubmit = addressSelect.value;
        const originalBtnContent = checkoutBtn.innerHTML;
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';

        try {
            if (adrsIdToSubmit === 'new') {
                const newAddressData = {
                    AdrsCustomerName: inputName.value,
                    Phone: inputPhone.value,
                    AdrsLine: inputAddress.value,
                    IsDefault: false,
                    Latitude: 0,
                    Longitude: 0
                };

                const newAddrResponse = await addAddress(newAddressData);

                if (newAddrResponse && newAddrResponse.AdrsID) {
                    adrsIdToSubmit = newAddrResponse.AdrsID;
                } else if (typeof newAddrResponse === 'number') {
                    adrsIdToSubmit = newAddrResponse;
                } else {
                    const freshList = await getMyAddresses();
                    if (freshList.length > 0) adrsIdToSubmit = freshList[freshList.length - 1].adrsID;
                }
            }

            const orderData = {
                adrsId: adrsIdToSubmit,
                restaurantId: restaurantId,
            };

            const result = await placeOrder(orderData);

            if (result.isSuccess && result.paymentUrl) {
                window.location.href = result.paymentUrl;
            } else {
                alert("Đặt hàng thành công nhưng không có URL thanh toán.");
                window.location.href = "/Account/Index";
            }

        } catch (error) {
            console.error(error);
            alert(`Lỗi: ${error.message}`);
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = originalBtnContent;
        }
    });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    renderSummary();
    loadRestaurants();
    loadAddresses();
});