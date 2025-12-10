using GUI.Attributes;
using Microsoft.AspNetCore.Mvc;

namespace GUI.Controllers
{
    [ManagerAuth]
    public class ManagerController : Controller
    {
        public IActionResult Index()
        {
            return RedirectToAction("Dashboard");
        }

        [HttpGet]
        public IActionResult Dashboard()
        {
            return View();
        }

        [HttpGet]
        public IActionResult Orders()
        {
            return View();
        }

        [HttpGet]
        public IActionResult Menu()
        {
            return View();
        }

        [HttpGet]
        public IActionResult RestaurantInfo()
        {
            return View();
        }
    }
}
