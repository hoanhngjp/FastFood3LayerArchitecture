using Microsoft.AspNetCore.Mvc;

namespace GUI.Controllers
{
    public class AccountController : Controller
    {
        // GET: /Account
        // Trang tổng quan tài khoản người dùng
        public IActionResult Index()
        {
            return View(); // Views/Account/Index.cshtml
        }

        // GET: /Account/Profile
        // Chỉnh sửa thông tin cá nhân
        public IActionResult Profile()
        {
            return View(); // Views/Account/Profile.cshtml
        }

        // GET: /Account/OrderHistory
        // Lịch sử các đơn hàng đã đặt
        public IActionResult OrderHistory()
        {
            // Có thể dùng ViewBag/ViewModel để truyền danh sách đơn hàng giả định
            return View(); // Views/Account/OrderHistory.cshtml
        }

        // GET: /Account/OrderDetail/{id}
        // Chi tiết một đơn hàng cụ thể
        public IActionResult OrderDetail(int id)
        {
            // Dùng 'id' để hiển thị chi tiết đơn hàng
            return View(); // Views/Account/OrderDetail.cshtml
        }

        // GET: /Account/ChangePassword
        // Thay đổi mật khẩu
        public IActionResult ChangePassword()
        {
            return View(); // Views/Account/ChangePassword.cshtml
        }
    }
}