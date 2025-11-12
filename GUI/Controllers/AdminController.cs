using Microsoft.AspNetCore.Mvc;

namespace GUI.Controllers
{
    public class AdminController : Controller
    {

        public IActionResult Dashboard()
        {
            return View("Dashboard");

        }

        public IActionResult Orders()
        {
            return View("Orders"); 
        }

        public IActionResult Menu()
        {
            return View("Menu");
        }

        public IActionResult Customers()
        {
            return View("Customers"); 
        }

        public IActionResult Reports()
        {
            return View("Reports"); 
        }

        public IActionResult Index()
        {
            return RedirectToAction("Dashboard");
        }

        public IActionResult RestaurantInfo()
        {
            return View();
        }
    }
}
