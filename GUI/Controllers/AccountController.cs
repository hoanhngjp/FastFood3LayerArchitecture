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

        // Action cho các Form Submit (Ví dụ: [HttpPost] Cập nhật Profile)
        // ...
    }
}