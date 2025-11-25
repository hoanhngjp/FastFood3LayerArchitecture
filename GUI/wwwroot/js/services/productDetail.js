// /js/services/productDetail.js
import { getFoodDetail } from './foodService.js';
import { addToCart, formatCurrency } from './cartService.js'; // Đã đổi tên import thành 'addToCart'

// 2. Định nghĩa các DOM elements
const productTitleEl = document.getElementById('product-title');
const productCategoryEl = document.getElementById('product-category');
const productImageEl = document.getElementById('product-image');
const discountBadgeEl = document.getElementById('discount-badge');
const priceCurrentEl = document.getElementById('price-current');
const priceOldEl = document.getElementById('price-old');
const priceSavedEl = document.getElementById('price-saved');
const productDescriptionEl = document.getElementById('product-description');
const reviewCountEl = document.getElementById('review-count');
const loadingMessageEl = document.getElementById('loading-message');
const contentEl = document.getElementById('product-detail-content');
const errorMessageEl = document.getElementById('error-message');
const ratingWrapperEl = document.getElementById('product-rating');
const qtyInputEl = document.querySelector('.qty-input');
const qtyBtnMinus = document.getElementById('button-addon1');
const qtyBtnPlus = document.getElementById('button-addon2');
const addToCartBtn = document.getElementById('add-to-cart-btn');

// Biến lưu trữ chi tiết món ăn đã tải
let currentFoodDetail = null;


/**
 * Hàm render số lượng sao 
 * @param {number} rating - Điểm đánh giá (ví dụ: 4.5)
 */
const renderRatingStars = (rating) => {
    if (!ratingWrapperEl) return;

    // Xóa các ngôi sao cũ
    ratingWrapperEl.querySelectorAll('i.bi-star-fill, i.bi-star-half, i.bi-star').forEach(el => el.remove());

    const maxStars = 5;
    const rate = Math.max(0, Math.min(maxStars, rating || 5));

    let starsHTML = '';
    const fullStars = Math.floor(rate);
    // Điều chỉnh logic cho nửa sao, ví dụ: 0.25 <= phân số <= 0.75
    const hasHalfStar = rate % 1 >= 0.25 && rate % 1 <= 0.75;

    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="bi bi-star-fill"></i>';
    }
    if (hasHalfStar) {
        starsHTML += '<i class="bi bi-star-half"></i>';
    }
    const totalStarsRendered = fullStars + (hasHalfStar ? 1 : 0);
    for (let i = totalStarsRendered; i < maxStars; i++) {
        starsHTML += '<i class="bi bi-star"></i>';
    }

    ratingWrapperEl.innerHTML = starsHTML;
};


/**
 * Hàm chính để tải và hiển thị chi tiết món ăn
 */
async function loadProductDetail() {
    // foodId được lấy từ <script> block trong ProductDetail.cshtml
    const foodId = window.foodId;

    if (!foodId) {
        if (loadingMessageEl) loadingMessageEl.style.display = 'none';
        if (errorMessageEl) {
            errorMessageEl.textContent = 'Lỗi: Không tìm thấy ID món ăn trong URL.';
            errorMessageEl.style.display = 'block';
        }
        return;
    }

    if (loadingMessageEl) loadingMessageEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
    if (errorMessageEl) errorMessageEl.style.display = 'none';

    try {
        const food = await getFoodDetail(foodId);
        currentFoodDetail = food; // Lưu lại chi tiết món ăn đã tải

        if (loadingMessageEl) loadingMessageEl.style.display = 'none';

        if (!food || food.foodName === undefined) {
            throw new Error("Món ăn với ID này không tồn tại.");
        }

        // --- HIỂN THỊ DỮ LIỆU ---
        if (productTitleEl) productTitleEl.textContent = food.foodName || 'Tên món ăn không rõ';
        if (productCategoryEl) productCategoryEl.textContent = food.categoryName || 'General';

        if (productImageEl) {
            const fallbackSrc = '/images/food-menu-default.png';
            const imageRelativeUrl = food.imgUrl || fallbackSrc;
            const imageSrc = imageRelativeUrl.startsWith('/') ? imageRelativeUrl : `/${imageRelativeUrl}`;
            productImageEl.src = imageSrc;
            productImageEl.alt = food.foodName;
        }

        // Giá và Giảm giá
        const currentPrice = food.price || 0;
        const oldPrice = food.oldPrice || 0;
        const discount = food.discount || 0;

        if (priceCurrentEl) {
            priceCurrentEl.textContent = formatCurrency(currentPrice);
        }

        if (oldPrice > currentPrice && priceOldEl) {
            priceOldEl.textContent = formatCurrency(oldPrice);
            priceOldEl.style.display = 'inline';
        } else if (priceOldEl) {
            priceOldEl.style.display = 'none';
        }

        if (discount > 0 && discountBadgeEl) {
            discountBadgeEl.textContent = `-${discount}%`;
            discountBadgeEl.style.display = 'block';
        } else if (discountBadgeEl) {
            discountBadgeEl.style.display = 'none';
        }

        if (priceSavedEl) {
            const savedAmount = oldPrice > currentPrice ? oldPrice - currentPrice : 0;
            priceSavedEl.textContent = savedAmount > 0
                ? `Tiết kiệm ngay: ${formatCurrency(savedAmount)}`
                : 'Giá tốt nhất!';
        }

        if (productDescriptionEl) productDescriptionEl.textContent = food.description || 'Không có mô tả.';

        // Đánh giá
        renderRatingStars(food.rating || 5);
        if (reviewCountEl) reviewCountEl.textContent = `(${food.reviewCount || 0} Đánh giá)`;

        // Hiển thị nội dung
        if (contentEl) contentEl.style.display = 'flex';

    } catch (error) {
        console.error('Lỗi khi tải chi tiết món ăn:', error);
        if (loadingMessageEl) loadingMessageEl.style.display = 'none';
        if (errorMessageEl) {
            errorMessageEl.textContent = `Không thể tải chi tiết món ăn. Lỗi: ${error.message}.`;
            errorMessageEl.style.display = 'block';
        }
    }
}

/**
 * Thiết lập logic cho các nút tăng/giảm số lượng
 */
function setupQuantityControls() {
    if (!qtyInputEl || !qtyBtnMinus || !qtyBtnPlus) return;

    const minQty = parseInt(qtyInputEl.min) || 1;

    qtyBtnPlus.addEventListener('click', () => {
        let currentValue = parseInt(qtyInputEl.value) || minQty;
        qtyInputEl.value = currentValue + 1;
        qtyInputEl.blur();
    });

    qtyBtnMinus.addEventListener('click', () => {
        let currentValue = parseInt(qtyInputEl.value) || minQty;
        if (currentValue > minQty) {
            qtyInputEl.value = currentValue - 1;
        }
        qtyInputEl.blur();
    });

    qtyInputEl.addEventListener('change', () => {
        let currentValue = parseInt(qtyInputEl.value);
        if (isNaN(currentValue) || currentValue < minQty) {
            qtyInputEl.value = minQty;
        }
    });
}

/**
 * Thiết lập chức năng Thêm vào Giỏ hàng
 * Đã sửa để gọi hàm addToCart (theo cartService.js)
 */
function setupAddToCartHandler() {
    if (!addToCartBtn) return;

    addToCartBtn.addEventListener('click', () => {
        if (!currentFoodDetail) {
            console.error('Chi tiết món ăn chưa được tải.');
            alert('Vui lòng chờ tải dữ liệu món ăn.');
            return;
        }

        // Lấy số lượng và đảm bảo là số nguyên dương hợp lệ
        const quantity = Math.max(1, parseInt(qtyInputEl.value) || 1);
        qtyInputEl.value = quantity; // Cập nhật lại input nếu cần

        try {
            // Chuẩn bị đối tượng món ăn theo định dạng của giỏ hàng
            const itemToAdd = {
                id: currentFoodDetail.foodId, // Sử dụng foodId từ API
                name: currentFoodDetail.foodName,
                price: currentFoodDetail.price,
                quantity: quantity,
                imageUrl: currentFoodDetail.imgUrl,
                category: currentFoodDetail.categoryName,
            };

            // Gọi hàm từ Cart Service để thêm món ăn vào Local Storage
            addToCart(itemToAdd); // Đã đổi tên hàm

            console.log(`Đã thêm thành công ${quantity} x ${currentFoodDetail.foodName} (ID: ${itemToAdd.id}) vào giỏ hàng.`);

            // Cập nhật giao diện: Tùy chọn: Reset số lượng về 1 sau khi thêm thành công
            qtyInputEl.value = 1;
            // Tùy chọn: Hiển thị thông báo Toast/Snackbar cho người dùng.

        } catch (error) {
            console.error('Lỗi khi thêm vào giỏ hàng:', error);
            alert('Không thể thêm món ăn vào giỏ. Vui lòng thử lại.');
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    loadProductDetail();
    setupQuantityControls();
    setupAddToCartHandler();
});