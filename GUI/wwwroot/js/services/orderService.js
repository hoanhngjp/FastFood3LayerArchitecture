import { callApi } from './apiClient.js';
import { clearCart } from './cartService.js';

const CHECKOUT_ENDPOINT = '/orders/checkout';

const ME_ENDPOINT = '/me/orders';
/**
 * Gửi yêu cầu đặt hàng (Checkout)
 * Chỉ còn AdrsID và RestaurantID
 */
export const placeOrder = async (orderData) => {
    // Validate dữ liệu
    if (!orderData.adrsId || orderData.adrsId <= 0) {
        throw new Error("Vui lòng chọn hoặc tạo địa chỉ giao hàng hợp lệ.");
    }
    if (!orderData.restaurantId || orderData.restaurantId <= 0) {
        throw new Error("Vui lòng chọn nhà hàng để đặt món.");
    }

    // Chuẩn bị payload: Chỉ gửi những gì Backend cần cho CheckoutRequestDTO
    const payload = {
        AdrsID: parseInt(orderData.adrsId),
        RestaurantID: parseInt(orderData.restaurantId)
    };

    try {
        const response = await callApi(CHECKOUT_ENDPOINT, payload, 'POST');

        // Xóa giỏ hàng local để update UI badge
        await clearCart();

        return {
            isSuccess: true,
            orderId: response.orderId,
            paymentUrl: response.paymentUrl,
            message: response.message || "Đặt hàng thành công!"
        };

    } catch (error) {
        console.error("Lỗi đặt hàng:", error);
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
            throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }
        throw error;
    }
};

export const getMyOrders = async () => {
    return await callApi(ME_ENDPOINT, null, 'GET');
};

/**
 * Helper: Lấy RestaurantID từ món ăn trong giỏ (nếu có)
 */
export const getRestaurantIdFromCart = (cartItems) => {
    if (!cartItems || cartItems.length === 0) return 0;
    return cartItems[0].restaurantId || 0;
};