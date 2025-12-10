using BUS.Services;
using DTO.DTO.Order;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [Route("api/admin/orders")]
    [ApiController]
    public class AdminOrderController : ControllerBase
    {
        private readonly IOrderService _service;

        public AdminOrderController(IOrderService service)
        {
            _service = service;
        }

        // 1. Lấy tất cả đơn hàng (Client-side pagination)
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            // GetAllAsync của bạn đã map sang OrderDTO đầy đủ
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        // 2. Xem chi tiết đơn hàng (gồm món ăn)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _service.GetByIdAsync(id);
            if (order == null) return NotFound("Đơn hàng không tồn tại");
            return Ok(order);
        }

        // 3. Admin cập nhật trạng thái đơn (Force Update)
        [HttpPut("status")]
        public async Task<IActionResult> UpdateStatus([FromBody] AdminUpdateOrderStatusDTO dto)
        {
            var success = await _service.UpdateStatusAsAdminAsync(dto.OrderID, dto.StatusID);
            if (!success) return NotFound("Không tìm thấy đơn hàng");
            return Ok(new { message = "Cập nhật trạng thái thành công" });
        }

        // 4. Xóa đơn hàng (Cẩn thận khi dùng)
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
