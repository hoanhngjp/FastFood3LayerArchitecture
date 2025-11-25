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
 * Thiết lập sự kiện cho các nút Tăng, Giảm, Xóa
 */
function setupCartEvents() {
    cartItemsListEl.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const foodId = parseInt(target.dataset.id);
        if (isNaN(foodId)) return;

        let currentCart = getCart();
        const itemIndex = currentCart.findIndex(item => item.id === foodId);
        if (itemIndex === -1) return;

        let newQuantity = currentCart[itemIndex].quantity;

        if (target.classList.contains('qty-btn-plus')) {
            newQuantity++;
            updateItemQuantity(foodId, newQuantity);
        } else if (target.classList.contains('qty-btn-minus')) {
            if (newQuantity > 1) {
                newQuantity--;
                updateItemQuantity(foodId, newQuantity);
            }
        } else if (target.classList.contains('remove-item-btn')) {
            if (confirm('Bạn có chắc chắn muốn xóa món ăn này khỏi giỏ hàng?')) {
                removeItem(foodId);
            }
        }

        // Render lại để cập nhật tổng tiền
        renderCart();
    });

    cartItemsListEl.querySelectorAll('.qty-input').forEach(input => {
        if (!input.dataset.listenerAdded) {
            input.addEventListener('change', (e) => {
                const foodId = parseInt(e.target.dataset.id);
                let newQuantity = parseInt(e.target.value);

                if (isNaN(newQuantity) || newQuantity < 1) {
                    newQuantity = 1;
                }

                updateItemQuantity(foodId, newQuantity);
                renderCart();
            });
            input.dataset.listenerAdded = true;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    document.addEventListener('cartUpdated', renderCart);
});