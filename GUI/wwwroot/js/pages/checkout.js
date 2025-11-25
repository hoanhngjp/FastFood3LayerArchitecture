// File: /js/pages/checkout.js

import { createOrderAndProcessPayment } from '../services/orderService.js';
import { getCartSummaryForCheckout, formatCurrency, getCart } from '../services/cartService.js';

// --- Helper Functions ---

/**
 * Cập nhật Tóm tắt Đơn hàng (Summary Card) trên giao diện.
 */
function updateSummaryCard() {
    const { cartItems, subtotal, totalAmount, shippingFee } = getCartSummaryForCheckout();

    // Cập nhật số món
    document.querySelector('.checkout-summary-card h4 span.badge').textContent = `${cartItems.length} món`;

    // Tạo danh sách sản phẩm
    const ulListGroup = document.querySelector('.checkout-summary-card .list-group-flush:first-of-type');
    ulListGroup.innerHTML = '';

    if (cartItems.length === 0) {
        ulListGroup.innerHTML = '<li class="list-group-item bg-light text-muted px-0">Giỏ hàng trống.</li>';
    } else {
        cartItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item bg-light d-flex justify-content-between align-items-center px-0';
            li.innerHTML = `
                <span>${item.quantity}x ${item.name}</span>
                <span class="fw-bold">${formatCurrency(item.price * item.quantity)}</span>
            `;
            ulListGroup.appendChild(li);
        });
    }

    // Cập nhật Tạm tính và Tổng thanh toán
    const summaryItems = document.querySelectorAll('.checkout-summary-card .list-group-flush.border-top li span:nth-child(2)');
    // [0] Tạm tính
    summaryItems[0].textContent = formatCurrency(subtotal);
    // [1] Phí giao hàng
    summaryItems[1].textContent = shippingFee === 0 ? "Miễn phí" : formatCurrency(shippingFee);
    // [2] Tổng thanh toán
    summaryItems[2].textContent = formatCurrency(totalAmount);

    return cartItems.length > 0;
}

// --- Main Logic ---

document.addEventListener('DOMContentLoaded', function () {
    const checkoutBtn = document.getElementById('complete-checkout-btn');
    const vnpayRadio = document.getElementById('vnpay');
    const codRadio = document.getElementById('tien-mat');
    const vnpayDetails = document.getElementById('vnpay-details');

    // 1. Cập nhật Summary Card và kiểm tra giỏ hàng
    const hasItems = updateSummaryCard();
    if (!hasItems) {
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = 'GIỎ HÀNG TRỐNG';
        }
    }


    // 2. Logic ẩn/hiện chi tiết VNPay
    function toggleVnPayDetails() {
        if (vnpayRadio && vnpayRadio.checked) {
            vnpayDetails.classList.add('show');
        } else {
            vnpayDetails.classList.remove('show');
        }
    }

    if (codRadio) codRadio.addEventListener('change', toggleVnPayDetails);
    if (vnpayRadio) vnpayRadio.addEventListener('change', toggleVnPayDetails);
    toggleVnPayDetails(); // Thiết lập trạng thái ban đầu

    // 3. Xử lý sự kiện nút HOÀN TẤT ĐẶT HÀNG
    if (checkoutBtn && hasItems) {
        checkoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            // Validate form
            const customerForm = document.getElementById('customer-form');
            if (!customerForm.checkValidity()) {
                customerForm.reportValidity(); // Hiển thị lỗi HTML5 Validation
                return;
            }

            // Hiển thị loading
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang xử lý...';

            // Gọi API
            const result = await createOrderAndProcessPayment();

            // Xử lý kết quả
            if (result.isSuccess && result.redirectUrl) {
                // Thành công: Redirect đến VNPay hoặc trang Thank You
                window.location.href = result.redirectUrl;
                return;
            } else {
                // Thất bại: Hiển thị thông báo lỗi
                alert(`Đặt hàng thất bại: ${result.message}`);

                // Nếu lỗi do hết hạn Token, có thể chuyển hướng đến trang Login
                // if (result.message.includes("Bạn chưa đăng nhập")) {
                //     window.location.href = "/login"; 
                // }
            }

            // Kết thúc (nếu không có redirect)
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="bi bi-check2-circle me-2"></i> HOÀN TẤT ĐẶT HÀNG';
            // Cần cập nhật lại giỏ hàng nếu thất bại (dù hàm createOrder đã gọi clearCart(), 
            // nó chỉ chạy khi response.ok).
            updateSummaryCard();
        });
    }

    // Lắng nghe sự kiện giỏ hàng được cập nhật từ các trang khác (ví dụ: giỏ hàng trống)
    document.addEventListener('cartUpdated', updateSummaryCard);
});