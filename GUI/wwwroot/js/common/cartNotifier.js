// /js/common/cartNotifier.js
import { getCart } from '../services/cartService.js';

const cartItemCountEl = document.getElementById('cart-item-count');

/**
 * Tính tổng số món hàng (số lượng) trong giỏ hàng.
 * @param {Array} cart 
 * @returns {number}
 */
function getTotalItemCount(cart) {
    return cart.reduce((count, item) => count + item.quantity, 0);
}

/**
 * Cập nhật số lượng trên biểu tượng giỏ hàng ở Header/Navbar.
 */
function updateCartBadge() {
    if (!cartItemCountEl) return;

    const cart = getCart();
    const totalItems = getTotalItemCount(cart);

    cartItemCountEl.textContent = totalItems > 99 ? '99+' : totalItems;
    // Hiển thị badge nếu có hàng, ẩn nếu giỏ hàng trống
    cartItemCountEl.style.display = totalItems > 0 ? 'inline-block' : 'none';
}

// Lắng nghe sự kiện "cartUpdated" được gửi từ cartService.js
document.addEventListener('cartUpdated', updateCartBadge);

// Khởi tạo lần đầu khi trang tải xong
document.addEventListener('DOMContentLoaded', updateCartBadge);