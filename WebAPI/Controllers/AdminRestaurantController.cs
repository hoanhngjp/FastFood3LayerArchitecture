using BUS.Services.RestaurantService;
using DTO.DTO.Restaurant;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    // Route riêng biệt để không lẫn với User/Manager
    [Route("api/admin/restaurants")]
    [ApiController]
    // [Authorize(Roles = "Admin")] // Bật dòng này khi đã có Auth
    public class AdminRestaurantController : ControllerBase
    {
        private readonly IRestaurantService _service;

        public AdminRestaurantController(IRestaurantService service)
        {
            _service = service;
        }

        [HttpGet("managers")]
        public async Task<IActionResult> GetManagers()
        {
            var managers = await _service.GetManagersAsync();
            return Ok(managers);
        }

        // 1. GET Paged (Cho bảng Admin)
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllForAdminAsync();
            return Ok(result);
        }

        // 2. GET By ID (Chi tiết để Admin xem/sửa)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetDetail(int id)
        {
            var res = await _service.GetByIdAsync(id);
            if (res == null) return NotFound("Không tìm thấy nhà hàng");
            return Ok(res);
        }

        // 3. CREATE (Admin tạo nhà hàng)
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateRestaurantDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var newRes = await _service.AddAsAdminAsync(dto);

            return CreatedAtAction(nameof(GetDetail), new { id = newRes.RestaurantID }, newRes);
        }

        // 4. UPDATE (Admin sửa thông tin nhà hàng)
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] RestaurantUpdateDTO dto)
        {
            if (id != dto.RestaurantId) return BadRequest("ID không khớp");
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var success = await _service.UpdateAsAdminAsync(id, dto);
            if (!success) return NotFound("Không tìm thấy nhà hàng để sửa");

            return NoContent();
        }

        // 5. DELETE (Admin xóa nhà hàng)
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsAdminAsync(id);
            if (!success) return NotFound("Không tìm thấy nhà hàng để xóa");

            return NoContent();
        }
    }
}
