using BUS.Services.DashboardService;
using BUS.Services.RestaurantService;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI.Controllers
{
    [Route("admin")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class SystemAdminController : ControllerBase
    {
        private readonly ISystemDashboardService _dashboardService;
        private readonly IRestaurantService _restaurantService;

        public SystemAdminController(ISystemDashboardService dashboardService, IRestaurantService restaurantService)
        {
            _dashboardService = dashboardService;
            _restaurantService = restaurantService;
        }

        // API 1: Lấy dữ liệu Dashboard (có lọc)
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardStats(
            [FromQuery] int? restaurantId = null, // MỚI
            [FromQuery] string filter = "today",
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            // Nếu restaurantId = 0 hoặc null => Lấy All
            var data = await _dashboardService.GetSystemOverviewAsync(restaurantId, filter, from, to);
            return Ok(data);
        }

        // API 2: Lấy danh sách tên nhà hàng cho Dropdown
        [HttpGet("restaurants-list")]
        public async Task<IActionResult> GetAllRestaurantsSimple()
        {
            // Gọi Service lấy tất cả nhà hàng
            // Lưu ý: Hàm này nên trả về DTO nhẹ (Id, Name) thôi
            var list = await _restaurantService.GetAllAsync();
            return Ok(list);
        }
    }
}
