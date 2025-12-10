using BUS.Services.DroneService;
using DTO.DTO.Drone;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [Route("api/admin/drones")]
    [ApiController]
    public class AdminDroneController : ControllerBase
    {
        private readonly IDroneService _service;

        public AdminDroneController(IDroneService service)
        {
            _service = service;
        }

        // 1. Lấy danh sách Drone (kèm Station info)
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        // 2. Lấy chi tiết
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var drone = await _service.GetByIdAsync(id);
            if (drone == null) return NotFound("Drone không tồn tại");
            return Ok(drone);
        }

        // 3. Lấy danh sách Trạm (Dropdown)
        [HttpGet("stations")]
        public async Task<IActionResult> GetStations()
        {
            var stations = await _service.GetAllStationsAsync();
            return Ok(stations);
        }

        // 4. Tạo mới
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDroneDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                await _service.CreateAsync(dto);
                // Vì hàm CreateAsync của bạn trả bool, ta trả về OK message
                return Ok(new { message = "Tạo Drone thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // 5. Cập nhật
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateDroneDTO dto)
        {
            if (id != dto.DroneID) return BadRequest("ID không khớp");
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var success = await _service.UpdateAsAdminAsync(id, dto);
            if (!success) return NotFound("Không tìm thấy Drone để sửa");

            return NoContent();
        }

        // 6. Xóa
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            if (!success) return NotFound("Không tìm thấy Drone để xóa");

            return NoContent();
        }
    }
}
