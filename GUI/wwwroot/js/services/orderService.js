// File: /js/services/orderService.js

// Import hàm từ Cart Service
import { getCartSummaryForCheckout, clearCart } from './cartService.js';

const BASE_API_URL = "/api"; 

/**
 * Lấy JWT Token từ nơi lưu trữ (ví dụ: localStorage).
 * @returns {string | null}
 */
function getAuthToken() {
    // Thay đổi logic này để phù hợp với cách bạn lưu trữ Token (ví dụ: sau khi đăng nhập)
    return localStorage.getItem('authToken');
}

/**
 * Thu thập dữ liệu khách hàng và giỏ hàng để tạo OrderDTO.
 * @returns {object} - OrderDTO cho API.
 */
function collectOrderDTO() {
    const cartSummary = getCartSummaryForCheckout();
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

    // Ánh xạ 'tien-mat' thành 'COD' và 'vnpay' thành 'VNPAY' cho DTO
    const paymentMethodApi = paymentMethod === 'tien-mat' ? 'COD' : 'VNPAY';

    return {
        // Thông tin khách hàng
        FullName: document.getElementById('ho-ten').value,
        Phone: document.getElementById('dien-thoai').value,
        DeliveryAddress: document.getElementById('dia-chi').value,
        Email: document.getElementById('email').value || null,
        Gender: document.getElementById('gioi-tinh').value,
        Note: document.getElementById('ghi-chu').value || null,

        // Thông tin thanh toán
        TotalAmount: cartSummary.totalAmount,
        PaymentMethod: paymentMethodApi,

        // Chi tiết đơn hàng (Ánh xạ các trường từ Cart Item)
        OrderDetails: cartSummary.cartItems.map(item => ({
            ProductID: item.id, // Sử dụng id của món ăn
            Quantity: item.quantity,
            UnitPrice: item.price
        })),

        // Trường này cần thiết nếu Backend muốn tạo URL VNPay
        IsVnPayCheckout: paymentMethod === 'vnpay',
        // URL mà VNPay sẽ redirect về sau khi thanh toán
        ReturnUrl: `${window.location.origin}/payments/vnpay-return`
    };
}

/**
 * Gửi OrderDTO đến API để tạo đơn hàng và xử lý thanh toán (nếu là VNPay).
 * @returns {Promise<{isSuccess: boolean, redirectUrl: string | null, message: string}>}
 */
export async function createOrderAndProcessPayment() {
    const token = getAuthToken();
    if (!token) {
        return { isSuccess: false, message: "Bạn chưa đăng nhập. Vui lòng đăng nhập để đặt hàng.", redirectUrl: null };
    }

    const orderData = collectOrderDTO();

    if (orderData.OrderDetails.length === 0) {
        return { isSuccess: false, message: "Giỏ hàng trống. Vui lòng thêm sản phẩm vào giỏ hàng.", redirectUrl: null };
    }

    try {
        const response = await fetch(`${BASE_API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (!response.ok) {
            const errorMessage = result.message || response.statusText || "Lỗi không xác định.";
            return { isSuccess: false, message: `Đặt hàng thất bại (${response.status}): ${errorMessage}`, redirectUrl: null };
        }

        // Sau khi đặt hàng thành công, xóa giỏ hàng
        clearCart();

        const orderId = result.orderID || result.id; // Lấy ID của đơn hàng vừa tạo

        // Trường hợp 1: Thanh toán VNPay (Backend tạo Order và trả về PaymentUrl)
        if (orderData.IsVnPayCheckout && result.paymentUrl) {
            return { isSuccess: true, redirectUrl: result.paymentUrl, message: "Đang chuyển hướng đến cổng thanh toán..." };
        }

        // Trường hợp 2: Thanh toán COD (Backend đã tạo Order thành công)
        if (orderId) {
            // Chuyển hướng đến trang cảm ơn
            return { isSuccess: true, redirectUrl: `/thank-you?orderId=${orderId}`, message: "Đặt hàng COD thành công!" };
        }

        // Trường hợp không xác định
        return { isSuccess: false, message: "Phản hồi từ máy chủ không hợp lệ. Đơn hàng có thể đã được tạo.", redirectUrl: null };

    } catch (error) {
        console.error("Lỗi khi gọi API đặt hàng:", error);
        return { isSuccess: false, message: `Lỗi kết nối hoặc mạng: ${error.message}`, redirectUrl: null };
    }
}