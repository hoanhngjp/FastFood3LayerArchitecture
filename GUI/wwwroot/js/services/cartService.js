// GUI/wwwroot/js/services/cartService.js
import { callApi } from './apiClient.js';

const ENDPOINT = '/cart';

// --- CÁC HÀM UTILS ---
export function formatCurrency(amount) {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
    }).format(amount);
}

function notifyCartUpdate() {
    const event = new CustomEvent('cartUpdated');
    document.dispatchEvent(event);
}

// --- CÁC HÀM API ---

export const getCart = async () => {
    try {
        const data = await callApi(ENDPOINT, null, 'GET');
        // Xử lý an toàn nếu API trả về null hoặc thiếu field
        const rawItems = data?.items || data?.Items || [];

        return rawItems.map(item => ({
            id: item.foodID || item.FoodID,
            name: item.foodName || item.FoodName,
            price: item.price || item.Price,
            quantity: item.quantity || item.Quantity,
            imageUrl: item.imageURL || item.ImageURL,
            totalPrice: item.totalPrice || item.TotalPrice
        }));
    } catch (e) {
        console.error("Lỗi lấy giỏ hàng:", e);
        return [];
    }
};

export const addToCart = async (item) => {
    if (!item.id || !item.quantity) {
        console.error("Thiếu thông tin món ăn!");
        return;
    }
    try {
        await callApi(`${ENDPOINT}/add`, {
            FoodID: item.id,
            Quantity: item.quantity
        }, 'POST');
        notifyCartUpdate();
    } catch (e) {
        console.error("Lỗi thêm giỏ hàng:", e);
        alert("Lỗi: " + e.message);
        throw e; // Ném lỗi để UI (như nút Add) biết mà xử lý (ví dụ: ngừng loading)
    }
};

export const updateItemQuantity = async (foodId, quantity) => {
    try {
        await callApi(`${ENDPOINT}/update`, {
            FoodID: foodId,
            Quantity: quantity
        }, 'PUT');
        notifyCartUpdate();
    } catch (e) {
        console.error("Lỗi cập nhật giỏ:", e);
    }
};

export const removeItem = async (foodId) => {
    try {
        await callApi(`${ENDPOINT}/${foodId}`, null, 'DELETE');
        notifyCartUpdate();
    } catch (e) {
        console.error("Lỗi xóa món:", e);
    }
};

export const clearCart = async () => {
    try {
        await callApi(`${ENDPOINT}/clear`, null, 'DELETE');
        notifyCartUpdate();
    } catch (e) {
        console.error("Lỗi xóa giỏ hàng:", e);
    }
};

export const getCartSummaryForCheckout = async () => {
    const cartItems = await getCart();
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const DEFAULT_SHIPPING_FEE = 30000;
    const shippingFee = subtotal > 0 ? DEFAULT_SHIPPING_FEE : 0;
    const discount = 0; // Logic mã giảm giá sẽ thêm sau
    const totalAmount = subtotal + shippingFee - discount;

    return { cartItems, subtotal, totalAmount, shippingFee, discount };
};

// Hàm synchronous cũ, giữ lại để tránh lỗi reference nếu file nào đó lỡ gọi
export const calculateSubtotal = (cart) => {
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
};