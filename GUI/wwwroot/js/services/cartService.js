// File: /js/services/cartService.js

const CART_STORAGE_KEY = 'food_cart';

// ... (Các hàm getCart, saveCart, addItemToCart, updateItemQuantity, removeItem) ...
// (GIỮ NGUYÊN CODE CÁC HÀM TRÊN)

/**
 * Lấy giỏ hàng từ Local Storage.
 * @returns {Array<Object>} Danh sách món ăn trong giỏ hàng. Trả về mảng rỗng nếu không có.
 */
export function getCart() {
    try {
        const cartJson = localStorage.getItem(CART_STORAGE_KEY);
        return cartJson ? JSON.parse(cartJson) : [];
    } catch (e) {
        console.error("Lỗi khi đọc giỏ hàng từ localStorage:", e);
        return [];
    }
}

/**
 * Lưu giỏ hàng vào Local Storage.
 * @param {Array<Object>} cart - Giỏ hàng cần lưu.
 */
export function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // Gửi event để cập nhật biểu tượng giỏ hàng ở header
    document.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: cart } }));
}

// ... (addItemToCart, updateItemQuantity, removeItem) ...

/**
 * Tính tổng phụ (subtotal)
 */
export function calculateSubtotal(cart) {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

/**
 * Format tiền tệ (Dùng định dạng VNĐ chuẩn)
 */
export const formatCurrency = (amount) => {
    const value = parseFloat(amount || 0);
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND', // <-- ĐÃ THIẾT LẬP LÀ VNĐ
        minimumFractionDigits: 0
    }).format(value);
};


// 🚨 HÀM MỚI: TỔNG HỢP DỮ LIỆU CHO CHECKOUT
/**
 * Lấy danh sách sản phẩm và tổng tiền cần thiết để tạo OrderDTO.
 * @returns {{cartItems: Array, totalAmount: number, subtotal: number}}
 */
export function getCartSummaryForCheckout() {
    const cartItems = getCart();
    const subtotal = calculateSubtotal(cartItems);

    // GIẢ ĐỊNH PHÍ GIAO HÀNG (Bạn có thể thêm logic tính phí phức tạp hơn ở đây)
    const SHIPPING_FEE = 0;
    const totalAmount = subtotal + SHIPPING_FEE;

    return {
        cartItems: cartItems,
        totalAmount: totalAmount,
        subtotal: subtotal,
        shippingFee: SHIPPING_FEE
    };
}

/**
 * Xóa toàn bộ giỏ hàng sau khi đặt hàng thành công.
 */
export function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    document.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: [] } }));
}