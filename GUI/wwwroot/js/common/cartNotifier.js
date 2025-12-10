// GUI/wwwroot/js/common/cartNotifier.js
import { getCart } from '../services/cartService.js';

const cartItemCountEl = document.getElementById('cart-item-count');

function getTotalItemCount(cart) {
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((count, item) => count + item.quantity, 0);
}

/**
 * Cập nhật số lượng badge (Async function)
 */
async function updateCartBadge() {
    if (!cartItemCountEl) return;

    try {
        // Phải await vì getCart bây giờ gọi API
        const cart = await getCart();
        const totalItems = getTotalItemCount(cart);

        cartItemCountEl.textContent = totalItems > 99 ? '99+' : totalItems;
        cartItemCountEl.style.display = totalItems > 0 ? 'flex' : 'none'; // Thường badge dùng flex để căn giữa
    } catch (error) {
        console.error("Không thể cập nhật badge giỏ hàng:", error);
    }
}

// Lắng nghe sự kiện
document.addEventListener('cartUpdated', updateCartBadge);
document.addEventListener('DOMContentLoaded', updateCartBadge);