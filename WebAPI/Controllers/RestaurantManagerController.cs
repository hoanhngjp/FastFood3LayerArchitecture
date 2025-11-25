using BUS.Services;
using BUS.Services.DashboardService;

using BUS.Services.RestaurantService;

// using BUS.Services.DashboardService; (Đã nằm trong BUS.Services namespace chung)
// using BUS.Services.RestaurantService;
using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO; // Dùng chung namespace DTO
using DTO.DTO.Restaurant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("api/manager")] // SỬA: Thêm prefix api/ cho chuẩn
    [Authorize(Roles = "manager")] // SỬA: Role chữ thường đồng bộ với database
    public class RestaurantManagerController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;
        private readonly IOrderService _orderService;
        private readonly IRestaurantService _restaurantService;
        private readonly IUnitOfWork _uow;

        public RestaurantManagerController(
            IDashboardService dashboardService,
            IOrderService orderService,
            IRestaurantService restaurantService,
            IUnitOfWork uow)
        {
            _dashboardService = dashboardService;
            _orderService = orderService;
            _restaurantService = restaurantService;
            _uow = uow;
        }

        // --- HELPER METHODS ---

        private int GetManagerUserIdFromToken()
        {
            // Ưu tiên lấy từ ClaimTypes.NameIdentifier (chuẩn .NET) trước
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");

            if (string.IsNullOrEmpty(userIdString))
                throw new UnauthorizedAccessException("Token không hợp lệ: Không tìm thấy UserID.");

            return int.Parse(userIdString);
        }

        private async Task<(bool success, IActionResult? errorResult)> CheckOwnershipAsync(int managerUserId, int restaurantId)
        {
            // SỬA LOGIC: Dùng ManagerID trực tiếp, nhanh hơn query List Users
            var restaurant = await _uow.Restaurants.GetByIdAsync(restaurantId);

            if (restaurant == null)
            {
                return (false, NotFound(new { message = "Không tìm thấy nhà hàng." }));
            }

            if (restaurant.ManagerID != managerUserId)
            {
                return (false, Forbid()); // 403 Forbidden
            }

            return (true, null);
        }

        private IActionResult HandleResult(bool success, string successMsg, string failMsg)
        {
            if (success) return Ok(new { message = successMsg });
            return BadRequest(new { message = failMsg });
        }

        // --- ENDPOINTS ---

        // 1. Lấy danh sách nhà hàng CỦA TÔI (Để Manager chọn khi login)
        [HttpGet("my-restaurants")]
        public async Task<IActionResult> GetMyRestaurants()
        {
            var managerId = GetManagerUserIdFromToken();

            // Tìm các nhà hàng mà ManagerID khớp với user hiện tại
            var myRestaurants = await _uow.Repository<Restaurant>()
                                          .FindAsync(r => r.ManagerID == managerId);

            // Map sang DTO đơn giản (hoặc dùng AutoMapper)
            var result = myRestaurants.Select(r => new RestaurantDTO{
                RestaurantID = r.RestaurantID,
                Name = r.Name,
                Address = r.Address,
                PhoneNumber = r.PhoneNumber,
                OpeningHours = r.OpeningHours,
                Location_Lat = r.Location_Lat,
                Location_Lng = r.Location_Lng,
                StatusID = r.StatusID,
                StatusName = r.RestaurantStatus?.StatusName
            });

            return Ok(result);
        }

        // 2. Dashboard
        [HttpGet("dashboard/statistics")]
        public async Task<IActionResult> GetDashboardStatistics([FromQuery] int restaurantId)
        {
            var managerId = GetManagerUserIdFromToken();
            var (isOwner, error) = await CheckOwnershipAsync(managerId, restaurantId);
            if (!isOwner) return error;

            var stats = await _dashboardService.GetTodayStatisticsAsync(restaurantId);
            return Ok(stats);
        }

        // 3. Quản lý Đơn hàng
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders([FromQuery] int restaurantId, [FromQuery] string status = "Pending")
        {
            var managerId = GetManagerUserIdFromToken();
            var (isOwner, error) = await CheckOwnershipAsync(managerId, restaurantId);
            if (!isOwner) return error;

            var orders = await _orderService.GetOrdersForRestaurantAsync(restaurantId, status, managerId);
            return Ok(orders);
        }

        [HttpPost("orders/{orderId}/confirm")]
        public async Task<IActionResult> ConfirmOrder(int orderId)
        {
            var managerId = GetManagerUserIdFromToken();
            // Service ConfirmOrderAsync cần tự check restaurantId từ orderId
            var result = await _orderService.ConfirmOrderAsync(orderId, managerId);

            return result switch
            {
                UpdateStatusResult.Success => Ok(new { message = "Đã xác nhận đơn hàng." }),
                UpdateStatusResult.PermissionDenied => Forbid(),
                _ => BadRequest(new { message = "Xử lý thất bại", detail = result.ToString() })
            };
        }

        [HttpPost("orders/{orderId}/cancel")]
        public async Task<IActionResult> CancelOrder(int orderId)
        {
            var managerId = GetManagerUserIdFromToken();
            var result = await _orderService.CancelOrderAsync(orderId, managerId);

            if (result == UpdateStatusResult.Success)
                return Ok(new { message = "Đã hủy đơn hàng." });

            return BadRequest(new { message = "Không thể hủy đơn.", detail = result.ToString() });
        }

        // 4. Cập nhật thông tin Nhà hàng
        [HttpPut("restaurant/{restaurantId}/info")]
        public async Task<IActionResult> UpdateRestaurantInfo(int restaurantId, [FromBody] RestaurantUpdateDTO dto)
        {
            var managerId = GetManagerUserIdFromToken();
            var (isOwner, error) = await CheckOwnershipAsync(managerId, restaurantId);
            if (!isOwner) return error;

            var success = await _restaurantService.UpdateRestaurantInfoAsync(dto, managerId);
            return HandleResult(success==RestaurantResult.Success, "Cập nhật thông tin thành công.", "Cập nhật thất bại.");
        }

        // 5. Đóng/Mở cửa nhà hàng
        [HttpPost("restaurant/{restaurantId}/toggle-status")]
        public async Task<IActionResult> ToggleRestaurantStatus(int restaurantId, [FromQuery] bool isOpen)
        {
            var managerId = GetManagerUserIdFromToken();
            var (isOwner, error) = await CheckOwnershipAsync(managerId, restaurantId);
            if (!isOwner) return error;

            // Bạn cần đảm bảo Service đã có hàm này
            var success = await _restaurantService.ToggleRestaurantStatusAsync(isOpen, restaurantId);
            return HandleResult(success==RestaurantResult.Success, $"Đã chuyển trạng thái thành {(isOpen ? "Mở" : "Đóng")}.", "Thất bại.");
        }
    }
}