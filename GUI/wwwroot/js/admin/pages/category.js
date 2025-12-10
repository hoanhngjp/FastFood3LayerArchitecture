import { categoryService } from '../services/adminCategoryService.js'; 
import { uploadService } from '../services/uploadService.js';

let modal;

document.addEventListener('DOMContentLoaded', () => {
    modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    loadData();
});

// Load List
async function loadData() {
    try {
        const data = await categoryService.getAll();
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        data.forEach(item => {
            const row = `
                <tr>
                    <td class="ps-4 fw-bold">#${item.categoryId}</td>
                    <td>
                        <img src="${item.imgUrl || '/images/default.png'}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                    </td>
                    <td>${item.name}</td>
                    <td class="text-muted small">${item.description || ''}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="window.editItem(${item.categoryId})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.deleteItem(${item.categoryId})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) {
        alert('Lỗi tải dữ liệu');
    }
}

// Mở Modal (dùng window để gán global function cho HTML gọi được)
window.openModal = () => {
    document.getElementById('categoryForm').reset();
    document.getElementById('catId').value = '';
    document.getElementById('modalTitle').innerText = 'Thêm danh mục mới';
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('catImgUrl').value = '';
    modal.show();
};

// Edit
window.editItem = async (id) => {
    try {
        const item = await categoryService.getById(id);
        if (!item) return;

        document.getElementById('catId').value = item.categoryId;
        document.getElementById('catName').value = item.name;
        document.getElementById('catDesc').value = item.description;
        document.getElementById('catImgUrl').value = item.imgUrl;

        const preview = document.getElementById('previewImg');
        if (item.imgUrl) {
            preview.src = item.imgUrl;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }

        document.getElementById('modalTitle').innerText = 'Cập nhật danh mục';
        modal.show();
    } catch (e) {
        alert('Không lấy được thông tin');
    }
};

// Save (Create/Update)
window.saveCategory = async () => {
    const id = document.getElementById('catId').value;
    const name = document.getElementById('catName').value;
    const desc = document.getElementById('catDesc').value;
    const fileInput = document.getElementById('catImageFile');
    let currentImgUrl = document.getElementById('catImgUrl').value;

    if (!name) {
        alert("Vui lòng nhập tên danh mục");
        return;
    }

    try {
        // 1. Nếu có chọn file mới -> Upload
        if (fileInput.files.length > 0) {
            currentImgUrl = await uploadService.uploadImage(fileInput.files[0]);
        }

        // 2. Chuẩn bị payload DTO
        const payload = {
            Name: name,
            Description: desc,
            ImageURL: currentImgUrl
        };

        // 3. Gọi API
        if (id) {
            // Update
            payload.CategoryID = parseInt(id); // Thêm ID cho đúng DTO Update
            await categoryService.update(id, payload);
            alert("Cập nhật thành công!");
        } else {
            // Create
            await categoryService.create(payload);
            alert("Thêm mới thành công!");
        }

        modal.hide();
        loadData(); // Reload table

    } catch (err) {
        console.error(err);
        alert("Có lỗi xảy ra khi lưu dữ liệu!");
    }
};

// Delete
window.deleteItem = async (id) => {
    if (confirm("Bạn có chắc chắn muốn xóa danh mục này?")) {
        try {
            await categoryService.delete(id);
            alert("Đã xóa!");
            loadData();
        } catch (err) {
            alert("Xóa thất bại (Có thể danh mục đang chứa món ăn)");
        }
    }
};