using BUS.Services.DeliveryService;
using DTO.DTO.Delivery;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [Route("api/admin/deliveries")]
    [ApiController]
    public class AdminDeliveryController : ControllerBase
    {
        private readonly IDeliveryService _service;

        public AdminDeliveryController(IDeliveryService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _service.GetAllForAdminAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var res = await _service.GetByIdAsync(id);
            return res != null ? Ok(res) : NotFound();
        }

        [HttpPut("status")]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateDeliveryStatusDTO dto)
        {
            var success = await _service.UpdateStatusAsAdminAsync(dto.DeliveryID, dto.StatusID);
            return success ? Ok(new { message = "Cập nhật thành công" }) : NotFound();
        }
    }
}
