using GUI.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Linq;

namespace GUI.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        // Trang Home/Index
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        public IActionResult Login()
        {
            return View("~/Views/Login/Index.cshtml");
        }

        public IActionResult Registry()
        {
            return View("~/Views/Registry/Index.cshtml");
        }

        public IActionResult ProductDetail()
        {
            return View();
        }

        public IActionResult ComboDetail()
        {
            return View();
        }

        public IActionResult Cart()
        {
            return View();
        }

        public IActionResult Logout()
        {
            // Xoá session, cookie, hoặc sign-out user
            HttpContext.SignOutAsync(); // nếu dùng Identity

            // Chuyển về Login
            return RedirectToAction("Login", "Home");
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}

//Đã chỉnh sửa
