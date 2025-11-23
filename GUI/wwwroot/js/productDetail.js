import { getFoodDetail } from './foodService.js';

const API_BASE_URL = 'http://localhost:5278';

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

// Hàm format tiền tệ (Dùng định dạng VNĐ chuẩn)
const formatCurrency = (amount) => {
    const value = parseFloat(amount || 0);

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(value);
};

/**
 * Hàm render số lượng sao (Giữ nguyên)
 * @param {number} rating - Điểm đánh giá (ví dụ: 4.5)
 */
const renderRatingStars = (rating) => {
    const ratingWrapperEl = document.getElementById('product-rating');
    if (!ratingWrapperEl) return;

    ratingWrapperEl.querySelectorAll('i.bi-star-fill, i.bi-star-half, i.bi-star').forEach(el => el.remove());

    const maxStars = 5;
    const rate = Math.max(0, Math.min(maxStars, rating || 5));

    let starsHTML = '';
    const fullStars = Math.floor(rate);
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

    if (reviewCountEl) {
        reviewCountEl.insertAdjacentHTML('beforebegin', starsHTML);
    } else {
        ratingWrapperEl.innerHTML = starsHTML;
    }
};


/**
 * Hàm chính để tải và hiển thị chi tiết món ăn
 */
async function loadProductDetail() {
    const foodId = window.foodId;

    if (!foodId) {
        if (loadingMessageEl) loadingMessageEl.style.display = 'none';
        if (errorMessageEl) {
            errorMessageEl.textContent = 'Lỗi: Không tìm thấy ID món ăn trong URL. Vui lòng kiểm tra Route.';
            errorMessageEl.style.display = 'block';
        }
        return;
    }

    if (loadingMessageEl) loadingMessageEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
    if (errorMessageEl) errorMessageEl.style.display = 'none';

    try {
        const food = await getFoodDetail(foodId);

        if (loadingMessageEl) loadingMessageEl.style.display = 'none';

        if (!food || food.foodName === undefined) {
            throw new Error("Món ăn với ID này không tồn tại.");
        }

 
        if (productTitleEl) productTitleEl.textContent = food.foodName || 'Tên món ăn không rõ';
        if (productCategoryEl) productCategoryEl.textContent = food.categoryName || 'General';


        // LOGIC ẢNH ĐÃ ĐỒNG BỘ 
        if (productImageEl) {
            const fallbackSrc = '/images/food-menu-default.png';
            const imageRelativeUrl = food.imgUrl || fallbackSrc;
            const imageSrc = imageRelativeUrl.startsWith('/')
                ? API_BASE_URL + imageRelativeUrl
                : imageRelativeUrl;

            productImageEl.src = imageSrc;
            productImageEl.alt = food.foodName;
        }


        // Giá và Giảm giá
        const currentPrice = food.price || 0;
        const oldPrice = food.oldPrice || 0;
        const discount = food.discount || 0;

        if (priceCurrentEl) {
            priceCurrentEl.textContent = formatCurrency(currentPrice);
            priceCurrentEl.value = currentPrice;
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

// Khởi chạy khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', loadProductDetail);