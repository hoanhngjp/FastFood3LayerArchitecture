using GUI.Attributes;
using Microsoft.AspNetCore.Mvc;

namespace GUI.Controllers
{
    [AdminAuth]
    public class AdminController : Controller
    {
        public IActionResult Index() => RedirectToAction("Dashboard");

        public IActionResult Dashboard() => View();

        // 1. Quản lý Người dùng
        public IActionResult Users() => View();

        // 2. Quản lý Nhà hàng & Thực đơn
        public IActionResult Restaurants() => View();
        public IActionResult Categories() => View();
        public IActionResult Foods() => View();

        // 3. Quản lý Vận chuyển (Drone & Trạm)
        public IActionResult Stations() => View(); // Drone Stations
        public IActionResult Drones() => View();

        // 4. Quản lý Vận hành (Đơn hàng & Giao vận)
        public IActionResult Orders() => View();
        public IActionResult Deliveries() => View();

        // 5. Tài chính
        public IActionResult Payments() => View();
    }
}
