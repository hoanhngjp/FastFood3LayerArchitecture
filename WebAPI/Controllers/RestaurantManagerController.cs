using BUS.Services;
using BUS.Services.DashboardService;
using BUS.Services.DroneService;
using BUS.Services.RestaurantService;

// using BUS.Services.DashboardService; (Đã nằm trong BUS.Services namespace chung)
using DAT.Entity;
using DAT.UnitOfWork;
using DTO.DTO;
using DTO.DTO.Drone;
using DTO.DTO.Restaurant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("manager")] // SỬA: Thêm prefix api/ cho chuẩn
    [Authorize(Roles = "manager")] // SỬA: Role chữ thường đồng bộ với database
    public class RestaurantManagerController : ControllerBase
    {
        private readonly IRestaurantDashboardService _dashboardService;
        private readonly IOrderService _orderService;
        private readonly IRestaurantService _restaurantService;
        private readonly IDroneService _droneService;
        private readonly IUnitOfWork _uow;

        public RestaurantManagerController(
            IRestaurantDashboardService dashboardService,
            IOrderService orderService,
            IRestaurantService restaurantService,
            IDroneService droneService,
            IUnitOfWork uow)
        {
            _dashboardService = dashboardService;
            _orderService = orderService;
            _restaurantService = restaurantService;
            _droneService = droneService;
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
        public async Task<IActionResult> GetDashboardStatistics([FromQuery] int restaurantId, [FromQuery] string filter = "today", [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            var managerId = GetManagerUserIdFromToken();
            var (isOwner, error) = await CheckOwnershipAsync(managerId, restaurantId);
            if (!isOwner) return error;

            // Gọi Service với đầy đủ tham số
            var stats = await _dashboardService.GetDashboardStatisticsAsync(restaurantId, filter, from, to);
            return Ok(stats);
        }

        // 3. Quản lý Đơn hàng
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders([FromQuery] int restaurantId, [FromQuery] string status = "All")
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
        // --- BỔ SUNG: QUẢN LÝ DRONE (Dành cho Manager) ---

        // 6. Lấy danh sách Drone đang rảnh
        [HttpGet("drones/available")]
        public async Task<IActionResult> GetAvailableDrones()
        {
            var allDrones = await _droneService.GetAllAsync();
            // Lọc các drone có trạng thái "Idle" (Rảnh)
            var availableDrones = allDrones.Where(d => d.StatusName == "Idle");
            return Ok(availableDrones);
        }

        // 7. Gán Drone giao hàng (Confirmed -> Delivering)
        [HttpPost("orders/assign-drone")]
        public async Task<IActionResult> AssignDroneToOrder([FromBody] AssignDroneDTO dto)
        {
            // Kiểm tra quyền sở hữu đơn hàng (Manager chỉ được gán drone cho đơn của quán mình)
            var managerId = GetManagerUserIdFromToken();

            // Lấy thông tin Order để check RestaurantID -> Check ManagerID
            var order = await _uow.Orders.GetByIdWithDetailsAsync(dto.OrderId);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

            if (order.Restaurant == null || order.Restaurant.ManagerID != managerId)
            {
                return Forbid(); // Không có quyền thao tác đơn của quán khác
            }

            // Gọi Service thực hiện logic nghiệp vụ
            var result = await _droneService.AssignOrderAsync(dto);

            if (result == "Success")
            {
                return Ok(new { message = "Đã gán Drone và bắt đầu giao hàng." });
            }
            else
            {
                return BadRequest(new { message = result });
            }
        }
    }
}