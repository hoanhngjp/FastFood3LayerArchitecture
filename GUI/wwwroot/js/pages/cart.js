// GUI/wwwroot/js/pages/cart.js
import { getCart, updateItemQuantity, removeItem, calculateSubtotal, formatCurrency } from '../services/cartService.js';

// DOM Elements
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
 * Cập nhật phần tổng tiền
 */
function updateCartSummary(cart) {
    const subtotal = calculateSubtotal(cart);
    // Chỉ tính ship nếu có hàng
    const shippingFee = cart.length > 0 ? DEFAULT_SHIPPING_FEE : 0;
    const discount = DEFAULT_DISCOUNT;
    const grandTotal = subtotal + shippingFee - discount;
    const totalItems = cart.reduce((count, item) => count + item.quantity, 0);

    // Cập nhật text hiển thị
    if (summarySubtotalEl) summarySubtotalEl.textContent = formatCurrency(subtotal);
    if (summaryShippingFeeEl) summaryShippingFeeEl.textContent = formatCurrency(shippingFee);
    if (summaryDiscountEl) summaryDiscountEl.textContent = formatCurrency(discount);
    if (summaryGrandTotalEl) summaryGrandTotalEl.textContent = formatCurrency(grandTotal);
    if (summaryTotalItemsEl) summaryTotalItemsEl.textContent = totalItems;

    // Cập nhật tiêu đề số lượng món
    const titleCountEl = document.getElementById('cart-title-count') || cartTitleSpanEl;
    if (titleCountEl) titleCountEl.textContent = `(${totalItems} món)`;

    // --- LOGIC XỬ LÝ NÚT CHECKOUT ---
    if (btnCheckoutEl) {
        const isEmpty = cart.length === 0;

        if (isEmpty) {
            // Trường hợp giỏ hàng trống
            btnCheckoutEl.classList.add('disabled'); // Bootstrap class disable style
            btnCheckoutEl.setAttribute('aria-disabled', 'true'); // Accessibility
            btnCheckoutEl.setAttribute('href', '#'); // Ngăn link hoạt động

            // Style bổ sung để chắc chắn không click được
            btnCheckoutEl.style.pointerEvents = 'none';
            btnCheckoutEl.style.opacity = '0.6';
            btnCheckoutEl.textContent = 'Giỏ hàng trống';
        } else {
            // Trường hợp có hàng
            btnCheckoutEl.classList.remove('disabled');
            btnCheckoutEl.setAttribute('aria-disabled', 'false');
            btnCheckoutEl.setAttribute('href', '/Checkout'); // Gán link checkout đúng

            // Khôi phục style
            btnCheckoutEl.style.pointerEvents = 'auto';
            btnCheckoutEl.style.opacity = '1';
            btnCheckoutEl.innerHTML = '<i class="bi bi-cart-check me-2"></i> Tiến hành Thanh toán';
        }
    }
}
/**
 * Render HTML từng món
 */
function createCartItemHTML(item) {
    const itemTotal = item.price * item.quantity;
    // Kiểm tra ảnh, nếu null dùng ảnh default
    const imageSrc = item.imageUrl ? item.imageUrl : '/images/food-menu-default.png';

    return `
        <div class="row align-items-center mb-3 p-3 border-bottom cart-item">
            <div class="col-3 col-md-2">
                <img src="${imageSrc}" alt="${item.name}" class="img-fluid rounded" style="width: 100%; aspect-ratio: 1/1; object-fit: cover;">
            </div>
            <div class="col-9 col-md-4">
                <h6 class="mb-1 fw-bold">${item.name}</h6>
                <p class="mb-0 text-danger fw-bold">${formatCurrency(item.price)}</p>
            </div>
            <div class="col-6 col-md-3 mt-3 mt-md-0">
                <div class="input-group input-group-sm quantity-control" style="max-width: 120px;">
                    <button class="btn btn-outline-secondary qty-btn-minus" type="button" data-id="${item.id}">-</button>
                    <input type="number" readonly value="${item.quantity}" class="form-control text-center qty-input" style="background-color: #fff;">
                    <button class="btn btn-outline-secondary qty-btn-plus" type="button" data-id="${item.id}">+</button>
                </div>
            </div>
            <div class="col-4 col-md-2 mt-3 mt-md-0 text-end fw-bold">
                ${formatCurrency(itemTotal)}
            </div>
            <div class="col-2 col-md-1 mt-3 mt-md-0 text-end">
                <button class="btn btn-sm btn-outline-danger remove-item-btn" data-id="${item.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Render toàn bộ trang
 */
export async function renderCart() {
    if (!cartItemsListEl) return; // Không phải trang cart thì return

    // Hiển thị loading nhẹ hoặc giữ nguyên UI cũ
    // cartItemsListEl.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-warning"></div></div>';

    const cart = await getCart();

    if (cart.length === 0) {
        cartItemsListEl.innerHTML = `
            <div class="text-center p-5">
                <i class="bi bi-cart-x display-1 text-muted"></i>
                <p class="fs-5 text-muted mt-3">Giỏ hàng của bạn đang trống!</p>
                <a href="/#food-menu" class="btn btn-warning text-white fw-bold mt-3">Tiếp tục mua sắm</a>
            </div>
        `;
    } else {
        cartItemsListEl.innerHTML = cart.map(createCartItemHTML).join('');
    }
    updateCartSummary(cart);
}

/**
 * Setup Events - CHỈ GỌI 1 LẦN trong DOMContentLoaded
 */
function setupCartEvents() {
    if (!cartItemsListEl) return;

    // Xử lý Click (Event Delegation)
    cartItemsListEl.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const foodId = parseInt(target.dataset.id);
        if (!foodId) return;

        // Vô hiệu hóa nút tạm thời để tránh spam click
        target.disabled = true;

        try {
            // Lấy giỏ hàng mới nhất để biết số lượng hiện tại
            const currentCart = await getCart();
            const item = currentCart.find(x => x.id === foodId);

            if (!item && !target.classList.contains('remove-item-btn')) {
                // Món không tồn tại (có thể bị xóa ở tab khác)
                await renderCart();
                return;
            }

            if (target.classList.contains('qty-btn-plus')) {
                await updateItemQuantity(foodId, item.quantity + 1);
            }
            else if (target.classList.contains('qty-btn-minus')) {
                if (item.quantity > 1) {
                    await updateItemQuantity(foodId, item.quantity - 1);
                } else {
                    // Nếu số lượng là 1 mà bấm trừ -> hỏi xóa
                    if (confirm('Bạn muốn xóa món này khỏi giỏ hàng?')) {
                        await removeItem(foodId);
                    }
                }
            }
            else if (target.classList.contains('remove-item-btn')) {
                if (confirm('Xóa món ăn này?')) {
                    await removeItem(foodId);
                }
            }

            // LƯU Ý: Không cần gọi renderCart() ở đây nữa
            // Vì các hàm update/remove ở service đã gọi notifyCartUpdate()
            // Và chúng ta đã lắng nghe sự kiện đó ở dưới.

        } catch (err) {
            console.error(err);
        } finally {
            target.disabled = false;
        }
    });
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    // 1. Render lần đầu
    renderCart();

    // 2. Setup sự kiện click (chỉ 1 lần)
    setupCartEvents();

    // 3. Lắng nghe sự kiện update từ Service (khi thêm/sửa/xóa xong)
    document.addEventListener('cartUpdated', renderCart);
});