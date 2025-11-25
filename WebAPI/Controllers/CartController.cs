using BUS.Services.CartService;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [Route("cart")]
    [ApiController]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var cart = await _cartService.GetCartAsync();
            // Trả về cả danh sách và tổng tiền tạm tính của cả giỏ
            var totalAmount = cart.Sum(x => x.TotalPrice);
            return Ok(new { Items = cart, TotalAmount = totalAmount });
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartRequest request)
        {
            try
            {
                await _cartService.AddToCartAsync(request.FoodID, request.Quantity);
                return Ok(new { message = "Đã thêm vào giỏ hàng" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPut("update")]
        public async Task<IActionResult> UpdateQuantity([FromBody] UpdateCartRequest request)
        {
            await _cartService.UpdateQuantityAsync(request.FoodID, request.Quantity);
            return Ok(new { message = "Đã cập nhật số lượng" });
        }

        [HttpDelete("{foodId}")]
        public async Task<IActionResult> RemoveItem(int foodId)
        {
            await _cartService.RemoveFromCartAsync(foodId);
            return Ok(new { message = "Đã xóa món ăn khỏi giỏ" });
        }

        [HttpDelete("clear")]
        public async Task<IActionResult> ClearCart()
        {
            await _cartService.ClearCartAsync();
            return Ok(new { message = "Đã xóa sạch giỏ hàng" });
        }
    }

    // Các class Request đơn giản để hứng dữ liệu Body
    public class AddToCartRequest
    {
        public int FoodID { get; set; }
        public int Quantity { get; set; }
    }

    public class UpdateCartRequest
    {
        public int FoodID { get; set; }
        public int Quantity { get; set; }
    }
}
