using Microsoft.AspNetCore.Mvc;

namespace GUI.Controllers
{
    public class CheckoutController : Controller
    {
        
        public IActionResult Index()
        {
            // View nằm trong Views/Admin/Checkout/Checkout.cshtml
            return View("~/Views/Checkout/Checkout.cshtml");
        }

        [HttpGet]
        public IActionResult Success(bool isSuccess, int orderId, string message)
        {
            // Nhận dữ liệu từ Query String (do WebAPI redirect về)
            ViewBag.IsSuccess = isSuccess;
            ViewBag.OrderId = orderId;
            ViewBag.Message = message; // Ví dụ: "Giao dịch thành công" hoặc "Số dư không đủ"

            return View("~/Views/Checkout/Success.cshtml");
        }
    }
}
