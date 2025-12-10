using Microsoft.AspNetCore.Mvc;

namespace GUI.Controllers
{
    public class OrderController : Controller
    {
        // Trang theo dõi chi tiết
        [HttpGet]
        public IActionResult Tracking(int id)
        {
            ViewBag.OrderId = id;
            return View("~/Views/Order/Tracking.cshtml");
        }
    }
}
