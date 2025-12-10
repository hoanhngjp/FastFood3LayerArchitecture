using BUS.Services;
using DTO.DTO;
using DTO.DTO.FoodItem;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("foods")] // Route gốc đã đúng chuẩn: là danh từ số nhiều
    public class FoodItemController : ControllerBase
    {
        private readonly IFoodItemService _service;

        public FoodItemController(IFoodItemService service)
        {
            _service = service;
        }

        // SỬA: GET /foods
        // CẢI TIẾN: Thêm cả chức năng lọc theo category vào cùng một action
        [HttpGet] // Bỏ "/" đi, [HttpGet] sẽ tự động map với route gốc là "foods"
        public async Task<IActionResult> GetFoods([FromQuery] int? categoryId)
        {
            if (categoryId.HasValue)
            {
                // Nếu có categoryId, gọi hàm lọc
                var itemsByCategory = await _service.GetFoodsByCategoryAsync(categoryId.Value);
                // Vẫn trả về 404 nếu không tìm thấy, cách xử lý cũ của bạn đã tốt
                if (!itemsByCategory.Any())
                    return NotFound(new { message = $"Không tìm thấy món ăn nào trong category ID: {categoryId.Value}" });

                return Ok(itemsByCategory);
            }
            else
            {
                // Nếu không có categoryId, lấy tất cả
                var allItems = await _service.GetAllAsync();
                return Ok(allItems);
            }
        }

        // SỬA: GET /foods/{id}
        [HttpGet("{id}")] // Bỏ "getFoodInfo/", chỉ giữ lại tham số
        public async Task<IActionResult> GetFoodById(int id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null)
                return NotFound(new { message = $"Không tìm thấy món ăn với ID: {id}" });

            return Ok(item);
        }

        // SỬA: POST /foods
        [HttpPost] // Bỏ "createFood"
        public async Task<IActionResult> CreateFood([FromBody] CreateFoodItemDTO dto)
        {
            // CẢI TIẾN: Kiểm tra ModelState để validate DTO tự động (nếu có [Required], [StringLength]...)
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var newFood = await _service.AddAsync(dto);

            // CẢI TIẾN: Trả về 201 Created thay vì 200 OK. Đây là chuẩn REST cho việc tạo mới.
            // CreatedAtAction sẽ tạo một URL trỏ đến resource vừa tạo trong header "Location".
            return CreatedAtAction(nameof(GetFoodById), new { id = newFood.FoodId }, newFood);
        }

        [HttpPut("{id}")] // Bỏ "updateFood/"
        public async Task<IActionResult> UpdateFood(int id, [FromBody] UpdateFoodItemDTO dto)
        {
            // Kiểm tra ID khớp, bạn làm rất tốt!
            if (id != dto.FoodId)
                return BadRequest(new { message = "ID trong URL không khớp với ID trong body" });

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _service.UpdateAsync(id, dto);

            // Nếu service trả về false (không tìm thấy) -> Trả về 404 Not Found.
            if (!result)
            {
                return NotFound(new { message = $"Không tìm thấy món ăn với ID: {id} để cập nhật" });
            }

            // Trả về 204 NoContent khi thành công.
            return NoContent();
        }

        // SỬA: DELETE /foods/{id}
        [HttpDelete("{id}")] // Bỏ "deleteFood/"
        public async Task<IActionResult> DeleteFood(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result)
                return NotFound(new { message = $"Không tìm thấy món ăn với ID: {id} để xóa" });

            // CẢI TIẾN: Giống như PUT, 204 NoContent là lựa chọn tốt nhất cho việc xóa thành công.
            return NoContent();
        }
    }
}