using BUS.Services.DroneStationService;
using DTO.DTO.Drone;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [Route("api/admin/stations")]
    [ApiController]
    public class AdminDroneStationController : ControllerBase
    {
        private readonly IDroneStationService _service;
        public AdminDroneStationController(IDroneStationService service) { _service = service; }

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var s = await _service.GetByIdAsync(id);
            return s != null ? Ok(s) : NotFound();
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateStationDTO dto)
        {
            await _service.AddAsync(dto);
            return Ok(new { message = "Thêm trạm thành công" });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateStationDTO dto)
        {
            if (id != dto.StationID) return BadRequest();
            var res = await _service.UpdateAsync(id, dto);
            return res ? NoContent() : NotFound();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var res = await _service.DeleteAsync(id);
            return res ? NoContent() : NotFound();
        }
    }
}
