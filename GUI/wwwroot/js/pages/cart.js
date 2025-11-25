// /js/pages/cart.js
import { getCart, updateItemQuantity, removeItem, calculateSubtotal, formatCurrency } from '../services/cartService.js';

// Khai báo DOM elements
const cartItemsListEl = document.querySelector('.cart-items-list');
const summarySubtotalEl = document.getElementById('summary-subtotal');
const summaryTotalItemsEl = document.getElementById('summary-total-items');
const summaryGrandTotalEl = document.getElementById('summary-grand-total');
const summaryShippingFeeEl = document.getElementById('summary-shipping-fee');
const summaryDiscountEl = document.getElementById('summary-discount');
const cartTitleSpanEl = document.querySelector('.cart-title span');
const btnCheckoutEl = document.getElementById('btn-checkout');

const DEFAULT_SHIPPING_FEE = 30000;
const DEFAULT_DISCOUNT = 0;

/**
 * Cập nhật Tóm tắt Đơn hàng
 */
function updateCartSummary(cart) {
    const subtotal = calculateSubtotal(cart);
    const shippingFee = DEFAULT_SHIPPING_FEE;
    const discount = DEFAULT_DISCOUNT;

    const grandTotal = subtotal + shippingFee - discount;
    const totalItems = cart.reduce((count, item) => count + item.quantity, 0);

    // Cập nhật DOM Summary (Tất cả đều dùng formatCurrency cho VNĐ)
    summarySubtotalEl.textContent = formatCurrency(subtotal);
    summaryShippingFeeEl.textContent = formatCurrency(shippingFee);
    summaryDiscountEl.textContent = formatCurrency(discount);
    summaryGrandTotalEl.textContent = formatCurrency(grandTotal);

    summaryTotalItemsEl.textContent = totalItems;
    cartTitleSpanEl.textContent = `(${totalItems} món)`;

    if (btnCheckoutEl) {
        const isEmpty = cart.length === 0;
        btnCheckoutEl.disabled = isEmpty;
        btnCheckoutEl.style.opacity = isEmpty ? 0.6 : 1;
        btnCheckoutEl.textContent = isEmpty ? 'Giỏ hàng trống' : 'Tiến hành Thanh toán';
    }
}


/**
 * Tạo HTML cho một món ăn trong giỏ hàng
 */
function createCartItemHTML(item) {
    const itemTotal = item.price * item.quantity;
    const imageSrc = item.imageUrl && item.imageUrl.startsWith('/') ? item.imageUrl : `/${item.imageUrl || 'images/food-menu-default.png'}`;

    return `
        <div class="row align-items-center mb-3 p-3 border-bottom cart-item" data-food-id="${item.id}">
            <div class="col-2 col-md-1">
                <img src="${imageSrc}" alt="${item.name}" class="img-fluid rounded" style="max-height: 70px; object-fit: cover;">
            </div>
            <div class="col-5 col-md-5">
                <h5 class="mb-0 fw-bold">${item.name}</h5>
                <small class="text-muted">${item.category}</small>
                <p class="mb-0 text-danger fw-bold">${formatCurrency(item.price)}</p>
            </div>
            <div class="col-3 col-md-3">
                <div class="quantity-control input-group input-group-sm" style="width: 120px;">
                    <button class="btn btn-outline-warning btn-sm qty-btn-minus" type="button" data-id="${item.id}">-</button>
                    <input type="number" value="${item.quantity}" min="1" class="form-control text-center qty-input" data-id="${item.id}" aria-label="Số lượng">
                    <button class="btn btn-outline-warning btn-sm qty-btn-plus" type="button" data-id="${item.id}">+</button>
                </div>
            </div>
            <div class="col-2 col-md-2 text-end fw-bold text-dark-orange">
                ${formatCurrency(itemTotal)}
            </div>
            <div class="col-1 col-md-1 text-end">
                <button class="btn btn-sm btn-outline-danger remove-item-btn" data-id="${item.id}" title="Xóa món">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Tải và hiển thị toàn bộ giỏ hàng
 */
export function renderCart() {
    const cart = getCart();
    cartItemsListEl.innerHTML = '';

    if (cart.length === 0) {
        cartItemsListEl.innerHTML = `
            <div class="text-center p-5">
                <i class="bi bi-cart-x display-4 text-muted mb-3"></i>
                <p class="fs-4 text-muted">Giỏ hàng của bạn đang trống!</p>
                <a href="/#food-menu" class="btn btn-warning fw-bold mt-3">Tiếp tục chọn món</a>
            </div>
        `;
    } else {
        const itemsHTML = cart.map(createCartItemHTML).join('');
        cartItemsListEl.innerHTML = itemsHTML;
        setupCartEvents();
    }

    updateCartSummary(cart);
}


/**
 * Thiết lập sự kiện cho các nút Tăng, Giảm, Xóa (click) và ô input số lượng (change)
 */
function setupCartEvents() {
    // 1. Xử lý sự kiện CLICK cho Tăng (+), Giảm (-), Xóa (Sử dụng Event Delegation)
    // Đảm bảo chỉ thêm listener CLICK một lần duy nhất vào cartItemsListEl
    if (!cartItemsListEl.dataset.clickListenerAdded) {
        cartItemsListEl.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const foodId = parseInt(target.dataset.id);
            if (isNaN(foodId)) return;

            let currentCart = getCart();
            const itemIndex = currentCart.findIndex(item => item.id === foodId);
            if (itemIndex === -1) return;

            let shouldRender = false;
            let currentQuantity = currentCart[itemIndex].quantity;

            if (target.classList.contains('qty-btn-plus')) {
                // Tăng số lượng
                updateItemQuantity(foodId, currentQuantity + 1);
                shouldRender = true;
            } else if (target.classList.contains('qty-btn-minus')) {
                // Giảm số lượng (tối thiểu là 1)
                if (currentQuantity > 1) {
                    updateItemQuantity(foodId, currentQuantity - 1);
                    shouldRender = true;
                }
            } else if (target.classList.contains('remove-item-btn')) {
                // Xóa món
                if (confirm('Bạn có chắc chắn muốn xóa món ăn này khỏi giỏ hàng?')) {
                    removeItem(foodId);
                    shouldRender = true;
                }
            }

            // Render lại giỏ hàng nếu có thay đổi
            if (shouldRender) {
                renderCart();
            }
        });
        // Đánh dấu đã thêm listener CLICK
        cartItemsListEl.dataset.clickListenerAdded = true;
    }


    // 2. Xử lý sự kiện CHANGE cho Input Số lượng (qty-input)
    // Dùng Event Delegation và đảm bảo chỉ thêm listener CHANGE một lần duy nhất
    if (!cartItemsListEl.dataset.changeListenerAdded) {
        cartItemsListEl.addEventListener('change', (e) => {
            const target = e.target;
            // Kiểm tra xem phần tử bị thay đổi có phải là input số lượng không
            if (target.classList.contains('qty-input')) {
                const foodId = parseInt(target.dataset.id);
                let newQuantity = parseInt(target.value);

                if (isNaN(foodId)) return;

                // Kiểm tra và đảm bảo số lượng >= 1
                if (isNaN(newQuantity) || newQuantity < 1) {
                    newQuantity = 1;
                }

                // Cập nhật giỏ hàng
                updateItemQuantity(foodId, newQuantity);
                // Render lại để đồng bộ giao diện và cập nhật tổng tiền
                renderCart();

                // Cập nhật lại giá trị trên input (đề phòng người dùng nhập 0 hoặc giá trị không hợp lệ)
                // Cần làm điều này sau khi renderCart() đã hoàn tất
                const currentItemInput = cartItemsListEl.querySelector(`.qty-input[data-id="${foodId}"]`);
                if (currentItemInput) {
                    currentItemInput.value = newQuantity;
                }
            }
        });
        // Đánh dấu đã thêm listener CHANGE
        cartItemsListEl.dataset.changeListenerAdded = true;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    // Lắng nghe sự kiện tùy chỉnh 'cartUpdated' để render lại giỏ hàng khi có thay đổi từ nơi khác
    document.addEventListener('cartUpdated', renderCart);
});