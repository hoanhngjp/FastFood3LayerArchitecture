using Microsoft.AspNetCore.Mvc;

namespace GUI.Controllers
{
    // Đảm bảo chỉ người dùng đã đăng nhập mới truy cập được
    // [Authorize] 
    public class AccountController : Controller
    {
        public IActionResult Index()
        {
            return View(); // Trả về View Account.cshtml
        }
        public IActionResult Tracking(int id)
        {
            ViewBag.OrderId = id;
            return View("~/Views/Order/Tracking.cshtml");
        }
        // ...
    }
}