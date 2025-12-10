using BUS.Services;
using BUS.Services.CartService;
using DAT.Entity;
using DTO.DTO;
using DTO.DTO.Order;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("orders")]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly ICartService _cartService;


        public OrderController(IOrderService orderService, ICartService cartService)
        {
            _orderService = orderService;
            _cartService = cartService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _orderService.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _orderService.GetByIdAsync(id);
            if (order == null)
                return NotFound(new { message = $"Không tìm thấy order với ID: {id}" });
            return Ok(order);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] OrderDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }

            if (!int.TryParse(userIdString, out int userIdFromToken))
            {
                // Token bị "lỗi"
                return BadRequest(new { message = "Token chứa UserID không hợp lệ." });
            }

            try
            {
                var responseDto = await _orderService.CreateAsync(dto, userIdFromToken);

                // Trả về 201 Created (với URL trỏ đến API)
                return CreatedAtAction(nameof(GetById),
                                    new { id = responseDto.OrderID },
                                    responseDto);
            }
            catch (KeyNotFoundException ex)
            {
                return BadRequest(new { message = "Tạo order thất bại. " + ex.Message });
            }
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequestDTO dto)
        {
            var result = await _orderService.UpdateStatusAsync(id, dto.Status);

            switch (result)
            {
                case UpdateStatusResult.Success:
                    return NoContent();

                case UpdateStatusResult.OrderNotFound:
                    return NotFound(new { message = $"Không tìm thấy order với ID: {id}" });

                case UpdateStatusResult.StatusNotFound:
                    return BadRequest(new { message = $"Trạng thái '{dto.Status}' không hợp lệ." });

                default:
                    return StatusCode(500, "Lỗi máy chủ không xác định");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _orderService.DeleteAsync(id);
            if (!result)
                return NotFound(new { message = $"Không tìm thấy order với ID: {id} để xóa" });

            // SỬA: Trả về 204 NoContent
            return NoContent();
        }

        [HttpPost("checkout")]
        [Authorize]
        public async Task<IActionResult> Checkout([FromBody] CheckoutRequestDTO request)
        {
            // 1. Lấy UserID từ Token
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
            {
                return Unauthorized(new { message = "Vui lòng đăng nhập để đặt hàng." });
            }

            // 2. Lấy dữ liệu từ Giỏ hàng trong Session
            var cartItems = await _cartService.GetCartAsync();
            if (cartItems == null || !cartItems.Any())
            {
                return BadRequest(new { message = "Giỏ hàng đang trống." });
            }

            // 3. Chuyển đổi (Map) từ CartItemDTO -> OrderDTO
            var orderDto = new OrderDTO
            {
                AdrsID = request.AdrsID,
                RestaurantID = request.RestaurantID,
                Items = cartItems.Select(c => new OrderItemDTO
                {
                    FoodID = c.FoodID,
                    Quantity = c.Quantity,
                    Price = c.Price
                }).ToList()
            };

            try
            {
                // 4. Gọi Service tạo đơn hàng
                var response = await _orderService.CreateAsync(orderDto, userId);

                // 6. Trả về kết quả (URL thanh toán VNPay)
                return Ok(new
                {
                    message = "Đặt hàng thành công",
                    orderId = response.OrderID,
                    paymentUrl = response.PaymentUrl
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống: " + ex.Message });
            }
        }
        [HttpGet("{id}/tracking")]
        public async Task<IActionResult> GetOrderTracking(int id)
        {
            // Controller chỉ gọi Service, không biết gì về UoW hay DB
            var trackingInfo = await _orderService.GetOrderTrackingAsync(id);

            if (trackingInfo == null)
            {
                return NotFound(new { message = $"Không tìm thấy đơn hàng #{id}" });
            }

            return Ok(trackingInfo);
        }
    }
}
