using BUS.Services;
using BUS.Services.DroneService;
using DAT.Entity;
using DTO.DTO.Drone;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [Route("admin/drones")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class DroneController : ControllerBase
    {
        private readonly IDroneService _droneService;

        public DroneController(IDroneService droneService)
        {
            _droneService = droneService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _droneService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var drone = await _droneService.GetByIdAsync(id);
            if (drone == null) return NotFound();
            return Ok(drone);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDroneDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                await _droneService.CreateAsync(dto);
                return Ok(new { message = "Tạo Drone thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _droneService.DeleteAsync(id);
            if (!result) return NotFound(new { message = "Không tìm thấy Drone" });
            return Ok(new { message = "Đã xóa Drone" });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromQuery] string status)
        {
            var result = await _droneService.UpdateStatusAsync(id, status);
            if (!result) return BadRequest(new { message = "Cập nhật thất bại" });
            return Ok(new { message = $"Đã cập nhật trạng thái thành {status}" });
        }

        [HttpPost("assign-order")]
        public async Task<IActionResult> AssignOrder([FromBody] AssignDroneDTO dto)
        {
            var result = await _droneService.AssignOrderAsync(dto);

            if (result == "Success")
            {
                return Ok(new { message = "Drone đã bắt đầu giao hàng!" });
            }
            else
            {
                return BadRequest(new { message = result });
            }
        }
    }
}
