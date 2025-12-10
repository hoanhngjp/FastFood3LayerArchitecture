using BUS.Services;
using BUS.Services.AddressService;
using DTO.DTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("me")]
    [Authorize]
    public class MeController : ControllerBase
    {
        private readonly IAddressService _addressService;
        private readonly IOrderService _orderService; // [1] Inject thêm OrderService

        public MeController(IAddressService addressService, IOrderService orderService)
        {
            _addressService = addressService;
            _orderService = orderService;
        }

        // Helper: Lấy UserID từ token một cách an toàn
        private int UserIdFromToken => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

        // --- Bắt đầu Endpoints của AddressService ---

        [HttpGet("addresses")]
        public async Task<IActionResult> GetMyAddresses()
        {
            var addresses = await _addressService.GetAllForUserAsync(UserIdFromToken);
            return Ok(addresses);
        }

        [HttpGet("addresses/{id:int}")]
        public async Task<IActionResult> GetMyAddressById(int id)
        {
            var address = await _addressService.GetByIdForUserAsync(id, UserIdFromToken);
            if (address == null)
            {
                return NotFound(new { message = "Không tìm thấy địa chỉ (hoặc địa chỉ không phải của bạn)" });
            }
            return Ok(address);
        }

        [HttpPost("addresses")]
        public async Task<IActionResult> AddMyAddress([FromBody] AddressDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var newAddress = await _addressService.AddForUserAsync(dto, UserIdFromToken);

            // Trả về 201 Created
            return CreatedAtAction(nameof(GetMyAddressById), new { id = newAddress.AdrsID }, newAddress);
        }

        [HttpPut("addresses/{id:int}")]
        public async Task<IActionResult> UpdateMyAddress(int id, [FromBody] AddressDTO dto)
        {
            if (id != dto.AdrsID && dto.AdrsID != 0) // Cho phép dto.AdrsID = 0 (tạo mới)
            {
                return BadRequest(new { message = "ID trong URL không khớp với ID trong body" });
            }
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _addressService.UpdateForUserAsync(id, dto, UserIdFromToken);
            if (!result)
            {
                return NotFound(new { message = "Không tìm thấy địa chỉ (hoặc địa chỉ không phải của bạn)" });
            }

            return NoContent(); // Trả về 204
        }

        [HttpDelete("addresses/{id:int}")]
        public async Task<IActionResult> DeleteMyAddress(int id)
        {
            var result = await _addressService.DeleteForUserAsync(id, UserIdFromToken);
            if (!result)
            {
                return NotFound(new { message = "Không tìm thấy địa chỉ (hoặc địa chỉ không phải của bạn)" });
            }

            return NoContent(); // Trả về 204
        }

        // GET: /me/orders
        [HttpGet("orders")]
        public async Task<IActionResult> GetMyOrderHistory()
        {
            // Lấy danh sách đơn hàng của chính user đang đăng nhập
            var orders = await _orderService.GetMyOrdersAsync(UserIdFromToken);
            return Ok(orders);
        }
    }
}
