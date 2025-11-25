// /js/services/orderService.js
import { getCartSummaryForCheckout, clearCart, getCart } from './cartService.js';

// API Endpoint đã điều chỉnh theo Controller WebAPI
const API_ENDPOINT = '/orders';

/**
 * LƯU Ý: Đã loại bỏ hàm getAuthToken() vì Backend sử dụng HttpOnly Cookies
 * Cơ chế Cookie sẽ tự động gửi token đi khi có credentials: 'include'.
 */
// function getAuthToken() { return localStorage.getItem('accessToken'); } 


/**
 * Thu thập dữ liệu người dùng từ form.
 * @returns {Object} Đối tượng chứa thông tin người dùng và phương thức thanh toán.
 */
function getCustomerFormData() {
    const customerForm = document.getElementById('customer-form');
    if (!customerForm) return {};

    // Thu thập thông tin giao hàng
    const deliveryAddress = customerForm.querySelector('#delivery-address').value;
    const phoneNumber = customerForm.querySelector('#phone-number').value;
    const customerName = customerForm.querySelector('#customer-name').value;
    const note = customerForm.querySelector('#note').value;

    // Thu thập phương thức thanh toán
    const selectedPayment = customerForm.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = selectedPayment ? selectedPayment.value : 'COD';

    // Thu thập thông tin VNPay (nếu có)
    const vnpayBankCodeEl = document.getElementById('vnpay-bank-code');
    const vnpayBankCode = (paymentMethod === 'VNPay' && vnpayBankCodeEl) ? vnpayBankCodeEl.value : null;

    return {
        customerName,
        phoneNumber,
        deliveryAddress,
        note,
        paymentMethod,
        vnpayBankCode
    };
}


/**
 * Tạo đơn hàng và xử lý thanh toán (gọi API).
 * API này yêu cầu Cookie access_token cho [Authorize]
 * @returns {Promise<Object>} { isSuccess: boolean, redirectUrl: string, message: string }
 */
export async function createOrderAndProcessPayment() {
    // ⚠️ Đã bỏ phần kiểm tra token trong Local Storage ở đây.
    // Lỗi 401 sẽ được xử lý sau khi gọi fetch.

    const { cartItems, subtotal, totalAmount, shippingFee, discount } = getCartSummaryForCheckout();
    const customerData = getCustomerFormData();

    if (cartItems.length === 0) {
        return { isSuccess: false, redirectUrl: null, message: "Giỏ hàng trống, không thể đặt hàng." };
    }

    // --- CHUẨN BỊ ORDERDTO ---
    const orderDto = {
        CustomerName: customerData.customerName,
        DeliveryAddress: customerData.deliveryAddress,
        PhoneNumber: customerData.phoneNumber,
        OrderNote: customerData.note,

        SubTotal: subtotal,
        ShippingFee: shippingFee,
        Discount: discount,
        TotalAmount: totalAmount,
        PaymentMethod: customerData.paymentMethod,

        OrderDetails: cartItems.map(item => ({
            FoodID: item.id,
            Quantity: item.quantity,
            Price: item.price
        })),

        VnPayBankCode: customerData.vnpayBankCode,
        ReturnUrl: `${window.location.origin}/Order/PaymentReturn`
    };
    // -------------------------

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            // *** ĐIỂM SỬA QUAN TRỌNG: SỬ DỤNG CREDENTIALS: 'include' ***
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                // ⚠️ Đã bỏ 'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(orderDto)
        });

        // Xử lý mã trạng thái HTTP
        if (response.status === 401) {
            // Nếu API orders trả về 401 (Unauthorized) do thiếu/hết hạn cookie
            return { isSuccess: false, redirectUrl: '/Home/Login', message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
        }

        const result = await response.json();

        if (response.ok || response.status === 201) { // 201 Created là mã thành công từ API

            // Xóa giỏ hàng ngay sau khi đơn hàng được tạo thành công trên Server
            clearCart();

            // API có thể trả về thông tin order hoặc URL VNPay
            const redirectUrl = (result.redirectUrl || result.RedirectUrl)
                || '/Order/Confirmation';

            return {
                isSuccess: true,
                redirectUrl: redirectUrl,
                message: "Đặt hàng thành công."
            };
        } else {
            // Lỗi từ Server (400 Bad Request, 500 Internal Error, v.v.)
            const errorMessage = result.message || `Lỗi đặt hàng không xác định (Mã: ${response.status})`;
            return { isSuccess: false, redirectUrl: null, message: errorMessage };
        }

    } catch (error) {
        console.error('Lỗi kết nối API Đặt hàng:', error);
        return { isSuccess: false, redirectUrl: null, message: `Lỗi kết nối: ${error.message}` };
    }
}