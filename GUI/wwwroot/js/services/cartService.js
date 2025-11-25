// /js/services/cartService.js

/**
 * Tên key lưu trữ giỏ hàng trong LocalStorage.
 */
const CART_STORAGE_KEY = 'foodCart';

/**
 * Định dạng số thành chuỗi tiền tệ (VNĐ).
 * @param {number} amount - Số tiền cần định dạng.
 * @returns {string} - Chuỗi tiền tệ đã định dạng (ví dụ: '100.000 VNĐ').
 */
export function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        amount = 0;
    }
    // Sử dụng Intl.NumberFormat để định dạng theo locale Việt Nam
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0, // Không hiển thị số thập phân
    }).format(amount);
}

/**
 * Phát ra sự kiện tùy chỉnh để thông báo giỏ hàng đã được cập nhật.
 * Các thành phần khác (ví dụ: cart.js, cartNotifier.js) sẽ lắng nghe sự kiện này.
 */
function notifyCartUpdate() {
    const event = new CustomEvent('cartUpdated');
    document.dispatchEvent(event);
}

/**
 * Lưu giỏ hàng hiện tại vào LocalStorage.
 * @param {Array<Object>} cart - Mảng các đối tượng giỏ hàng.
 */
function saveCart(cart) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        notifyCartUpdate(); // Thông báo sau khi lưu thành công
    } catch (e) {
        console.error("Lỗi khi lưu giỏ hàng vào LocalStorage: ", e);
    }
}

/**
 * Lấy giỏ hàng từ LocalStorage.
 * @returns {Array<Object>} - Mảng các món hàng trong giỏ, hoặc mảng rỗng nếu không có.
 */
export function getCart() {
    try {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY);
        // Đảm bảo trả về mảng nếu null hoặc không hợp lệ
        return storedCart ? JSON.parse(storedCart) : [];
    } catch (e) {
        console.error("Lỗi khi đọc giỏ hàng từ LocalStorage: ", e);
        return [];
    }
}

/**
 * Cập nhật số lượng của một món hàng cụ thể trong giỏ hàng.
 * @param {number} foodId - ID của món ăn.
 * @param {number} quantity - Số lượng mới.
 */
export function updateItemQuantity(foodId, quantity) {
    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === foodId);

    if (itemIndex > -1) {
        // Đảm bảo số lượng là số dương, tối thiểu là 1
        cart[itemIndex].quantity = Math.max(1, quantity);
        saveCart(cart);
    }
}

/**
 * Xóa một món hàng khỏi giỏ hàng.
 * @param {number} foodId - ID của món ăn.
 */
export function removeItem(foodId) {
    let cart = getCart();
    // Lọc ra món hàng có ID tương ứng
    cart = cart.filter(item => item.id !== foodId);
    saveCart(cart);
}

/**
 * Tính tổng tiền hàng (chưa bao gồm phí giao hàng và giảm giá).
 * @param {Array<Object>} cart - Mảng các món hàng trong giỏ.
 * @returns {number} - Tổng tiền hàng.
 */
export function calculateSubtotal(cart) {
    // Đảm bảo item.price và item.quantity là số hợp lệ
    return cart.reduce((total, item) => total + (
        (typeof item.price === 'number' ? item.price : 0) * (typeof item.quantity === 'number' ? item.quantity : 0)
    ), 0);
}

/**
 * [Hàm bổ sung cần thiết cho trang sản phẩm/menu]
 * Thêm một món ăn mới hoặc cập nhật số lượng của món ăn đã có.
 * @param {Object} item - Đối tượng món ăn { id, name, price, quantity, imageUrl, category }.
 */
export function addToCart(item) {
    if (!item.id || !item.price || !item.quantity) {
        console.error("Thiếu thông tin món ăn (id, price, quantity)!");
        return;
    }

    const cart = getCart();
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);

    if (existingItemIndex > -1) {
        // Cập nhật số lượng
        cart[existingItemIndex].quantity += item.quantity;
    } else {
        // Thêm mới
        cart.push(item);
    }

    saveCart(cart);
}

// /js/services/cartService.js (Bổ sung)

// ... (các hàm đã có: formatCurrency, notifyCartUpdate, saveCart, getCart, updateItemQuantity, removeItem, calculateSubtotal) ...

const DEFAULT_SHIPPING_FEE = 30000;

/**
 * Tính toán Tóm tắt giỏ hàng chi tiết cho trang Checkout.
 * @returns {Object} { cartItems, subtotal, totalAmount, shippingFee }
 */
export function getCartSummaryForCheckout() {
    const cartItems = getCart();
    const subtotal = calculateSubtotal(cartItems);

    // Chỉ tính phí ship nếu có hàng
    const shippingFee = subtotal > 0 ? DEFAULT_SHIPPING_FEE : 0;

    // Giảm giá mặc định 0 ở đây, nếu có logic Coupon thì thêm vào
    const discount = 0;

    const totalAmount = subtotal + shippingFee - discount;

    return {
        cartItems: cartItems,
        subtotal: subtotal,
        totalAmount: totalAmount,
        shippingFee: shippingFee,
        discount: discount // Có thể trả về discount nếu cần
    };
}

/**
 * Xóa toàn bộ giỏ hàng khỏi Local Storage.
 */
export function clearCart() {
    try {
        localStorage.removeItem(CART_STORAGE_KEY);
        notifyCartUpdate(); // Thông báo để cập nhật UI
        console.log("Giỏ hàng đã được xóa thành công.");
    } catch (e) {
        console.error("Lỗi khi xóa giỏ hàng: ", e);
    }
}

// ... (các hàm đã có) ...